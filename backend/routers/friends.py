from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from db.database import get_db
from models.models import Friendship, User, FriendStatus
from schemas.schemas import FriendRequestOut, UserPublic
from utils.auth import get_current_user

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
