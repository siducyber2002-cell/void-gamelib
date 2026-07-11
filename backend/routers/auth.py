import os
import secrets
import urllib.parse

import httpx
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone
from db.database import get_db
from models.models import User, StreakLog
from schemas.schemas import UserRegister, UserOut, UserUpdate, TokenResponse, ChangePassword, UserPublic, StreakOut
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from utils.streak import update_user_streak

# Loads variables from a .env file in the backend's working directory into
# os.environ. Safe to call even if main.py already does this elsewhere —
# load_dotenv() never overwrites a var that's already set, so this just
# guarantees the Google config below is populated no matter how the rest
# of the app is wired up.
load_dotenv()


class DeleteAccountRequest(BaseModel):
    password: str


router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ── Google OAuth config ──────────────────────────────────────────────────
# Set these in your environment (.env / deployment secrets). Get the client
# ID/secret from https://console.cloud.google.com/apis/credentials — an
# "OAuth client ID" of type "Web application". Add GOOGLE_REDIRECT_URI to
# that client's "Authorized redirect URIs" list *exactly* as set below.
#
# Read with getenv (not os.environ[...]) on purpose: a missing var here
# must not crash the whole app on import — it should only break the Google
# routes themselves, so every other endpoint keeps working either way.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
# The backend URL Google redirects back to after consent, e.g.
# "https://api.yoursite.com/api/auth/google/callback" (or
# "http://localhost:8000/api/auth/google/callback" in dev).
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI")
# Where to send the browser after login completes, e.g. your frontend's
# origin. Falls back to the "next" query param the frontend sends in, but
# is always checked against this allowlist so the redirect can't be hijacked.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
# Signs the "state" param so it can't be tampered with in transit. Reuse
# your app's SECRET_KEY if you already have one (e.g. the same one
# utils/auth.py uses to sign JWTs) rather than a second secret.
OAUTH_STATE_SECRET = os.environ.get("SECRET_KEY") or os.environ.get("OAUTH_STATE_SECRET")

_state_serializer = (
    URLSafeTimedSerializer(OAUTH_STATE_SECRET, salt="google-oauth-state")
    if OAUTH_STATE_SECRET else None
)

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo"


