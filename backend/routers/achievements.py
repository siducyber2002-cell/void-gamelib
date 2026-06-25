from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from db.database import get_db
from models.models import Achievement, UserAchievement, User
from schemas.schemas import AchievementOut, UserAchievementOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])


@router.get("/", response_model=List[AchievementOut])
def list_achievements(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Achievement).all()


@router.get("/me", response_model=List[UserAchievementOut])
def my_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(UserAchievement)
        .options(joinedload(UserAchievement.achievement))
        .filter(UserAchievement.user_id == current_user.id)
        .all()
    )


@router.post("/seed", status_code=201)
def seed_achievements(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Seed default achievements into the database."""
    defaults = [
        {"title": "Master Explorer",  "description": "Discover all regions in any open world game", "emoji": "🗺️", "rarity": "Legendary", "xp_reward": 500},
        {"title": "Speed Runner",     "description": "Complete any game in under 2 hours",           "emoji": "⚡", "rarity": "Rare",      "xp_reward": 300},
        {"title": "Library Giant",    "description": "Own more than 20 games",                       "emoji": "📚", "rarity": "Common",    "xp_reward": 100},
        {"title": "Social Butterfly", "description": "Add 10 friends to your list",                  "emoji": "🦋", "rarity": "Common",    "xp_reward": 100},
        {"title": "Night Owl",        "description": "Play for more than 5 hours in one session",    "emoji": "🦉", "rarity": "Rare",      "xp_reward": 250},
        {"title": "Completionist",    "description": "Complete 5 games at 100%",                     "emoji": "✅", "rarity": "Legendary", "xp_reward": 500},
        {"title": "Genre Hopper",     "description": "Play games from 5 different genres",           "emoji": "🎯", "rarity": "Common",    "xp_reward": 150},
        {"title": "RPG King",         "description": "Spend over 200 hours in RPG games",            "emoji": "⚔️", "rarity": "Rare",      "xp_reward": 300},
        {"title": "Legendary Gamer",  "description": "Earn 10 Legendary achievements",               "emoji": "👑", "rarity": "Legendary", "xp_reward": 1000},
        {"title": "Early Adopter",    "description": "Play a game on its release day",               "emoji": "🚀", "rarity": "Rare",      "xp_reward": 200},
    ]
    added = 0
    for d in defaults:
        if not db.query(Achievement).filter(Achievement.title == d["title"]).first():
            db.add(Achievement(**d))
            added += 1
    db.commit()
    return {"message": f"Seeded {added} achievements"}
