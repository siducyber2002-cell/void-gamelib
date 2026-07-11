from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
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
    # This used to be 4 separate queries against UserGame alone
    # (games_owned, hours_played, completed, wishlist), each one a full
    # round trip for the same table/user. Collapsed into a single grouped
    # aggregate query — the database does all four counts in one pass
    # instead of four.
    game_row = (
        db.query(
            func.sum(case((UserGame.status != GameStatus.wishlist, 1), else_=0)).label("games_owned"),
            func.sum(case((UserGame.status == GameStatus.completed, 1), else_=0)).label("completed"),
            func.sum(case((UserGame.status == GameStatus.wishlist, 1), else_=0)).label("wishlist"),
            func.coalesce(func.sum(UserGame.hours_played), 0.0).label("hours_played"),
        )
        .filter(UserGame.user_id == current_user.id)
        .one()
    )

    achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.progress == 100,
    ).count()

    friends = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)),
        Friendship.status == FriendStatus.accepted,
    ).count()

    return DashboardStats(
        games_owned=game_row.games_owned or 0,
        hours_played=round(game_row.hours_played or 0.0, 1),
        achievements=achievements,
        friends=friends,
        completed=game_row.completed or 0,
        wishlist=game_row.wishlist or 0,
    )
