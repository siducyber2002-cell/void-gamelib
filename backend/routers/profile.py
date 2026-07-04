"""
Profile image routes: avatar + cover photo upload/removal via Supabase Storage.

WHERE THIS FILE GOES:
Drop this alongside your other route modules (e.g. next to xp.py, library.py,
friends.py) and include it in your main FastAPI app:

    from routes.profile import router as profile_router
    app.include_router(profile_router, prefix="/api/profile", tags=["profile"])

ASSUMPTIONS YOU'LL NEED TO ADJUST (marked with # ADJUST below):
1. You already have a Supabase client instance somewhere — import it instead
   of creating a new one here, OR fill in your env var names if this is the
   first place you're creating one.
2. You have an auth dependency (get_current_user) that returns the logged-in
   user with at least a `.id` attribute — swap in your real one.
3. Your users/profiles table name and its avatar_url / cover_url columns —
   adjust `PROFILES_TABLE` and the column names if they differ.

ONE-TIME SUPABASE DASHBOARD SETUP (do this before testing):
1. Go to Storage in your Supabase dashboard.
2. Create a bucket named "avatars" — set it to Public.
3. Create a bucket named "covers" — set it to Public.
   (Public buckets return a plain public URL. If you'd rather keep them
   private, swap create_signed_url in place of get_public_url below.)
"""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from supabase import create_client, Client

# ADJUST: replace with your actual auth dependency import
from app.dependencies.auth import get_current_user  # noqa: F401 (adjust path)

router = APIRouter()

# ADJUST: reuse your existing Supabase client instead of creating a new one,
# if you already initialize one elsewhere in the app.
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role, NOT the anon key — storage writes need this
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ADJUST: your actual table + column names
PROFILES_TABLE = "profiles"

# Keep this in sync with the frontend's MAX_IMAGE_MB constant
MAX_IMAGE_MB = 2
MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

BUCKETS = {"avatar": "avatars", "cover": "covers"}
COLUMNS = {"avatar": "avatar_url", "cover": "cover_url"}


def _extension_for(content_type: str) -> str:
    return {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
    }[content_type]


async def _handle_upload(kind: str, file: UploadFile, user):
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

    try:
        supabase.storage.from_(bucket).upload(
            path, contents, {"content-type": file.content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(bucket).get_public_url(path)

        supabase.table(PROFILES_TABLE).update({column: public_url}).eq("id", user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    return {column: public_url}


async def _handle_remove(kind: str, user):
    bucket = BUCKETS[kind]
    column = COLUMNS[kind]

    try:
        # Look up current path so we can delete the actual stored object, not just the DB column
        result = supabase.table(PROFILES_TABLE).select(column).eq("id", user.id).single().execute()
        current_url = result.data.get(column) if result.data else None

        if current_url:
            # Public URLs look like: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
            marker = f"/{bucket}/"
            if marker in current_url:
                object_path = current_url.split(marker, 1)[1]
                supabase.storage.from_(bucket).remove([object_path])

        supabase.table(PROFILES_TABLE).update({column: None}).eq("id", user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Removal failed: {e}")

    return {column: None}


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    return await _handle_upload("avatar", file, user)


@router.delete("/avatar")
async def remove_avatar(user=Depends(get_current_user)):
    return await _handle_remove("avatar", user)


@router.post("/cover")
async def upload_cover(file: UploadFile = File(...), user=Depends(get_current_user)):
    return await _handle_upload("cover", file, user)


@router.delete("/cover")
async def remove_cover(user=Depends(get_current_user)):
    return await _handle_remove("cover", user)
