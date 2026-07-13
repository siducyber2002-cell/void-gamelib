from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from db.database import get_db
from models.models import User, UserActivity, Notification
from schemas.schemas import UserOut
from utils.auth import get_current_user
from datetime import datetime, timedelta

NOTIF_MAX_AGE = timedelta(days=1)

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

def total_xp_earned(user: User) -> int:
    """
    user.xp only holds progress toward the *next* level (it resets to 0 on
    level-up — see apply_xp below), so it's not a fair ranking value on its
    own: a Level 5 user with 10 xp has earned far more than a Level 1 user
    with 90 xp. This sums up everything they've ever banked plus their
    current partial bar, for a true lifetime total to rank the leaderboard by.
    """
    total = user.xp
    for lvl in range(1, user.level):
        total += xp_for_level(lvl)
    return total


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


@router.get("/leaderboard")
def get_leaderboard(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Top N users ranked by lifetime XP (level + banked xp, see
    total_xp_earned). Ordering happens in SQL on (level, xp) — that's
    equivalent to ordering by total_xp_earned since a higher level always
    outranks a lower one regardless of the partial bar, so this scales to
    however many users you have without pulling the whole table into Python.

    Also returns the calling user's own rank/xp, even if they didn't make
    the top `limit`, so the frontend can always show "you are #N" alongside
    the visible list.
    """
    top_users = (
        db.query(User)
        .order_by(desc(User.level), desc(User.xp))
        .limit(limit)
        .all()
    )

    leaderboard = [
        {
            "rank": i + 1,
            "user_id": u.id,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "level": u.level,
            "xp": total_xp_earned(u),
            "time_spent_seconds": u.total_time_seconds,
            "is_current_user": u.id == current_user.id,
        }
        for i, u in enumerate(top_users)
    ]

    current_user_rank = (
        db.query(User)
        .filter(
            or_(
                User.level > current_user.level,
                and_(User.level == current_user.level, User.xp > current_user.xp),
            )
        )
        .count()
        + 1
    )

    return {
        "leaderboard": leaderboard,
        "current_user": {
            "rank": current_user_rank,
            "user_id": current_user.id,
            "username": current_user.username,
            "avatar_url": current_user.avatar_url,
            "level": current_user.level,
            "xp": total_xp_earned(current_user),
            "time_spent_seconds": current_user.total_time_seconds,
        },
    }


@router.get("/community-activity")
def get_community_activity(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Daily community-wide engagement for the last `days` days — total XP
    earned by everyone and how many distinct users were active each day.
    Built from real UserActivity rows (the same log award_xp writes to),
    not a synthetic/mocked series, so it reflects actual site usage.
    """
    since = datetime.utcnow() - timedelta(days=days - 1)
    since_midnight = datetime(since.year, since.month, since.day)

    rows = (
        db.query(UserActivity)
        .filter(UserActivity.created_at >= since_midnight)
        .all()
    )

    buckets = {}
    for i in range(days):
        d = (since_midnight + timedelta(days=i)).date()
        buckets[d] = {"date": d.isoformat(), "label": d.strftime("%a"), "xp": 0, "users": set()}

    for r in rows:
        d = r.created_at.date()
        if d in buckets:
            buckets[d]["xp"] += r.xp_earned
            buckets[d]["users"].add(r.user_id)

    return [
        {"date": b["date"], "label": b["label"], "xp": b["xp"], "active_users": len(b["users"])}
        for b in buckets.values()
    ]


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
        .filter(
            Notification.user_id == current_user.id,
            Notification.created_at >= datetime.utcnow() - NOTIF_MAX_AGE,
        )
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
        .filter(
            Notification.user_id == current_user.id,
            Notification.read == False,
            Notification.created_at >= datetime.utcnow() - NOTIF_MAX_AGE,
        )
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
