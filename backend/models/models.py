from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, Date, ForeignKey, Enum, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import enum
from db.database import Base

# A user counts as "online" if we've heard from them (via the heartbeat
# endpoint, pinged every ~20s by the frontend while the app is open) within
# this many seconds. Self-correcting: close the tab / lose connection and
# they naturally fall back to "offline" without needing an explicit
# logout signal.
ONLINE_THRESHOLD_SECONDS = 45


class GameStatus(str, enum.Enum):
    playing   = "playing"
    completed = "completed"
    wishlist  = "wishlist"
    dropped   = "dropped"


class FriendStatus(str, enum.Enum):
    pending  = "pending"
    accepted = "accepted"
    blocked  = "blocked"


class GroupRole(str, enum.Enum):
    owner  = "owner"
    admin  = "admin"
    member = "member"


class GroupRequestStatus(str, enum.Enum):
    pending  = "pending"
    accepted = "accepted"
    rejected = "rejected"


# ─── User ────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, nullable=False, index=True)
    email           = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    bio             = Column(Text, default="")
    avatar_url      = Column(String(500), default="")
    banner_url      = Column(String(500), default="")
    country         = Column(String(100), default="")
    favorite_game   = Column(String(100), default="")
    level           = Column(Integer, default=1)
    xp              = Column(Integer, default=0)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Login streak ──
    last_login_date = Column(Date, nullable=True)       # date (no time) of most recent counted login
    current_streak  = Column(Integer, default=0, nullable=False)
    longest_streak  = Column(Integer, default=0, nullable=False)

    # ── Presence ──
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # ── Onboarding ──
    # Page keys (e.g. "home", "dashboard") whose first-time guided tour this
    # user has already finished or skipped. Checked by PageTour.jsx via
    # /api/auth/me so a tour never replays once seen, on any device.
    onboarding_seen_pages = Column(JSON, default=list)

    @property
    def online(self) -> bool:
        """True if last_seen was updated within ONLINE_THRESHOLD_SECONDS.
        Not a DB column — computed live so it never goes stale in a way
        that needs cleanup. Pydantic's `from_attributes` mode reads this
        like any other attribute, so it flows straight into UserPublic
        responses."""
        if not self.last_seen:
            return False
        last = self.last_seen
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - last).total_seconds() < ONLINE_THRESHOLD_SECONDS

    library           = relationship("UserGame",        back_populates="user", cascade="all, delete")
    achievements      = relationship("UserAchievement", back_populates="user", cascade="all, delete")
    sent_requests     = relationship("Friendship",      foreign_keys="Friendship.requester_id", back_populates="requester", cascade="all, delete")
    received_requests = relationship("Friendship",      foreign_keys="Friendship.addressee_id", back_populates="addressee", cascade="all, delete")
    messages          = relationship("Message",         back_populates="author",  cascade="all, delete")
    reviews           = relationship("Review",          back_populates="user",    cascade="all, delete")
    notifications     = relationship("Notification",    back_populates="user",    cascade="all, delete")
    activities         = relationship("UserActivity",    back_populates="user",    cascade="all, delete")
    sent_messages      = relationship("DirectMessage",   foreign_keys="DirectMessage.sender_id",   back_populates="sender",   cascade="all, delete")
    received_messages  = relationship("DirectMessage",   foreign_keys="DirectMessage.receiver_id", back_populates="receiver", cascade="all, delete")
    streak_logs         = relationship("StreakLog",       back_populates="user",    cascade="all, delete")
    group_memberships   = relationship("GroupMembership", back_populates="user",    cascade="all, delete")


# ─── Streak Log (one row per day the user was active) ────
# This is what actually powers the calendar/history view — last_login_date
# alone can't tell you WHICH past days were visited, only the most recent one.
class StreakLog(Base):
    __tablename__ = "streak_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_streak_log_user_date"),
    )

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date    = Column(Date, nullable=False, index=True)

    user = relationship("User", back_populates="streak_logs")


# ─── Game ────────────────────────────────────────────────
class Game(Base):
    __tablename__ = "games"

    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(200), nullable=False, index=True)
    description    = Column(Text, default="")
    genre          = Column(String(50), default="")
    platform       = Column(String(50), default="")
    release_year   = Column(Integer)
    developer      = Column(String(100), default="")
    publisher      = Column(String(100), default="")
    rating         = Column(Float, default=0.0)
    cover_url      = Column(String(500), default="")
    trailer_url    = Column(String(500), default="")
    is_free        = Column(Boolean, default=False)
    is_multiplayer = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    library_entries = relationship("UserGame", back_populates="game", cascade="all, delete")
    reviews         = relationship("Review",   back_populates="game", cascade="all, delete")


# ─── UserGame (Library) ──────────────────────────────────
class UserGame(Base):
    __tablename__ = "user_games"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id      = Column(Integer, ForeignKey("games.id"), nullable=False)
    status       = Column(Enum(GameStatus), default=GameStatus.wishlist)
    hours_played = Column(Float, default=0.0)
    is_favorite  = Column(Boolean, default=False)
    user_rating  = Column(Float, default=0.0)
    added_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="library")
    game = relationship("Game", back_populates="library_entries")


