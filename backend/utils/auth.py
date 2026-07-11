from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import User
import os

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "supersecretkey_change_in_production_please"
)

ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080)
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token"
)


# ==========================
# PASSWORD FUNCTIONS
# ==========================

def hash_password(password: str) -> str:
    """
    Hash a plaintext password with bcrypt for storage.
    """
    return pwd_context.hash(password)


def _looks_like_bcrypt_hash(value: str) -> bool:
    """
    bcrypt hashes always start with one of these prefixes and are
    60 chars long. Anything else stored in hashed_password is either
    a different passlib scheme (unlikely here) or leftover plaintext
    from the incident where hash_password() was briefly stubbed out.
    """
    return isinstance(value, str) and value.startswith(("$2a$", "$2b$", "$2y$")) and len(value) == 60


def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    Verify a plaintext password against the stored value.

    Handles two cases:
      1. stored_password is a real bcrypt hash -> normal bcrypt verify.
      2. stored_password is plaintext, left over from the window where
         hash_password() was accidentally storing passwords unhashed ->
         fall back to a direct comparison so those users aren't locked
         out of their own accounts.

    Callers that also have access to a Session/User (e.g. the login
    route) should prefer `verify_and_upgrade_password` below so that
    any plaintext value gets migrated to a proper hash immediately
    after a successful login.
    """
    if _looks_like_bcrypt_hash(stored_password):
        return pwd_context.verify(plain_password, stored_password)

    # Legacy/incident fallback: stored value is plaintext.
    return plain_password == stored_password


def verify_and_upgrade_password(plain_password: str, user: User, db: Session) -> bool:
    """
    Same check as verify_password, but if the match succeeded against a
    plaintext (non-bcrypt) stored value, transparently rehashes it with
    bcrypt and persists it, closing the exposure window for that user
    on their very next successful login.

    Use this in the login/token route instead of calling verify_password
    directly, so affected accounts self-heal without an admin needing to
    force a password reset for every user.
    """
    stored = user.hashed_password

    if _looks_like_bcrypt_hash(stored):
        return pwd_context.verify(plain_password, stored)

    if plain_password == stored:
        user.hashed_password = hash_password(plain_password)
        db.add(user)
        db.commit()
        return True

    return False


# ==========================
# JWT FUNCTIONS
# ==========================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:

    to_encode = data.copy()

    expire = datetime.now(
        timezone.utc
    ) + (
        expires_delta
        or timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ==========================
# CURRENT USER
# ==========================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    if user is None or not user.is_active:
        raise credentials_exception

    return user
