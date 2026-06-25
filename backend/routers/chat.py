from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict
import json
from db.database import get_db
from models.models import DirectMessage, User
from schemas.schemas import DirectMessageCreate, DirectMessageOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# ─── WebSocket connection manager ────────────────────────
class ConnectionManager:
    def __init__(self):
        # user_id → WebSocket
        self.active: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: int, data: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_text(json.dumps(data))

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active

manager = ConnectionManager()


# ─── WebSocket endpoint ───────────────────────────────────
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: Session = Depends(get_db),
):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            # Save message to DB
            msg = DirectMessage(
                sender_id=user_id,
                receiver_id=payload["receiver_id"],
                content=payload["content"],
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            # Load sender info
            sender = db.query(User).filter(User.id == user_id).first()

            out = {
                "id":          msg.id,
                "sender_id":   msg.sender_id,
                "receiver_id": msg.receiver_id,
                "content":     msg.content,
                "is_read":     msg.is_read,
                "created_at":  msg.created_at.isoformat(),
                "sender": {
                    "id":       sender.id,
                    "username": sender.username,
                    "avatar_url": sender.avatar_url,
                    "level":    sender.level,
                }
            }

            # Send to receiver if online
            await manager.send_to(payload["receiver_id"], out)
            # Echo back to sender too
            await manager.send_to(user_id, out)

    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ─── REST: get chat history with a user ──────────────────
@router.get("/history/{friend_id}", response_model=List[DirectMessageOut])
def get_history(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msgs = (
        db.query(DirectMessage)
        .options(joinedload(DirectMessage.sender))
        .filter(
            ((DirectMessage.sender_id == current_user.id) & (DirectMessage.receiver_id == friend_id)) |
            ((DirectMessage.sender_id == friend_id) & (DirectMessage.receiver_id == current_user.id))
        )
        .order_by(DirectMessage.created_at.asc())
        .all()
    )
    # Mark received messages as read
    for m in msgs:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()
    return msgs


# ─── REST: get all conversations (latest message per friend) ──
@router.get("/conversations")
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get all users you've chatted with
    sent = db.query(DirectMessage.receiver_id).filter(DirectMessage.sender_id == current_user.id).distinct()
    received = db.query(DirectMessage.sender_id).filter(DirectMessage.receiver_id == current_user.id).distinct()
    partner_ids = set([r[0] for r in sent] + [r[0] for r in received])

    conversations = []
    for pid in partner_ids:
        last_msg = (
            db.query(DirectMessage)
            .filter(
                ((DirectMessage.sender_id == current_user.id) & (DirectMessage.receiver_id == pid)) |
                ((DirectMessage.sender_id == pid) & (DirectMessage.receiver_id == current_user.id))
            )
            .order_by(DirectMessage.created_at.desc())
            .first()
        )
        partner = db.query(User).filter(User.id == pid).first()
        unread = db.query(DirectMessage).filter(
            DirectMessage.sender_id == pid,
            DirectMessage.receiver_id == current_user.id,
            DirectMessage.is_read == False
        ).count()

        conversations.append({
            "partner_id":       pid,
            "partner_username": partner.username,
            "partner_avatar":   partner.avatar_url,
            "is_online":        manager.is_online(pid),
            "last_message":     last_msg.content if last_msg else "",
            "last_at":          last_msg.created_at.isoformat() if last_msg else None,
            "unread":           unread,
        })

    conversations.sort(key=lambda x: x["last_at"] or "", reverse=True)
    return conversations


# ─── REST: online status ──────────────────────────────────
@router.get("/online/{user_id}")
def online_status(user_id: int):
    return {"user_id": user_id, "is_online": manager.is_online(user_id)}