from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from db.database import get_db
from models.models import Review, User
from schemas.schemas import ReviewCreate, ReviewOut
from utils.auth import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/game/{game_id}", response_model=List[ReviewOut])
def get_game_reviews(
    game_id: int,
    limit:   int = Query(20, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.game_id == game_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/", response_model=ReviewOut, status_code=201)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.game_id == payload.game_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed this game")

    review = Review(user_id=current_user.id, **payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    review = db.query(Review).options(joinedload(Review.user)).filter(Review.id == review.id).first()
    return review


@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