# ─── Achievement ─────────────────────────────────────────
class Achievement(Base):
    __tablename__ = "achievements"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(100), nullable=False)
    description = Column(Text, default="")
    emoji       = Column(String(10), default="🏆")
    rarity      = Column(String(20), default="Common")
    xp_reward   = Column(Integer, default=100)

    user_achievements = relationship("UserAchievement", back_populates="achievement", cascade="all, delete")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    progress       = Column(Integer, default=0)
    unlocked_at    = Column(DateTime(timezone=True))

    user        = relationship("User",        back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


# ─── Friendship ──────────────────────────────────────────
class Friendship(Base):
    __tablename__ = "friendships"

    id           = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status       = Column(Enum(FriendStatus), default=FriendStatus.pending)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    requester = relationship("User", foreign_keys=[requester_id], back_populates="sent_requests")
    addressee = relationship("User", foreign_keys=[addressee_id], back_populates="received_requests")


# ─── Review ──────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id    = Column(Integer, ForeignKey("games.id"), nullable=False)
    rating     = Column(Float, nullable=False)
    body       = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reviews")
    game = relationship("Game", back_populates="reviews")


# ─── Message (Community Chat) ────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    author_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel    = Column(String(50), default="general")
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("User", back_populates="messages")


# ─── News Article (cache store) ──────────────────────────
class NewsArticle(Base):
    __tablename__ = "news_articles"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String(300), nullable=False)
    summary      = Column(Text, default="")
    body         = Column(Text, default="")
    category     = Column(String(50), default="Industry News", index=True)
    cover_url    = Column(String(500), default="")
    source_url   = Column(String(500), default="", unique=True, index=True)
    source_name  = Column(String(200), default="")
    author       = Column(String(200), default="")
    published_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# ─── News Cache Tracker ──────────────────────────────────
class NewsCache(Base):
    __tablename__ = "news_cache"

    id         = Column(Integer, primary_key=True, index=True)
    cache_key  = Column(String(300), unique=True, nullable=False, index=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Direct Messages ─────────────────────────────────────
class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id          = Column(Integer, primary_key=True, index=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id     = Column(String(50), nullable=False, index=True)
    content     = Column(Text, nullable=False)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    sender   = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


# ─── User Activity (XP/Gamification) ────────────────────
class UserActivity(Base):
    __tablename__ = "user_activities"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    action     = Column(String(100), nullable=False)
    detail     = Column(String(300), default="")
    xp_earned  = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="activities")


# ─── Notifications ───────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type       = Column(String(50), nullable=False)   # "xp" | "level_up" | "friend_request" | "friend_accepted" | "new_message"
    message    = Column(String(500), nullable=False)
    xp_earned  = Column(Integer, default=0)
    action     = Column(String(100), default="")
    detail     = Column(String(300), default="")
    read       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ─── Groups (separate from friends/DMs — own chat space) ────
class Group(Base):
    __tablename__ = "groups"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False, index=True)
    description     = Column(Text, default="")
    banner_url      = Column(String(500), default="")
    tier            = Column(String(30), default="Casual")       # "Elite Tier" | "Casual" | "Hardcore" | "Tech" ...
    activity_status = Column(String(50), default="Active now")   # "Active now" | "Weekly Raids" | "Ranked Tier"
    highlight_tag   = Column(String(50), default="")             # e.g. "3 spots left"
    directives      = Column(Text, default="")                   # newline-separated rules, split in the router
    owner_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    owner       = relationship("User", foreign_keys=[owner_id])
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete")
    messages    = relationship("GroupMessage",    back_populates="group", cascade="all, delete")
    media       = relationship("GroupMedia",      back_populates="group", cascade="all, delete")
    join_requests = relationship("GroupJoinRequest", back_populates="group", cascade="all, delete")


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)

    id        = Column(Integer, primary_key=True, index=True)
    group_id  = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role      = Column(Enum(GroupRole), default=GroupRole.member)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="memberships")
    user  = relationship("User", back_populates="group_memberships")


class GroupMessage(Base):
    __tablename__ = "group_messages"

    id         = Column(Integer, primary_key=True, index=True)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    author_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    content    = Column(Text, nullable=False, default="")  # can be empty if the message is attachment-only
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── optional attachment (image / voice note / any other file) ──
    attachment_url   = Column(String(500), default="")
    attachment_type  = Column(String(20),  default="")   # "image" | "voice" | "file" | ""
    attachment_name  = Column(String(300), default="")
    attachment_size  = Column(Integer,     default=0)     # bytes

    group  = relationship("Group", back_populates="messages")
    author = relationship("User")


class GroupMedia(Base):
    __tablename__ = "group_media"

    id             = Column(Integer, primary_key=True, index=True)
    group_id       = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    image_url      = Column(String(500), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    group       = relationship("Group", back_populates="media")
    uploaded_by = relationship("User")


class GroupJoinRequest(Base):
    """A user asking to join a group they aren't a member of yet. The
    owner reviews these and accepts/rejects — kept as its own state
    instead of faking it with a membership role flag."""
    __tablename__ = "group_join_requests"

    id         = Column(Integer, primary_key=True, index=True)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status     = Column(Enum(GroupRequestStatus), default=GroupRequestStatus.pending, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="join_requests")
    user  = relationship("User")
