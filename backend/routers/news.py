from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from db.database import get_db
from models.models import User, NewsArticle, NewsCache
from utils.auth import get_current_user
from datetime import datetime, timezone
import os
import httpx

NEWS_API_KEY   = os.getenv("NEWS_API_KEY")
NEWS_API_BASE  = "https://newsapi.org/v2/everything"
CACHE_TTL_MINS = 15  # serve from DB if fetched within last 15 minutes

CATEGORY_QUERIES = {
    "Industry News":     "gaming industry OR game studio OR game publisher",
    "Updates":           "video game update OR game patch OR DLC",
    "Patch Notes":       "game patch notes OR balance update OR hotfix",
    "Esports":           "esports tournament OR competitive gaming OR esports results",
    "Upcoming Releases": "upcoming game release OR game announcement OR game launch 2026",
}

router = APIRouter(prefix="/api/news", tags=["News"])


def is_cache_fresh(cache_entry: NewsCache) -> bool:
    """Returns True if the cache entry was fetched within CACHE_TTL_MINS."""
    if not cache_entry:
        return False
    now = datetime.now(timezone.utc)
    fetched = cache_entry.fetched_at.replace(tzinfo=timezone.utc)
    diff_mins = (now - fetched).total_seconds() / 60
    return diff_mins < CACHE_TTL_MINS


def fetch_from_newsapi(category: str, from_date: Optional[str], to_date: Optional[str], page: int, page_size: int):
    """Calls NewsAPI and returns (articles_list, total_results)."""
    if not NEWS_API_KEY:
        raise HTTPException(status_code=500, detail="NEWS_API_KEY not configured on server")

    params = {
        "q":        CATEGORY_QUERIES.get(category, category),
        "language": "en",
        "sortBy":   "publishedAt",
        "pageSize": page_size,
        "page":     page,
        "apiKey":   NEWS_API_KEY,
    }
    if from_date: params["from"] = from_date
    if to_date:   params["to"]   = to_date

    response = httpx.get(NEWS_API_BASE, params=params, timeout=10)
    data = response.json()

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=data.get("message", "NewsAPI request failed"))

    return data.get("articles", []), data.get("totalResults", 0)


def save_articles_to_db(db: Session, articles: list, category: str):
    """Upserts articles into news_articles table by source_url."""
    for a in articles:
        url = a.get("url", "")
        if not url:
            continue
        existing = db.query(NewsArticle).filter(NewsArticle.source_url == url).first()
        if existing:
            continue  # already stored, skip
        db.add(NewsArticle(
            title        = (a.get("title") or "")[:300],
            summary      = a.get("description") or "",
            body         = a.get("content") or "",
            category     = category,
            cover_url    = a.get("urlToImage") or "",
            source_url   = url,
            source_name  = (a.get("source") or {}).get("name") or "",
            author       = a.get("author") or "",
            published_at = datetime.fromisoformat(
                a["publishedAt"].replace("Z", "+00:00")
            ) if a.get("publishedAt") else datetime.now(timezone.utc),
        ))
    db.commit()


def articles_to_response(db_articles: List[NewsArticle]) -> list:
    """Converts DB rows to the same shape NewsAPI returns, so frontend doesn't need changing."""
    return [
        {
            "title":       a.title,
            "description": a.summary,
            "content":     a.body,
            "url":         a.source_url,
            "urlToImage":  a.cover_url,
            "publishedAt": a.published_at.isoformat(),
            "source":      {"name": a.source_name},
            "author":      a.author,
        }
        for a in db_articles
    ]


@router.get("/live")
def get_live_news(
    category:  str           = Query("Industry News"),
    from_date: Optional[str] = Query(None),
    to_date:   Optional[str] = Query(None),
    page:      int           = Query(1, ge=1),
    page_size: int           = Query(12, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cache_key = f"{category}||{from_date or ''}||{to_date or ''}"

    # ── Check cache ──────────────────────────────────────
    cache_entry = db.query(NewsCache).filter(NewsCache.cache_key == cache_key).first()

    if is_cache_fresh(cache_entry):
        # Serve from DB — instant
        q = (
            db.query(NewsArticle)
            .filter(NewsArticle.category == category)
        )
        if from_date:
            q = q.filter(NewsArticle.published_at >= datetime.fromisoformat(from_date.replace("Z", "+00:00")))
        if to_date:
            q = q.filter(NewsArticle.published_at <= datetime.fromisoformat(to_date.replace("Z", "+00:00")))

        total = q.count()
        db_articles = (
            q.order_by(NewsArticle.published_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "articles":     articles_to_response(db_articles),
            "totalResults": total,
            "page":         page,
            "pageSize":     page_size,
            "source":       "cache",
        }

    # ── Cache stale/missing — fetch from NewsAPI ─────────
    api_articles, total = fetch_from_newsapi(category, from_date, to_date, page, page_size)

    # Save to DB in background (only page 1, to avoid hammering DB)
    if page == 1:
        save_articles_to_db(db, api_articles, category)

        # Update or create cache entry
        if cache_entry:
            cache_entry.fetched_at = datetime.now(timezone.utc)
        else:
            db.add(NewsCache(cache_key=cache_key, fetched_at=datetime.now(timezone.utc)))
        db.commit()

    return {
        "articles":     api_articles,
        "totalResults": total,
        "page":         page,
        "pageSize":     page_size,
        "source":       "live",
    }


# ── DB-backed routes (kept for future features) ───────────────────────────────

# @router.get("/", response_model=List[NewsOut])
# def list_news(category, limit, skip, db, _): ...

# @router.post("/", response_model=NewsOut, status_code=201)
# def create_news(payload, db, _): ...

# @router.post("/seed", status_code=201)
# def seed_news(db, _): ...
