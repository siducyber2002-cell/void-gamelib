"""
Profile image routes: avatar + cover(banner) photo upload/removal.

Supabase is used ONLY for file storage (uploading the image, getting back a
public URL). The URL itself is saved into our own `users` table via
SQLAlchemy, same as every other field update in auth.py.

ONE-TIME SUPABASE DASHBOARD SETUP (do this before testing):
1. Go to Storage in your Supabase dashboard.
2. Create a bucket named "avatars" — set it to Public.
3. Create a bucket named "covers" — set it to Public.
"""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from supabase import create_client, Client

from db.database import get_db
from models.models import User
from utils.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role, NOT the anon key — storage writes need this
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Keep this in sync with the frontend's MAX_IMAGE_MB constant
MAX_IMAGE_MB = 2
MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

BUCKETS = {"avatar": "avatars", "cover": "covers"}
# Maps our upload "kind" to the actual column name on the User model
COLUMNS = {"avatar": "avatar_url", "cover": "banner_url"}


def _extension_for(content_type: str) -> str:
    return {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
    }[content_type]


def _delete_stored_object(bucket: str, current_url: str | None):
    """Delete the actual file object in Supabase Storage that a URL points
    to. Safe to call with None/empty — does nothing in that case. Used by
    both upload (to clean up the file being replaced) and remove."""
    if not current_url:
        return
    # Public URLs look like: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
    marker = f"/{bucket}/"
    if marker in current_url:
        object_path = current_url.split(marker, 1)[1]
        supabase.storage.from_(bucket).remove([object_path])


async def _handle_upload(kind: str, file: UploadFile, user: User, db: Session):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a PNG, JPG, WEBP or GIF image")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail=f"Image must be under {MAX_IMAGE_MB}MB")

    bucket = BUCKETS[kind]
    column = COLUMNS[kind]
    ext = _extension_for(file.content_type)
    # A fresh filename per upload avoids stale CDN/browser caching of the old image
    path = f"{user.id}/{uuid.uuid4().hex}.{ext}"
    previous_url = getattr(user, column, None)

    try:
        supabase.storage.from_(bucket).upload(
            path, contents, {"content-type": file.content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(bucket).get_public_url(path)

        # Clean up the old file now that the new one is safely uploaded —
        # done after a successful upload so a failed upload never destroys
        # a perfectly good existing image.
        try:
            _delete_stored_object(bucket, previous_url)
        except Exception:
            # Non-fatal: the new image is live either way, just leaves an
            # orphaned old file this one time rather than failing the request.
            pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    setattr(user, column, public_url)
    db.commit()
    db.refresh(user)

    return {column: public_url}


async def _handle_remove(kind: str, user: User, db: Session):
    bucket = BUCKETS[kind]
    column = COLUMNS[kind]
    current_url = getattr(user, column, None)

    try:
        _delete_stored_object(bucket, current_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Removal failed: {e}")

    setattr(user, column, "")
    db.commit()
    db.refresh(user)

    return {column: ""}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _handle_upload("avatar", file, user, db)


@router.delete("/avatar")
async def remove_avatar(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _handle_remove("avatar", user, db)


@router.post("/cover")
async def upload_cover(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _handle_upload("cover", file, user, db)


@router.delete("/cover")
async def remove_cover(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _handle_remove("cover", user, db)
