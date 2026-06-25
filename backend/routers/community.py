from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from db.database import get_db
from models.models import Message, User
from schemas.schemas import MessageCreate, MessageOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/community", tags=["Community"])

VALID_CHANNELS = {"general", "gaming", "strategy", "rpg", "esports", "memes", "tech"}


@router.get("/messages", response_model=List[MessageOut])
def get_messages(
    channel: str = Query("general"),
    limit:   int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Message)
        .options(joinedload(Message.author))
        .filter(Message.channel == channel)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()[::-1]  # reverse so oldest first
    )


@router.post("/messages", response_model=MessageOut, status_code=201)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = payload.channel if payload.channel in VALID_CHANNELS else "general"
    msg = Message(author_id=current_user.id, channel=channel, content=payload.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    msg = db.query(Message).options(joinedload(Message.author)).filter(Message.id == msg.id).first()
    return msg


@router.delete("/messages/{msg_id}", status_code=204)
def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.author_id == current_user.id,
    ).first()
    if msg:
        db.delete(msg)
        db.commit()
