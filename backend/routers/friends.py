from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from db.database import get_db
from models.models import Friendship, User, FriendStatus, UserActivity, Notification
from schemas.schemas import FriendRequestOut, UserPublic
from utils.auth import get_current_user
# Reuse the same XP/leveling logic used by /api/xp/award, so both sides of a
# friendship get XP through one consistent code path.
# NOTE: this assumes friends.py and xp.py live in the same "routers" package
# (matching how your project registers them in main.py). If this import path
# doesn't match your actual folder layout, tell me the structure and I'll
# adjust it.
from routers.xp import apply_xp, XP_MAP, NOTIFICATION_LABELS

router = APIRouter(prefix="/api/friends", tags=["Friends"])


@router.get("/", response_model=List[FriendRequestOut])
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(
            ((Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)),
            Friendship.status == FriendStatus.accepted,
        )
        .all()
    )


@router.get("/requests", response_model=List[FriendRequestOut])
def get_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == FriendStatus.pending,
        )
        .all()
    )


@router.post("/request/{user_id}", status_code=201)
def send_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user_id)) |
        ((Friendship.requester_id == user_id) & (Friendship.addressee_id == current_user.id))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")

    fs = Friendship(requester_id=current_user.id, addressee_id=user_id)
    db.add(fs)
    db.commit()
    return {"message": "Friend request sent"}


@router.post("/accept/{friendship_id}")
def accept_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fs = db.query(Friendship).filter(
        Friendship.id == friendship_id,
        Friendship.addressee_id == current_user.id,
        Friendship.status == FriendStatus.pending,
    ).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Friend request not found")
    fs.status = FriendStatus.accepted
    db.commit()

    # ── Award XP to the ORIGINAL SENDER too ────────────────────
    # current_user (the addressee, who just accepted) gets their XP from the
    # frontend's normal awardXP('made_friend', ...) call after this succeeds.
    # But the requester isn't logged into this session — there's no way for
    # their browser to credit their own account — so it has to happen here,
    # server-side, using apply_xp() the same way /api/xp/award does.
    requester = db.query(User).filter(User.id == fs.requester_id).first()
    if requester:
        xp = XP_MAP.get("made_friend", 0)
        if xp:
            db.add(UserActivity(
                user_id=requester.id,
                action="made_friend",
                detail=current_user.username,
                xp_earned=xp,
                created_at=datetime.utcnow(),
            ))
            leveled_up, _old_level = apply_xp(requester, xp, db)

            label = NOTIFICATION_LABELS.get("made_friend", "Made a new friend")
            db.add(Notification(
                user_id=requester.id,
                type="xp",
                message=f"+{xp} XP — {label}: {current_user.username}",
                xp_earned=xp,
                action="made_friend",
                detail=current_user.username,
                read=False,
                created_at=datetime.utcnow(),
            ))
            db.add(Notification(
                user_id=requester.id,
                type="friend_accepted",
                message=f"🎉 {current_user.username} accepted your friend request!",
                xp_earned=0,
                action="friend_accepted",
                detail=current_user.username,
                read=False,
                created_at=datetime.utcnow(),
            ))
            if leveled_up:
                db.add(Notification(
                    user_id=requester.id,
                    type="level_up",
                    message=f"🎉 Level up! You reached Level {requester.level}!",
                    xp_earned=0,
                    action="level_up",
                    detail=str(requester.level),
                    read=False,
                    created_at=datetime.utcnow(),
                ))
            db.commit()

    return {"message": "Friend request accepted"}


@router.delete("/decline/{friendship_id}", status_code=204)
def decline_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fs = db.query(Friendship).filter(
        Friendship.id == friendship_id,
        Friendship.addressee_id == current_user.id,
    ).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(fs)
    db.commit()


@router.delete("/remove/{user_id}", status_code=204)
def remove_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fs = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user_id)) |
        ((Friendship.requester_id == user_id) & (Friendship.addressee_id == current_user.id)),
        Friendship.status == FriendStatus.accepted,
    ).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Friendship not found")
    db.delete(fs)
    db.commit()


@router.post("/block/{user_id}")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fs = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user_id)) |
        ((Friendship.requester_id == user_id) & (Friendship.addressee_id == current_user.id)),
    ).first()
    if fs:
        fs.status = FriendStatus.blocked
    else:
        fs = Friendship(requester_id=current_user.id, addressee_id=user_id, status=FriendStatus.blocked)
        db.add(fs)
    db.commit()
    return {"message": "User blocked"}
