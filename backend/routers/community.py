import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List
from db.database import get_db
from models.models import (
    Message, User, Friendship, FriendStatus,
    Group, GroupMembership, GroupMessage, GroupMedia, GroupRole,
    GroupJoinRequest, GroupRequestStatus,
)
from schemas.schemas import (
    MessageCreate, MessageOut,
    GroupCreate, GroupOut, GroupMemberOut,
    GroupMessageOut,
    GroupMediaOut,
    GroupJoinRequestOut,
)
from utils.auth import get_current_user
# Reuse the exact same Supabase client + validation/delete helpers profile.py
# already uses for avatar/cover uploads, instead of standing up a second
# Supabase client. Same env vars, same 2MB limit, same allowed image types.
from routers.profile import (
    supabase, ALLOWED_CONTENT_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB,
    _extension_for, _delete_stored_object,
)

GROUP_COVER_BUCKET = "group-covers"
GROUP_MEDIA_BUCKET = "group-media"
GROUP_ATTACHMENT_BUCKET = "group-attachments"
MAX_ATTACHMENT_MB = 15
MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024


def _attachment_kind(content_type: str) -> str:
    """Classify an uploaded file so the frontend knows how to render it —
    inline image, an <audio> player for voice notes, or a generic file
    chip with a download link for everything else."""
    if content_type in ALLOWED_CONTENT_TYPES:
        return "image"
    if content_type.startswith("audio/"):
        return "voice"
    return "file"


def _safe_extension(filename: str, fallback: str = "bin") -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1][:10]  # cap absurdly long "extensions"
    return fallback

router = APIRouter(prefix="/api/community", tags=["Community"])

VALID_CHANNELS = {"general", "gaming", "strategy", "rpg", "esports", "memes", "tech"}


# ─── Legacy sitewide channels (unchanged, unrelated to Groups) ──────────
@router.get("/messages", response_model=List[MessageOut])
def get_messages(
    channel: str = Query("general"),
    limit:   int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Message)
        .options(joinedload(Message.author))
        .filter(Message.channel == channel)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()[::-1]  # reverse so oldest first
    )


@router.post("/messages", response_model=MessageOut, status_code=201)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = payload.channel if payload.channel in VALID_CHANNELS else "general"
    msg = Message(author_id=current_user.id, channel=channel, content=payload.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    msg = db.query(Message).options(joinedload(Message.author)).filter(Message.id == msg.id).first()
    return msg


@router.delete("/messages/{msg_id}", status_code=204)
def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.author_id == current_user.id,
    ).first()
    if msg:
        db.delete(msg)
        db.commit()


# ─── Groups ("Find Your Squad" + group chat detail) ─────────────────────
def _friend_ids_for(user_id: int, db: Session) -> set:
    rows = db.query(Friendship).filter(
        ((Friendship.requester_id == user_id) | (Friendship.addressee_id == user_id)),
        Friendship.status == FriendStatus.accepted,
    ).all()
    return {
        (r.addressee_id if r.requester_id == user_id else r.requester_id)
        for r in rows
    }


def _serialize_group(group: Group, current_user: User, db: Session) -> GroupOut:
    member_count = len(group.memberships)
    online_count = sum(1 for m in group.memberships if m.user.online)
    is_member = any(m.user_id == current_user.id for m in group.memberships)
    is_owner = group.owner_id == current_user.id

    has_pending_request = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.group_id == group.id,
        GroupJoinRequest.user_id == current_user.id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first() is not None

    pending_requests_count = 0
    if is_owner:
        pending_requests_count = db.query(GroupJoinRequest).filter(
            GroupJoinRequest.group_id == group.id,
            GroupJoinRequest.status == GroupRequestStatus.pending,
        ).count()

    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        banner_url=group.banner_url,
        tier=group.tier,
        activity_status=group.activity_status,
        highlight_tag=group.highlight_tag or "",
        directives=[l for l in (group.directives or "").split("\n") if l.strip()],
        member_count=member_count,
        online_count=online_count,
        is_member=is_member,
        is_owner=is_owner,
        owner_id=group.owner_id,
        created_at=group.created_at,
        has_pending_request=has_pending_request,
        pending_requests_count=pending_requests_count,
    )