def _require_google_config():
    """Called at the top of each Google route rather than at import time —
    so if you forget an env var, only "Continue with Google" breaks (with a
    clear message) instead of the entire backend refusing to start."""
    missing = [
        name for name, val in [
            ("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID),
            ("GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET),
            ("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
            ("SECRET_KEY or OAUTH_STATE_SECRET", OAUTH_STATE_SECRET),
        ] if not val
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Google login isn't configured on the server — missing: {', '.join(missing)}",
        )


def _safe_next_path(next_url: str | None) -> str:
    """Only ever redirect back into FRONTEND_URL — never wherever `next`
    happens to point, since that value round-trips through the browser and
    an attacker could otherwise use this endpoint as an open redirect."""
    if not next_url:
        return FRONTEND_URL
    parsed = urllib.parse.urlparse(next_url)
    frontend = urllib.parse.urlparse(FRONTEND_URL)
    if parsed.scheme == frontend.scheme and parsed.netloc == frontend.netloc:
        return next_url
    return FRONTEND_URL


def _unique_username(base: str, db: Session) -> str:
    """Google gives us an email, not a username — derive one and disambiguate
    against existing rows the same way a person signing up manually would
    have to."""
    base = "".join(ch for ch in base.lower() if ch.isalnum()) or "user"
    candidate = base
    suffix = 0
    while db.query(User).filter(User.username == candidate).first():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/google")
def google_login(next: str | None = Query(default=None)):
    """
    The frontend sends the browser here directly (window.location.href),
    not fetch — this has to be a real navigation so the user actually lands
    on Google's consent screen. `next` is where we send them back to in the
    app once login succeeds.
    """
    _require_google_config()
    state = _state_serializer.dumps({"next": _safe_next_path(next), "nonce": secrets.token_urlsafe(16)})
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}")


@router.get("/google/callback")
def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Google redirects the browser back here with either `code` (success) or
    `error` (user hit "cancel", etc). On success we exchange the code for
    tokens server-to-server, look up the person's Google profile, log them
    in (creating the account on first login), and send the browser on to
    the frontend with a short-lived token in the URL for it to pick up.
    """
    _require_google_config()
    try:
        next_path = _state_serializer.loads(state, max_age=600)["next"] if state else FRONTEND_URL
    except (BadSignature, SignatureExpired, TypeError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    if error or not code:
        return RedirectResponse(f"{next_path}?auth_error=google_denied")

    with httpx.Client(timeout=10) as client:
        token_resp = client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            return RedirectResponse(f"{next_path}?auth_error=google_token_exchange_failed")
        access_token = token_resp.json().get("access_token")

        userinfo_resp = client.get(
            GOOGLE_USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            return RedirectResponse(f"{next_path}?auth_error=google_userinfo_failed")
        profile = userinfo_resp.json()

    email = profile.get("email")
    if not email or not profile.get("email_verified"):
        return RedirectResponse(f"{next_path}?auth_error=google_email_unverified")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # First time we've seen this email — provision an account. There's
        # no password to hash (they'll only ever sign in via Google unless
        # they later use "forgot password" to set one), so we store an
        # unusable random hash rather than leaving the column nullable.
        username_base = profile.get("given_name") or email.split("@")[0]
        user = User(
            username=_unique_username(username_base, db),
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user.last_seen = datetime.now(timezone.utc)
    db.commit()

    update_user_streak(user, db)
    jwt_token = create_access_token(data={"sub": str(user.id)})

    redirect_url = f"{next_path}{'&' if '?' in next_path else '?'}token={urllib.parse.quote(jwt_token)}"
    return RedirectResponse(redirect_url)


@router.post("/token", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form.username  # OAuth2 form field is always called "username" — holds email OR username here
    user = db.query(User).filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.last_seen = datetime.now(timezone.utc)
    token = create_access_token(data={"sub": str(user.id)})
    streak = update_user_streak(user, db)
    return {"access_token": token, "token_type": "bearer", "streak": streak}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/heartbeat")
def heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pinged every ~20s by the frontend while the app is open (see
    Topbar.jsx). Keeps User.last_seen fresh so User.online reflects real
    presence."""
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/streak", response_model=StreakOut)
def get_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Call this on app mount / resume (not just login) — e.g. when the tab
    regains focus or the app comes back to the foreground. It's safe to call
    repeatedly; the streak only advances once per calendar day per user.
    `streak_increased_today` tells the frontend whether to show the popup.
    """
    return update_user_streak(current_user, db)


@router.get("/streak/history")
def get_streak_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns every date (YYYY-MM-DD) the user has ever logged in, as a flat
    list of strings — this is what the dashboard calendar checks each day
    against to decide whether to light up a cell.
    """
    logs = (
        db.query(StreakLog)
        .filter(StreakLog.user_id == current_user.id)
        .all()
    )
    return [log.date.isoformat() for log in logs]


@router.post("/onboarding/seen/{page_key}")
def mark_onboarding_seen(
    page_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called once by PageTour.jsx when a user finishes or skips a page's guided
    tour. Idempotent — adding a page_key that's already recorded is a no-op,
    so the frontend doesn't need to check first.
    """
    seen = set(current_user.onboarding_seen_pages or [])
    seen.add(page_key)
    current_user.onboarding_seen_pages = list(seen)
    db.commit()
    db.refresh(current_user)
    return {"seen_pages": current_user.onboarding_seen_pages}


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.username and payload.username != current_user.username:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, val)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/me")
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted"}


@router.get("/users/search", response_model=List[UserPublic])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{q}%"), User.id != current_user.id)
        .limit(10)
        .all()
    )
    return users

