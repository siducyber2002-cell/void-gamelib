from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Dict
from db.database import get_db
from models.models import DirectMessage, User
from schemas.schemas import DMMessageOut, DMSend
from utils.auth import get_current_user
from jose import jwt, JWTError
import os, json
from datetime import datetime, timezone

router = APIRouter(prefix="/api/dm", tags=["Direct Messages"])

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")

# ─── Active WebSocket connections ────────────────────────
# room_id → { user_id: websocket }
active_rooms: Dict[str, Dict[int, WebSocket]] = {}


def get_room_id(user1: int, user2: int) -> str:
    return "_".join(map(str, sorted([user1, user2])))


def get_user_from_token(token: str, db: Session) -> User | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except (JWTError, Exception):
        return None


# ─── WebSocket endpoint ───────────────────────────────────
@router.websocket("/ws/dm/{room_id}")
async def dm_websocket(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # Authenticate
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    # Validate room (user must be part of it)
    parts = room_id.split("_")
    if len(parts) != 2 or str(user.id) not in parts:
        await websocket.close(code=4003)
        return

    other_id = int(parts[0]) if int(parts[1]) == user.id else int(parts[1])

    await websocket.accept()

    # Register connection
    if room_id not in active_rooms:
        active_rooms[room_id] = {}
    active_rooms[room_id][user.id] = websocket

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "typing":
                # Broadcast typing to other user only
                if other_id in active_rooms.get(room_id, {}):
                    try:
                        await active_rooms[room_id][other_id].send_text(
                            json.dumps({"type": "typing", "user_id": user.id})
                        )
                    except Exception:
                        pass

            elif msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                # Save to DB
                msg = DirectMessage(
                    sender_id=user.id,
                    receiver_id=other_id,
                    room_id=room_id,
                    content=content,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                # Build payload
                payload = {
                    "type":       "message",
                    "id":         msg.id,
                    "sender_id":  msg.sender_id,
                    "receiver_id": msg.receiver_id,
                    "content":    msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "sender_username": user.username,
                }

                # Send to both users in the room
                for uid, ws in list(active_rooms.get(room_id, {}).items()):
                    try:
                        await ws.send_text(json.dumps(payload))
                    except Exception:
                        active_rooms[room_id].pop(uid, None)

    except WebSocketDisconnect:
        active_rooms.get(room_id, {}).pop(user.id, None)
        if not active_rooms.get(room_id):
            active_rooms.pop(room_id, None)


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(DirectMessage)
        .filter(
            DirectMessage.receiver_id == current_user.id,
            DirectMessage.is_read == False,
        )
        .count()
    )
    return {"count": count}


# ─── REST: Mark messages as read ─────────────────────────
@router.post("/read/{other_user_id}")
def mark_read(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(DirectMessage).filter(
        DirectMessage.sender_id   == other_user_id,
        DirectMessage.receiver_id == current_user.id,
        DirectMessage.is_read     == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}



@router.get("/history/{other_user_id}", response_model=List[DMMessageOut])
def get_history(
    other_user_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(DirectMessage)
        .filter(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == other_user_id),
                and_(DirectMessage.sender_id == other_user_id,   DirectMessage.receiver_id == current_user.id),
            )
        )
        .order_by(DirectMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return messages


# ─── REST: Send message (fallback if WS not available) ───
@router.post("/send", response_model=DMMessageOut, status_code=201)
def send_message(
    payload: DMSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receiver = db.query(User).filter(User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    room_id = get_room_id(current_user.id, payload.receiver_id)
    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        room_id=room_id,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
