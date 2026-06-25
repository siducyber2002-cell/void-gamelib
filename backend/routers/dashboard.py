from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.database import get_db
from models.models import UserGame, UserAchievement, Friendship, User, GameStatus, FriendStatus
from schemas.schemas import DashboardStats
from utils.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    games_owned = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.status != GameStatus.wishlist,
    ).count()

    hours_played = db.query(func.sum(UserGame.hours_played)).filter(
        UserGame.user_id == current_user.id,
    ).scalar() or 0.0

    achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.progress == 100,
    ).count()

    friends = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)),
        Friendship.status == FriendStatus.accepted,
    ).count()

    completed = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.status == GameStatus.completed,
    ).count()

    wishlist = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.status == GameStatus.wishlist,
    ).count()

    return DashboardStats(
        games_owned=games_owned,
        hours_played=round(hours_played, 1),
        achievements=achievements,
        friends=friends,
        completed=completed,
        wishlist=wishlist,
    )
