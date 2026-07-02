from datetime import date, timedelta
from dataclasses import dataclass
from sqlalchemy.orm import Session

from models.models import User, StreakLog


@dataclass
class StreakResult:
    current_streak: int
    longest_streak: int
    streak_increased_today: bool  # True = frontend should show the "congrats" popup


def update_user_streak(user: User, db: Session) -> StreakResult:
    """
    Call this whenever we detect the user is "active" (login, or app resume/mount).
    It's safe to call multiple times per day — it only changes the streak (and
    only logs one StreakLog row) the FIRST time it's called on a given
    calendar day for that user.
    """
    today = date.today()
    last = user.last_login_date

    if last == today:
        # Already counted today — no change, no popup
        return StreakResult(
            current_streak=user.current_streak,
            longest_streak=user.longest_streak,
            streak_increased_today=False,
        )

    if last == today - timedelta(days=1):
        # Logged in yesterday -> streak continues
        user.current_streak += 1
    else:
        # First ever login, or they missed a day (or more) -> streak resets
        user.current_streak = 1

    user.longest_streak = max(user.longest_streak, user.current_streak)
    user.last_login_date = today

    # Record today's visit for the calendar view. Guard against a rare
    # race (e.g. two requests landing at once before the first commits).
    already_logged = db.query(StreakLog).filter(
        StreakLog.user_id == user.id, StreakLog.date == today
    ).first()
    if not already_logged:
        db.add(StreakLog(user_id=user.id, date=today))

    db.commit()
    db.refresh(user)

    return StreakResult(
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        streak_increased_today=True,
    )
