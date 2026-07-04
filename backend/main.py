from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from db.database import engine, Base
from models import models  # ensure all models are imported before create_all

# Import routers
from routers import auth, games, library, friends, community, achievements, dashboard, news, reviews, dm, xp, profile

# ─── Create tables ───────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── App ─────────────────────────────────────────────────
app = FastAPI(
    title="GameLib API",
    description="Backend for GameLib — Your Gaming Universe",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(games.router)
app.include_router(library.router)
app.include_router(friends.router)
app.include_router(community.router)
app.include_router(achievements.router)
app.include_router(dashboard.router)
app.include_router(news.router)
app.include_router(reviews.router)
app.include_router(dm.router)
app.include_router(xp.router)
app.include_router(profile.router, tags=["profile"])


@app.get("/")
def root():
    return {
        "name": "GameLib API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running 🎮"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
