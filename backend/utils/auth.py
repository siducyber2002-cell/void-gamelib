from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
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

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token"
)

# bcrypt has a hard 72-byte input limit -- anything longer raises inside
# the C extension. We truncate on the byte boundary (not the char
# boundary) so multi-byte UTF-8 passwords don't get cut mid-character.
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) <= _BCRYPT_MAX_BYTES:
        return encoded
    # Trim byte-by-byte until it's valid utf-8 again, so we never split
    # a multi-byte character in half.
    trimmed = encoded[:_BCRYPT_MAX_BYTES]
    while trimmed:
        try:
            trimmed.decode("utf-8")
            return trimmed
        except UnicodeDecodeError:
            trimmed = trimmed[:-1]
    return trimmed


# ==========================
# PASSWORD FUNCTIONS
# ==========================

def hash_password(password: str) -> str:
    """
    Hash a plaintext password with bcrypt for storage.

    Calls the `bcrypt` package directly instead of going through
    passlib's CryptContext. passlib's bcrypt backend probes
    `bcrypt.__about__.__version__` to detect the installed bcrypt
    version, and that attribute was removed in bcrypt>=4.1 -- so on
    any environment that resolves a newer bcrypt at install time,
    passlib's *first* hash call raises AttributeError and every
    /register call 500s. Calling bcrypt.hashpw/checkpw ourselves
    removes that fragile version-detection step entirely.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(password), salt)
    return hashed.decode("utf-8")


def _looks_like_bcrypt_hash(value: str) -> bool:
    """
    bcrypt hashes always start with one of these prefixes and are
    60 chars long. Anything else stored in hashed_password is either
    a different scheme (unlikely here) or leftover plaintext from the
    incident where hash_password() was briefly stubbed out.
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
        try:
            return bcrypt.checkpw(_to_bcrypt_bytes(plain_password), stored_password.encode("utf-8"))
        except ValueError:
            # Malformed hash in the DB -- treat as no match rather than 500ing.
            return False

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
        try:
            return bcrypt.checkpw(_to_bcrypt_bytes(plain_password), stored.encode("utf-8"))
        except ValueError:
            return False

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
