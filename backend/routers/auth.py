from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone
from db.database import get_db
from models.models import User, StreakLog
from schemas.schemas import UserRegister, UserOut, UserUpdate, TokenResponse, ChangePassword, UserPublic, StreakOut
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from utils.streak import update_user_streak


class DeleteAccountRequest(BaseModel):
    password: str


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form.username  # OAuth2 form field is always called "username" — holds email OR username here
    user = db.query(User).filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.last_seen = datetime.now(timezone.utc)
    token = create_access_token(data={"sub": str(user.id)})
    streak = update_user_streak(user, db)
    return {"access_token": token, "token_type": "bearer", "streak": streak}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/heartbeat")
def heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pinged every ~20s by the frontend while the app is open (see
    Topbar.jsx). Keeps User.last_seen fresh so User.online reflects real
    presence."""
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/streak", response_model=StreakOut)
def get_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Call this on app mount / resume (not just login) — e.g. when the tab
    regains focus or the app comes back to the foreground. It's safe to call
    repeatedly; the streak only advances once per calendar day per user.
    `streak_increased_today` tells the frontend whether to show the popup.
    """
    return update_user_streak(current_user, db)


@router.get("/streak/history")
def get_streak_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns every date (YYYY-MM-DD) the user has ever logged in, as a flat
    list of strings — this is what the dashboard calendar checks each day
    against to decide whether to light up a cell.
    """
    logs = (
        db.query(StreakLog)
        .filter(StreakLog.user_id == current_user.id)
        .all()
    )
    return [log.date.isoformat() for log in logs]


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.username and payload.username != current_user.username:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, val)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/me")
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted"}


@router.get("/users/search", response_model=List[UserPublic])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{q}%"), User.id != current_user.id)
        .limit(10)
        .all()
    )
    return users

