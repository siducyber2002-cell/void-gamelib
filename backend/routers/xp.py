from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from models.models import User, UserActivity
from schemas.schemas import UserOut
from utils.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/xp", tags=["XP"])

# XP values per action
XP_MAP = {
    "added_game":       20,
    "completed_game":   100,
    "made_friend":      30,
    "watched_trailer":  10,
    "read_news":        5,
}

def xp_for_level(level: int) -> int:
    """XP required to reach the next level from current level."""
    return level * 100  # Level 1→2 = 100xp, 2→3 = 200xp, etc.

def apply_xp(user: User, xp: int, db: Session):
    """Add XP to user and level up if threshold reached."""
    user.xp += xp
    while user.xp >= xp_for_level(user.level):
        user.xp -= xp_for_level(user.level)
        user.level += 1
    db.commit()

@router.post("/award")
def award_xp(
    action: str,
    detail: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    xp = XP_MAP.get(action, 0)
    if xp == 0:
        return {"message": "Unknown action", "xp_earned": 0}

    # Log activity
    activity = UserActivity(
        user_id=current_user.id,
        action=action,
        detail=detail,
        xp_earned=xp,
        created_at=datetime.utcnow(),
    )
    db.add(activity)

    # Apply XP + level up
    apply_xp(current_user, xp, db)
    db.refresh(current_user)

    return {
        "xp_earned": xp,
        "total_xp":  current_user.xp,
        "level":     current_user.level,
    }


@router.get("/activity")
def get_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == current_user.id)
        .order_by(desc(UserActivity.created_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id":         a.id,
            "action":     a.action,
            "detail":     a.detail,
            "xp_earned":  a.xp_earned,
            "created_at": a.created_at,
        }
        for a in activities
    ]


@router.get("/stats")
def get_xp_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "level":          current_user.level,
        "xp":             current_user.xp,
        "xp_to_next":     xp_for_level(current_user.level),
        "xp_percent":     round((current_user.xp / xp_for_level(current_user.level)) * 100),
    }
