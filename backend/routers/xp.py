from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from models.models import User, UserActivity, Notification
from schemas.schemas import UserOut
from utils.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/xp", tags=["XP"])


# ── Request bodies ─────────────────────────────────────────────────────────
# These let the frontend send normal JSON (axios.post(url, { action, detail }))
# instead of query-string params.
class AwardXPRequest(BaseModel):
    action: str
    detail: str = ""


class CreateNotificationRequest(BaseModel):
    type: str
    message: str
    action: str = ""
    detail: str = ""
    xp_earned: int = 0

# XP values per action
XP_MAP = {
    "added_game":       20,
    "completed_game":   100,
    "made_friend":      30,
    "watched_trailer":  10,
    "read_news":        5,
}

NOTIFICATION_LABELS = {
    "added_game":      "Added a game to library",
    "completed_game":  "Completed a game",
    "made_friend":     "Made a new friend",
    "watched_trailer": "Watched a trailer",
    "read_news":       "Read a news article",
}

def xp_for_level(level: int) -> int:
    """XP required to reach the next level from current level."""
    return level * 100  # Level 1→2 = 100xp, 2→3 = 200xp, etc.

def apply_xp(user: User, xp: int, db: Session):
    """Add XP to user and level up if threshold reached."""
    old_level = user.level
    user.xp += xp
    leveled_up = False
    while user.xp >= xp_for_level(user.level):
        user.xp -= xp_for_level(user.level)
        user.level += 1
        leveled_up = True
    db.commit()
    return leveled_up, old_level

@router.post("/award")
def award_xp(
    payload: AwardXPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = payload.action
    detail = payload.detail
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
    leveled_up, old_level = apply_xp(current_user, xp, db)
    db.refresh(current_user)

    # Create XP notification
    label = NOTIFICATION_LABELS.get(action, action.replace("_", " ").title())
    notif_message = f"+{xp} XP — {label}"
    if detail:
        notif_message += f": {detail}"

    notification = Notification(
        user_id=current_user.id,
        type="xp",
        message=notif_message,
        xp_earned=xp,
        action=action,
        detail=detail,
        read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)

    # Level-up notification
    if leveled_up:
        level_notif = Notification(
            user_id=current_user.id,
            type="level_up",
            message=f"🎉 Level up! You reached Level {current_user.level}!",
            xp_earned=0,
            action="level_up",
            detail=str(current_user.level),
            read=False,
            created_at=datetime.utcnow(),
        )
        db.add(level_notif)

    db.commit()

    return {
        "xp_earned":   xp,
        "total_xp":    current_user.xp,
        "level":       current_user.level,
        "leveled_up":  leveled_up,
        "old_level":   old_level,
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
        "level":      current_user.level,
        "xp":         current_user.xp,
        "xp_to_next": xp_for_level(current_user.level),
        "xp_percent": round((current_user.xp / xp_for_level(current_user.level)) * 100),
    }


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id":         n.id,
            "type":       n.type,
            "message":    n.message,
            "xp_earned":  n.xp_earned,
            "action":     n.action,
            "detail":     n.detail,
            "read":       n.read,
            "created_at": n.created_at,
        }
        for n in notifs
    ]


@router.get("/notifications/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .count()
    )
    return {"unread": count}


@router.post("/notifications/mark-read")
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .update({"read": True})
    )
    db.commit()
    return {"marked_read": True}


@router.post("/notifications/create")
def create_notification(
    payload: CreateNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    General-purpose notification creator — used by friends router
    to push friend-request and message notifications.
    """
    notif = Notification(
        user_id=current_user.id,
        type=payload.type,
        message=payload.message,
        xp_earned=payload.xp_earned,
        action=payload.action,
        detail=payload.detail,
        read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    return {"created": True}