def _get_group_or_404(group_id: int, db: Session) -> Group:
    group = (
        db.query(Group)
        .options(joinedload(Group.memberships).joinedload(GroupMembership.user))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(404, "Group not found")
    return group


def _require_member(group: Group, user: User) -> GroupMembership:
    membership = next((m for m in group.memberships if m.user_id == user.id), None)
    if not membership:
        raise HTTPException(403, "You must join this group first")
    return membership


def _require_owner(group: Group, user: User):
    if group.owner_id != user.id:
        raise HTTPException(403, "Only the group owner can do this")


@router.get("/groups", response_model=List[GroupOut])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Visible to everyone — browsing/discovery is intentionally open even
    # though joining requires owner approval.
    groups = (
        db.query(Group)
        .options(joinedload(Group.memberships).joinedload(GroupMembership.user))
        .order_by(Group.created_at.desc())
        .all()
    )
    return [_serialize_group(g, current_user, db) for g in groups]


@router.post("/groups", response_model=GroupOut, status_code=201)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = Group(
        name=payload.name,
        description=payload.description,
        banner_url=payload.banner_url,
        tier=payload.tier,
        activity_status=payload.activity_status,
        highlight_tag=payload.highlight_tag,
        directives=payload.directives,
        owner_id=current_user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role=GroupRole.owner))
    db.commit()
    group = _get_group_or_404(group.id, db)
    return _serialize_group(group, current_user, db)


@router.get("/groups/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)


# ── Join requests (self-serve: user asks, owner approves) ───────────────
@router.post("/groups/{group_id}/join", response_model=GroupOut)
def request_to_join(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)

    if any(m.user_id == current_user.id for m in group.memberships):
        raise HTTPException(400, "You're already in this group")

    existing = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.user_id == current_user.id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first()
    if existing:
        raise HTTPException(400, "You already have a pending request for this group")

    db.add(GroupJoinRequest(group_id=group_id, user_id=current_user.id))
    db.commit()
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)


@router.delete("/groups/{group_id}/join", status_code=204)
def cancel_join_request(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.user_id == current_user.id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first()
    if req:
        db.delete(req)
        db.commit()


@router.get("/groups/{group_id}/requests", response_model=List[GroupJoinRequestOut])
def list_join_requests(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)
    return (
        db.query(GroupJoinRequest)
        .options(joinedload(GroupJoinRequest.user))
        .filter(
            GroupJoinRequest.group_id == group_id,
            GroupJoinRequest.status == GroupRequestStatus.pending,
        )
        .order_by(GroupJoinRequest.created_at.asc())
        .all()
    )


@router.post("/groups/{group_id}/requests/{request_id}/accept", response_model=GroupJoinRequestOut)
def accept_join_request(
    group_id: int,
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)

    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.id == request_id,
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first()
    if not req:
        raise HTTPException(404, "Request not found")

    req.status = GroupRequestStatus.accepted
    if not any(m.user_id == req.user_id for m in group.memberships):
        db.add(GroupMembership(group_id=group_id, user_id=req.user_id, role=GroupRole.member))
    db.commit()
    db.refresh(req)
    return req


@router.post("/groups/{group_id}/requests/{request_id}/reject", response_model=GroupJoinRequestOut)
def reject_join_request(
    group_id: int,
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)

    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.id == request_id,
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first()
    if not req:
        raise HTTPException(404, "Request not found")

    req.status = GroupRequestStatus.rejected
    db.commit()
    db.refresh(req)
    return req


# ── Owner directly adding a friend (skips the request queue) ────────────
@router.post("/groups/{group_id}/members/{user_id}", response_model=GroupOut)
def add_member_directly(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)

    if any(m.user_id == user_id for m in group.memberships):
        raise HTTPException(400, "That user is already in the group")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")

    db.add(GroupMembership(group_id=group_id, user_id=user_id, role=GroupRole.member))
    # Auto-clear any pending request from that same user, now redundant.
    pending = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.user_id == user_id,
        GroupJoinRequest.status == GroupRequestStatus.pending,
    ).first()
    if pending:
        pending.status = GroupRequestStatus.accepted
    db.commit()
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)


@router.post("/groups/{group_id}/leave", status_code=204)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    if group.owner_id == current_user.id:
        raise HTTPException(400, "Owner can't leave their own group")
    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id,
    ).first()
    if membership:
        db.delete(membership)
        db.commit()


@router.get("/groups/{group_id}/members", response_model=List[GroupMemberOut])
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Intentionally open to non-members too — anyone can click into a
    # group and see who's in it before deciding to request to join.
    group = _get_group_or_404(group_id, db)
    friend_ids = _friend_ids_for(current_user.id, db)
    ordered = sorted(group.memberships, key=lambda m: (m.role != GroupRole.owner, not m.user.online))
    return [
        GroupMemberOut(
            id=m.user.id,
            username=m.user.username,
            avatar_url=m.user.avatar_url,
            online=m.user.online,
            role=m.role,
            is_friend=m.user.id in friend_ids,
            is_self=m.user.id == current_user.id,
        )
        for m in ordered
    ]


@router.get("/groups/{group_id}/messages", response_model=List[GroupMessageOut])
def get_group_messages(
    group_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)
    return (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.author))
        .filter(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )


