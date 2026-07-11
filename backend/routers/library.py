from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from db.database import get_db
from models.models import UserGame, Game, User, GameStatus
from schemas.schemas import LibraryAdd, LibraryUpdate, LibraryEntryOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/library", tags=["Library"])


@router.get("/stats")
def get_library_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return counts for dashboard charts. This used to pull every UserGame row
    for the user into Python and count them one by one — fine for a handful
    of games, but it means the response gets slower and heavier the bigger
    someone's library grows, and this endpoint is hit on basically every
    library/dashboard view. A single grouped aggregate query does the same
    counting in the database instead, so the response size and query cost
    stay flat no matter how many games are in the library.
    """
    row = (
        db.query(
            func.count(UserGame.id).label("total"),
            func.sum(case((UserGame.status == GameStatus.playing, 1), else_=0)).label("playing"),
            func.sum(case((UserGame.status == GameStatus.completed, 1), else_=0)).label("completed"),
            func.sum(case((UserGame.status == GameStatus.wishlist, 1), else_=0)).label("wishlist"),
            func.sum(case((UserGame.is_favorite.is_(True), 1), else_=0)).label("favorites"),
        )
        .filter(UserGame.user_id == current_user.id)
        .one()
    )

    total     = row.total or 0
    playing   = row.playing or 0
    completed = row.completed or 0
    wishlist  = row.wishlist or 0
    favorites = row.favorites or 0

    # Progress score: 0-100 based on completed / non-wishlist games
    owned = total - wishlist
    progress = round((completed / owned) * 100) if owned > 0 else 0

    return {
        "total":     total,
        "playing":   playing,
        "completed": completed,
        "wishlist":  wishlist,
        "favorites": favorites,
        "progress":  progress,
    }


@router.get("/", response_model=List[LibraryEntryOut])
def get_library(
    status: Optional[GameStatus] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(UserGame)
        .options(joinedload(UserGame.game))
        .filter(UserGame.user_id == current_user.id)
    )
    if status:
        q = q.filter(UserGame.status == status)
    if is_favorite is not None:
        q = q.filter(UserGame.is_favorite == is_favorite)
    return q.order_by(UserGame.added_at.desc()).all()


@router.post("/", response_model=LibraryEntryOut, status_code=201)
def add_to_library(
    payload: LibraryAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Game).filter(Game.id == payload.game_id).first():
        raise HTTPException(status_code=404, detail="Game not found")

    existing = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.game_id == payload.game_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Game already in library")

    entry = UserGame(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    entry = db.query(UserGame).options(joinedload(UserGame.game)).filter(UserGame.id == entry.id).first()
    return entry


@router.put("/{entry_id}", response_model=LibraryEntryOut)
def update_library_entry(
    entry_id: int,
    payload: LibraryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(UserGame).filter(
        UserGame.id == entry_id,
        UserGame.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Library entry not found")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(entry, field, val)

    db.commit()
    db.refresh(entry)
    entry = db.query(UserGame).options(joinedload(UserGame.game)).filter(UserGame.id == entry.id).first()
    return entry


@router.delete("/{entry_id}", status_code=204)
def remove_from_library(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(UserGame).filter(
        UserGame.id == entry_id,
        UserGame.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Library entry not found")
    db.delete(entry)
    db.commit()
