from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import DataError, IntegrityError
from typing import Optional, List
from db.database import get_db
from models.models import Game, User
from schemas.schemas import GameCreate, GameOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/games", tags=["Games"])


@router.get("/", response_model=List[GameOut])
def list_games(
    search:   Optional[str] = Query(None),
    genre:    Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    year:     Optional[int] = Query(None),
    min_rating: Optional[float] = Query(None),
    is_free:  Optional[bool] = Query(None),
    is_multiplayer: Optional[bool] = Query(None),
    skip:     int = Query(0, ge=0),
    limit:    int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Game)
    if search:
        q = q.filter(or_(
            Game.title.ilike(f"%{search}%"),
            Game.genre.ilike(f"%{search}%"),
            Game.developer.ilike(f"%{search}%"),
        ))
    if genre:
        q = q.filter(Game.genre == genre)
    if platform:
        q = q.filter(Game.platform == platform)
    if year:
        q = q.filter(Game.release_year == year)
    if min_rating is not None:
        q = q.filter(Game.rating >= min_rating)
    if is_free is not None:
        q = q.filter(Game.is_free == is_free)
    if is_multiplayer is not None:
        q = q.filter(Game.is_multiplayer == is_multiplayer)

    return q.order_by(Game.rating.desc()).offset(skip).limit(limit).all()


@router.get("/trending", response_model=List[GameOut])
def trending_games(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Game).order_by(Game.rating.desc()).limit(limit).all()


@router.get("/{game_id}", response_model=GameOut)
def get_game(
    game_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.post("/", response_model=GameOut, status_code=201)
def create_game(
    payload: GameCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # ✅ Return existing game instead of creating a duplicate
    existing = db.query(Game).filter(
        func.lower(Game.title) == func.lower(payload.title)
    ).first()
    if existing:
        return existing

    game = Game(**payload.model_dump())
    db.add(game)
    try:
        db.commit()
    except (DataError, IntegrityError) as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not save game: {str(e.orig)}")
    db.refresh(game)
    return game


@router.put("/{game_id}", response_model=GameOut)
def update_game(
    game_id: int,
    payload: GameCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(game, field, val)
    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=204)
def delete_game(
    game_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.delete(game)
    db.commit()