@router.post("/groups/{group_id}/messages", response_model=GroupMessageOut, status_code=201)
async def send_group_message(
    group_id: int,
    content: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    text = content.strip()
    if not text and not file:
        raise HTTPException(400, "Message needs text or an attachment")

    attachment_url  = ""
    attachment_type = ""
    attachment_name = ""
    attachment_size = 0

    if file:
        contents = await file.read()
        if len(contents) > MAX_ATTACHMENT_BYTES:
            raise HTTPException(400, f"Attachments must be under {MAX_ATTACHMENT_MB}MB")

        ext = _safe_extension(file.filename)
        path = f"{group_id}/{uuid.uuid4().hex}.{ext}"
        content_type = file.content_type or "application/octet-stream"
        try:
            supabase.storage.from_(GROUP_ATTACHMENT_BUCKET).upload(
                path, contents, {"content-type": content_type, "upsert": "true"}
            )
            attachment_url = supabase.storage.from_(GROUP_ATTACHMENT_BUCKET).get_public_url(path)
        except Exception as e:
            raise HTTPException(500, f"Upload failed: {e}")

        attachment_type = _attachment_kind(content_type)
        attachment_name = file.filename or "file"
        attachment_size = len(contents)

    msg = GroupMessage(
        group_id=group_id, author_id=current_user.id, content=text,
        attachment_url=attachment_url, attachment_type=attachment_type,
        attachment_name=attachment_name, attachment_size=attachment_size,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg.id).first()
    return msg


@router.delete("/groups/{group_id}/messages/{msg_id}", status_code=204)
def delete_group_message(
    group_id: int,
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(GroupMessage).filter(
        GroupMessage.id == msg_id,
        GroupMessage.group_id == group_id,
        GroupMessage.author_id == current_user.id,
    ).first()
    if msg:
        db.delete(msg)
        db.commit()


@router.get("/groups/{group_id}/media", response_model=List[GroupMediaOut])
def list_media(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_group_or_404(group_id, db)
    return (
        db.query(GroupMedia)
        .options(joinedload(GroupMedia.uploaded_by))
        .filter(GroupMedia.group_id == group_id)
        .order_by(GroupMedia.created_at.desc())
        .limit(12)
        .all()
    )


@router.post("/groups/{group_id}/media", response_model=GroupMediaOut, status_code=201)
async def add_media(
    group_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Please upload a PNG, JPG, WEBP or GIF image")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(400, f"Image must be under {MAX_IMAGE_MB}MB")

    ext = _extension_for(file.content_type)
    path = f"{group_id}/{uuid.uuid4().hex}.{ext}"
    try:
        supabase.storage.from_(GROUP_MEDIA_BUCKET).upload(
            path, contents, {"content-type": file.content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(GROUP_MEDIA_BUCKET).get_public_url(path)
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")

    media = GroupMedia(group_id=group_id, image_url=public_url, uploaded_by_id=current_user.id)
    db.add(media)
    db.commit()
    db.refresh(media)
    media = db.query(GroupMedia).options(joinedload(GroupMedia.uploaded_by)).filter(GroupMedia.id == media.id).first()
    return media


@router.delete("/groups/{group_id}/media/{media_id}", status_code=204)
def delete_media(
    group_id: int,
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    media = db.query(GroupMedia).filter(
        GroupMedia.id == media_id,
        GroupMedia.group_id == group_id,
    ).first()
    if not media:
        return
    # Uploader or the group owner can remove a media item.
    if media.uploaded_by_id != current_user.id and group.owner_id != current_user.id:
        raise HTTPException(403, "You can't remove this media item")

    try:
        _delete_stored_object(GROUP_MEDIA_BUCKET, media.image_url)
    except Exception:
        pass  # best-effort — don't fail the request over a storage cleanup hiccup

    db.delete(media)
    db.commit()


# ── Group cover art (owner only, same pattern as profile avatar/cover) ──
@router.post("/groups/{group_id}/cover", response_model=GroupOut)
async def upload_group_cover(
    group_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Please upload a PNG, JPG, WEBP or GIF image")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(400, f"Image must be under {MAX_IMAGE_MB}MB")

    ext = _extension_for(file.content_type)
    path = f"{group_id}/{uuid.uuid4().hex}.{ext}"
    previous_url = group.banner_url

    try:
        supabase.storage.from_(GROUP_COVER_BUCKET).upload(
            path, contents, {"content-type": file.content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(GROUP_COVER_BUCKET).get_public_url(path)
        try:
            _delete_stored_object(GROUP_COVER_BUCKET, previous_url)
        except Exception:
            pass  # non-fatal — new cover is live either way
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")

    group.banner_url = public_url
    db.commit()
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)


@router.delete("/groups/{group_id}/cover", response_model=GroupOut)
def remove_group_cover(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_owner(group, current_user)

    try:
        _delete_stored_object(GROUP_COVER_BUCKET, group.banner_url)
    except Exception as e:
        raise HTTPException(500, f"Removal failed: {e}")

    group.banner_url = ""
    db.commit()
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)
