from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from models.models import GameStatus, FriendStatus


# ─── Auth ────────────────────────────────────────────────
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def pw_valid(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ─── User ────────────────────────────────────────────────
class UserUpdate(BaseModel):
    username:      Optional[str] = None
    bio:           Optional[str] = None
    country:       Optional[str] = None
    favorite_game: Optional[str] = None
    avatar_url:    Optional[str] = None
    banner_url:    Optional[str] = None


class UserOut(BaseModel):
    id:            int
    username:      str
    email:         str
    bio:           Optional[str] = ""
    avatar_url:    Optional[str] = ""
    banner_url:    Optional[str] = ""
    country:       Optional[str] = ""
    favorite_game: Optional[str] = ""
    level:         int
    xp:            int
    created_at:    datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id:            int
    username:      str
    bio:           Optional[str] = ""
    avatar_url:    Optional[str] = ""
    country:       Optional[str] = ""
    favorite_game: Optional[str] = ""
    level:         int
    online:        bool = False

    model_config = {"from_attributes": True}


# ─── Game ────────────────────────────────────────────────
class GameCreate(BaseModel):
    title:         str
    description:   Optional[str] = ""
    genre:         Optional[str] = ""
    platform:      Optional[str] = ""
    release_year:  Optional[int] = None
    developer:     Optional[str] = ""
    publisher:     Optional[str] = ""
    rating:        Optional[float] = 0.0
    cover_url:     Optional[str] = ""
    trailer_url:   Optional[str] = ""
    is_free:       Optional[bool] = False
    is_multiplayer: Optional[bool] = False


class GameOut(BaseModel):
    id:            int
    title:         str
    description:   Optional[str] = ""
    genre:         Optional[str] = ""
    platform:      Optional[str] = ""
    release_year:  Optional[int] = None
    developer:     Optional[str] = ""
    publisher:     Optional[str] = ""
    rating:        float
    cover_url:     Optional[str] = ""
    trailer_url:   Optional[str] = ""
    is_free:       bool
    is_multiplayer: bool
    created_at:    datetime

    model_config = {"from_attributes": True}


# ─── Library ─────────────────────────────────────────────
class LibraryAdd(BaseModel):
    game_id:      int
    status:       GameStatus = GameStatus.wishlist
    hours_played: Optional[float] = 0.0
    is_favorite:  Optional[bool] = False
    user_rating:  Optional[float] = 0.0


class LibraryUpdate(BaseModel):
    status:       Optional[GameStatus] = None
    hours_played: Optional[float] = None
    is_favorite:  Optional[bool] = None
    user_rating:  Optional[float] = None


class LibraryEntryOut(BaseModel):
    id:           int
    user_id:      int
    game_id:      int
    status:       GameStatus
    hours_played: float
    is_favorite:  bool
    user_rating:  float
    added_at:     datetime
    game:         GameOut

    model_config = {"from_attributes": True}


# ─── Achievement ─────────────────────────────────────────
class AchievementOut(BaseModel):
    id:          int
    title:       str
    description: str
    emoji:       str
    rarity:      str
    xp_reward:   int

    model_config = {"from_attributes": True}


class UserAchievementOut(BaseModel):
    id:             int
    achievement_id: int
    progress:       int
    unlocked_at:    Optional[datetime] = None
    achievement:    AchievementOut

    model_config = {"from_attributes": True}


# ─── Friendship ──────────────────────────────────────────
class FriendRequestOut(BaseModel):
    id:           int
    requester_id: int
    addressee_id: int
    status:       FriendStatus
    created_at:   datetime
    requester:    UserPublic
    addressee:    UserPublic

    model_config = {"from_attributes": True}


# ─── Review ──────────────────────────────────────────────
class ReviewCreate(BaseModel):
    game_id: int
    rating:  float
    body:    Optional[str] = ""


class ReviewOut(BaseModel):
    id:         int
    user_id:    int
    game_id:    int
    rating:     float
    body:       Optional[str] = ""
    created_at: datetime
    user:       UserPublic

    model_config = {"from_attributes": True}


# ─── Message ─────────────────────────────────────────────
class MessageCreate(BaseModel):
    channel: str = "general"
    content: str


class MessageOut(BaseModel):
    id:         int
    author_id:  int
    channel:    str
    content:    str
    created_at: datetime
    author:     UserPublic

    model_config = {"from_attributes": True}


# ─── News ────────────────────────────────────────────────
class NewsCreate(BaseModel):
    title:       str
    summary:     Optional[str] = ""
    body:        Optional[str] = ""
    category:    Optional[str] = "Industry News"
    cover_url:   Optional[str] = ""
    source_url:  Optional[str] = ""


class NewsOut(BaseModel):
    id:           int
    title:        str
    summary:      str
    body:         str
    category:     str
    cover_url:    str
    source_url:   str
    published_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard ───────────────────────────────────────────
class DashboardStats(BaseModel):
    games_owned:   int
    hours_played:  float
    achievements:  int
    friends:       int
    completed:     int
    wishlist:      int


# ─── Direct Messages ─────────────────────────────────────
class DMSend(BaseModel):
    receiver_id: int
    content:     str


class DMMessageOut(BaseModel):
    id:          int
    sender_id:   int
    receiver_id: int
    room_id:     str
    content:     str
    is_read:     bool
    created_at:  datetime

    model_config = {"from_attributes": True}
