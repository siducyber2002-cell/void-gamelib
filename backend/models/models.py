from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from db.database import Base


class GameStatus(str, enum.Enum):
    playing   = "playing"
    completed = "completed"
    wishlist  = "wishlist"
    dropped   = "dropped"


class FriendStatus(str, enum.Enum):
    pending  = "pending"
    accepted = "accepted"
    blocked  = "blocked"


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

    library           = relationship("UserGame",        back_populates="user", cascade="all, delete")
    achievements      = relationship("UserAchievement", back_populates="user", cascade="all, delete")
    sent_requests     = relationship("Friendship",      foreign_keys="Friendship.requester_id", back_populates="requester", cascade="all, delete")
    received_requests = relationship("Friendship",      foreign_keys="Friendship.addressee_id", back_populates="addressee", cascade="all, delete")
    messages          = relationship("Message",         back_populates="author",  cascade="all, delete")
    reviews           = relationship("Review",          back_populates="user",    cascade="all, delete")
    notifications     = relationship("Notification",    back_populates="user",    cascade="all, delete")


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

    sender   = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


# ─── User Activity (XP/Gamification) ────────────────────
class UserActivity(Base):
    __tablename__ = "user_activities"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    action     = Column(String(100), nullable=False)
    detail     = Column(String(300), default="")
    xp_earned  = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="activities")


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
