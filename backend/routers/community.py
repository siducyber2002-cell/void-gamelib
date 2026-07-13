import re
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from db.database import get_db
from models.models import (
    Message, User, Friendship, FriendStatus, Notification,
    Group, GroupMembership, GroupMessage, GroupMedia, GroupRole,
    GroupJoinRequest, GroupRequestStatus,
    GroupMessageReaction, GroupTypingState,
)
from schemas.schemas import (
    MessageCreate, MessageOut,
    GroupCreate, GroupOut, GroupMemberOut,
    GroupMessageOut, GroupMessageEdit, GroupMessageReplyOut, GroupMessageReactionOut,
    ReactionToggle, TypingUserOut,
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

# How long a typing-state row is considered "live" once read back. The
# frontend re-pings every few keystrokes (well under this), so a row this
# fresh means someone is actively typing right now; anything older just
# means they stopped and nothing swept it up yet.
TYPING_ACTIVE_SECONDS = 6

# @username mentions — usernames are min 3 chars (see UserRegister validator)
# but we don't bother re-enforcing that here; an unmatched mention just
# resolves to zero users and is a no-op.
MENTION_RE = re.compile(r"@(\w+)")


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


def _serialize_group(
    group: Group,
    current_user: User,
    db: Session,
    *,
    has_pending_request: bool | None = None,
    pending_requests_count: int | None = None,
) -> GroupOut:
    """
    `has_pending_request`/`pending_requests_count` can be passed in
    pre-computed (see list_groups below) so callers that are serializing
    many groups at once can batch those two queries into one each instead
    of running them per-group. Single-group call sites (create_group,
    get_group, request_to_join, etc.) don't pass them, so this still falls
    back to querying inline for those — same behavior as before, just opt-in
    for the N+1 case.
    """
    member_count = len(group.memberships)
    online_count = sum(1 for m in group.memberships if m.user.online)
    is_member = any(m.user_id == current_user.id for m in group.memberships)
    is_owner = group.owner_id == current_user.id

    if has_pending_request is None:
        has_pending_request = db.query(GroupJoinRequest).filter(
            GroupJoinRequest.group_id == group.id,
            GroupJoinRequest.user_id == current_user.id,
            GroupJoinRequest.status == GroupRequestStatus.pending,
        ).first() is not None

    if pending_requests_count is None:
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


def _serialize_group_messages(msgs: list[GroupMessage], current_user: User, db: Session) -> List[GroupMessageOut]:
    """Batch-serialize a list of GroupMessage rows into GroupMessageOut,
    including reactions and reply-to previews.

    Both of those need extra queries, and this is called from list
    endpoints that can return up to ~50-200 messages at once — so this
    batches reactions and reply-parents into ONE query each for the whole
    list, rather than 1-2 extra queries PER message (same N+1 concern
    already flagged elsewhere in this file for group listing)."""
    if not msgs:
        return []

    msg_ids = [m.id for m in msgs]

    # Reactions: one query for the whole batch, aggregated in Python since
    # we need per-message per-emoji counts AND whether the current user is
    # among the reactors — a GROUP BY alone can't hand back both shapes at
    # once without a second correlated query anyway.
    reaction_rows = (
        db.query(GroupMessageReaction)
        .filter(GroupMessageReaction.message_id.in_(msg_ids))
        .all()
    )
    reactions_by_msg: dict[int, dict[str, dict]] = {}
    for r in reaction_rows:
        bucket = reactions_by_msg.setdefault(r.message_id, {})
        entry = bucket.setdefault(r.emoji, {"emoji": r.emoji, "count": 0, "reacted": False})
        entry["count"] += 1
        if r.user_id == current_user.id:
            entry["reacted"] = True

    # Reply-to previews: batch-fetch the parent messages referenced by this
    # batch instead of a lazy-load per message.
    reply_ids = {m.reply_to_id for m in msgs if m.reply_to_id}
    reply_lookup = {}
    if reply_ids:
        parents = (
            db.query(GroupMessage)
            .options(joinedload(GroupMessage.author))
            .filter(GroupMessage.id.in_(reply_ids))
            .all()
        )
        reply_lookup = {p.id: p for p in parents}

    out = []
    for m in msgs:
        reply_preview = None
        if m.reply_to_id and m.reply_to_id in reply_lookup:
            parent = reply_lookup[m.reply_to_id]
            reply_preview = GroupMessageReplyOut(
                id=parent.id,
                content=parent.content,
                author_username=parent.author.username,
                attachment_type=parent.attachment_type,
            )
        out.append(GroupMessageOut(
            id=m.id,
            group_id=m.group_id,
            author_id=m.author_id,
            content=m.content,
            created_at=m.created_at,
            author=m.author,
            attachment_url=m.attachment_url,
            attachment_type=m.attachment_type,
            attachment_name=m.attachment_name,
            attachment_size=m.attachment_size,
            edited_at=m.edited_at,
            pinned=m.pinned,
            reply_to=reply_preview,
            reactions=[
                GroupMessageReactionOut(**entry)
                for entry in reactions_by_msg.get(m.id, {}).values()
            ],
        ))
    return out


def _process_mentions(text: str, group: Group, author: User, db: Session):
    """Parse @username tokens out of a just-sent message and drop a
    Notification row (type="group_mention") for each mentioned member who
    isn't the author. Reuses the existing generic Notification model/feed
    (same one xp/friend notifications already flow through in the bell) —
    no new notification plumbing needed."""
    if not text:
        return
    usernames = set(MENTION_RE.findall(text))
    if not usernames:
        return

    member_ids = {m.user_id for m in group.memberships}
    mentioned_users = (
        db.query(User)
        .filter(User.username.in_(usernames), User.id.in_(member_ids), User.id != author.id)
        .all()
    )
    if not mentioned_users:
        return

    for u in mentioned_users:
        db.add(Notification(
            user_id=u.id,
            type="group_mention",
            message=f"{author.username} mentioned you in {group.name}",
            action="group_mention",
            detail=str(group.id),
        ))
    db.commit()


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


def _require_owner_or_admin(group: Group, membership: GroupMembership, user: User):
    if group.owner_id != user.id and membership.role != GroupRole.admin:
        raise HTTPException(403, "Only the group owner or an admin can do this")


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
    if not groups:
        return []

    group_ids = [g.id for g in groups]

    # Previously _serialize_group ran 1-2 extra queries PER group (does the
    # current user have a pending request here? if they own it, how many
    # pending requests total?) — so this page was doing up to 1 + 2*N
    # queries. With CommunityPage polling this list, N groups meant N
    # queries firing every poll interval, which is exactly the kind of
    # thing that shows up as stutter/lag as the group count grows. Both
    # checks are batched into one query each here instead, keyed by
    # group_id, and handed to _serialize_group as precomputed values.

    # "Do I have a pending request in any of these groups" — one query.
    pending_group_ids = {
        row.group_id for row in db.query(GroupJoinRequest.group_id).filter(
            GroupJoinRequest.group_id.in_(group_ids),
            GroupJoinRequest.user_id == current_user.id,
            GroupJoinRequest.status == GroupRequestStatus.pending,
        ).all()
    }

    # Pending-request counts, only relevant for groups this user owns —
    # one grouped query covering all of them at once.
    owned_group_ids = [g.id for g in groups if g.owner_id == current_user.id]
    pending_counts_by_group = {}
    if owned_group_ids:
        pending_counts_by_group = dict(
            db.query(GroupJoinRequest.group_id, func.count(GroupJoinRequest.id))
            .filter(
                GroupJoinRequest.group_id.in_(owned_group_ids),
                GroupJoinRequest.status == GroupRequestStatus.pending,
            )
            .group_by(GroupJoinRequest.group_id)
            .all()
        )

    return [
        _serialize_group(
            g, current_user, db,
            has_pending_request=g.id in pending_group_ids,
            pending_requests_count=pending_counts_by_group.get(g.id, 0),
        )
        for g in groups
    ]


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
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)
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
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

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
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

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


# ── Owner or admin directly adding a friend (skips the request queue) ───
@router.post("/groups/{group_id}/members/{user_id}", response_model=GroupOut)
def add_member_directly(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

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


@router.post("/groups/{group_id}/members/{user_id}/promote", response_model=GroupMemberOut)
def promote_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    acting_membership = _require_member(group, current_user)
    _require_owner_or_admin(group, acting_membership, current_user)

    target = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == user_id,
    ).first()
    if not target:
        raise HTTPException(404, "That user isn't a member of this group")
    if target.role in (GroupRole.owner, GroupRole.admin):
        raise HTTPException(400, "That member is already an owner or admin")

    target.role = GroupRole.admin
    db.commit()

    friend_ids = _friend_ids_for(current_user.id, db)
    return GroupMemberOut(
        id=target.user.id,
        username=target.user.username,
        avatar_url=target.user.avatar_url,
        online=target.user.online,
        role=target.role,
        is_friend=target.user.id in friend_ids,
        is_self=target.user.id == current_user.id,
    )


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


# ── Messages ─────────────────────────────────────────────────────────────
# NOTE ON ROUTE ORDER: the literal-path routes below (/messages/pinned,
# /messages/search) are declared BEFORE the /messages/{msg_id} routes.
# FastAPI/Starlette matches routes in registration order, so a param route
# declared first could shadow "pinned"/"search" as if they were a msg_id.
@router.get("/groups/{group_id}/messages", response_model=List[GroupMessageOut])
def get_group_messages(
    group_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)
    msgs = (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.author))
        .filter(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )
    return _serialize_group_messages(msgs, current_user, db)


@router.get("/groups/{group_id}/messages/pinned", response_model=List[GroupMessageOut])
def list_pinned_messages(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)
    msgs = (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.author))
        .filter(GroupMessage.group_id == group_id, GroupMessage.pinned == True)  # noqa: E712
        .order_by(GroupMessage.pinned_at.desc())
        .all()
    )
    return _serialize_group_messages(msgs, current_user, db)


@router.get("/groups/{group_id}/messages/search", response_model=List[GroupMessageOut])
def search_group_messages(
    group_id: int,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)
    msgs = (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.author))
        .filter(
            GroupMessage.group_id == group_id,
            GroupMessage.content.ilike(f"%{q}%"),
        )
        .order_by(GroupMessage.created_at.desc())
        .limit(50)
        .all()
    )
    return _serialize_group_messages(msgs, current_user, db)


@router.post("/groups/{group_id}/messages", response_model=GroupMessageOut, status_code=201)
async def send_group_message(
    group_id: int,
    content: str = Form(""),
    reply_to_id: Optional[int] = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    text = content.strip()
    if not text and not file:
        raise HTTPException(400, "Message needs text or an attachment")

    if reply_to_id is not None:
        parent = db.query(GroupMessage).filter(
            GroupMessage.id == reply_to_id,
            GroupMessage.group_id == group_id,
        ).first()
        if not parent:
            raise HTTPException(400, "Original message not found")

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
        reply_to_id=reply_to_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    _process_mentions(text, group, current_user, db)

    # Sending clears the sender's own typing indicator immediately, instead
    # of waiting out TYPING_ACTIVE_SECONDS for it to expire on its own.
    typing_state = db.query(GroupTypingState).filter(
        GroupTypingState.group_id == group_id,
        GroupTypingState.user_id == current_user.id,
    ).first()
    if typing_state:
        db.delete(typing_state)
        db.commit()

    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg.id).first()
    return _serialize_group_messages([msg], current_user, db)[0]


@router.patch("/groups/{group_id}/messages/{msg_id}", response_model=GroupMessageOut)
def edit_group_message(
    group_id: int,
    msg_id: int,
    payload: GroupMessageEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(GroupMessage).filter(
        GroupMessage.id == msg_id,
        GroupMessage.group_id == group_id,
    ).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.author_id != current_user.id:
        raise HTTPException(403, "You can only edit your own messages")

    text = payload.content.strip()
    if not text and not msg.attachment_url:
        raise HTTPException(400, "Message can't be empty")

    msg.content = text
    msg.edited_at = datetime.now(timezone.utc)
    db.commit()

    group = _get_group_or_404(group_id, db)
    _process_mentions(text, group, current_user, db)

    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg_id).first()
    return _serialize_group_messages([msg], current_user, db)[0]


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


# ── Clear chat (owner or admin — deletes every message in the group) ────
# Bulk sibling of delete_group_message above: that one is scoped to a
# single message and only the author can use it; this wipes the whole
# thread and is restricted to owner/admin, same permission tier as
# accepting join requests or changing the cover image.
@router.delete("/groups/{group_id}/messages", status_code=204)
def clear_group_messages(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    membership = _require_member(group, current_user)
    if group.owner_id != current_user.id and membership.role != GroupRole.admin:
        raise HTTPException(403, "Only the group owner or an admin can clear the chat")

    db.query(GroupMessage).filter(GroupMessage.group_id == group_id).delete(synchronize_session=False)
    db.commit()


# ── Reactions ─────────────────────────────────────────────────────────────
@router.post("/groups/{group_id}/messages/{msg_id}/reactions", response_model=GroupMessageOut)
def toggle_reaction(
    group_id: int,
    msg_id: int,
    payload: ReactionToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    msg = db.query(GroupMessage).filter(
        GroupMessage.id == msg_id,
        GroupMessage.group_id == group_id,
    ).first()
    if not msg:
        raise HTTPException(404, "Message not found")

    emoji = payload.emoji.strip()
    if not emoji:
        raise HTTPException(400, "Emoji required")

    existing = db.query(GroupMessageReaction).filter(
        GroupMessageReaction.message_id == msg_id,
        GroupMessageReaction.user_id == current_user.id,
        GroupMessageReaction.emoji == emoji,
    ).first()
    if existing:
        db.delete(existing)   # toggle off
    else:
        db.add(GroupMessageReaction(message_id=msg_id, user_id=current_user.id, emoji=emoji))
    db.commit()

    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg_id).first()
    return _serialize_group_messages([msg], current_user, db)[0]


# ── Pin ───────────────────────────────────────────────────────────────────
# Same permission tier as Clear Chat — owner or admin only, so the pinned
# rail can't get spammed by every member.
@router.post("/groups/{group_id}/messages/{msg_id}/pin", response_model=GroupMessageOut)
def pin_message(
    group_id: int,
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

    msg = db.query(GroupMessage).filter(
        GroupMessage.id == msg_id,
        GroupMessage.group_id == group_id,
    ).first()
    if not msg:
        raise HTTPException(404, "Message not found")

    msg.pinned = True
    msg.pinned_at = datetime.now(timezone.utc)
    msg.pinned_by_id = current_user.id
    db.commit()

    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg_id).first()
    return _serialize_group_messages([msg], current_user, db)[0]


@router.delete("/groups/{group_id}/messages/{msg_id}/pin", response_model=GroupMessageOut)
def unpin_message(
    group_id: int,
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

    msg = db.query(GroupMessage).filter(
        GroupMessage.id == msg_id,
        GroupMessage.group_id == group_id,
    ).first()
    if not msg:
        raise HTTPException(404, "Message not found")

    msg.pinned = False
    msg.pinned_at = None
    msg.pinned_by_id = None
    db.commit()

    msg = db.query(GroupMessage).options(joinedload(GroupMessage.author)).filter(GroupMessage.id == msg_id).first()
    return _serialize_group_messages([msg], current_user, db)[0]


# ── Typing indicators (poll-friendly — see GroupTypingState) ────────────
@router.post("/groups/{group_id}/typing", status_code=204)
def ping_typing(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    state = db.query(GroupTypingState).filter(
        GroupTypingState.group_id == group_id,
        GroupTypingState.user_id == current_user.id,
    ).first()
    if state:
        state.updated_at = datetime.now(timezone.utc)
    else:
        db.add(GroupTypingState(group_id=group_id, user_id=current_user.id))
    db.commit()


@router.delete("/groups/{group_id}/typing", status_code=204)
def clear_typing(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called when the input is cleared/blurred so the indicator doesn't
    linger for the full TYPING_ACTIVE_SECONDS after someone stops typing
    without sending."""
    state = db.query(GroupTypingState).filter(
        GroupTypingState.group_id == group_id,
        GroupTypingState.user_id == current_user.id,
    ).first()
    if state:
        db.delete(state)
        db.commit()


@router.get("/groups/{group_id}/typing", response_model=List[TypingUserOut])
def get_typing(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _require_member(group, current_user)

    cutoff = datetime.now(timezone.utc) - timedelta(seconds=TYPING_ACTIVE_SECONDS)
    rows = (
        db.query(GroupTypingState)
        .options(joinedload(GroupTypingState.user))
        .filter(
            GroupTypingState.group_id == group_id,
            GroupTypingState.user_id != current_user.id,
            GroupTypingState.updated_at >= cutoff,
        )
        .all()
    )
    return [TypingUserOut(id=r.user.id, username=r.user.username) for r in rows]


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
    # Uploader, the owner, or an admin can remove a media item.
    is_admin = any(m.user_id == current_user.id and m.role == GroupRole.admin for m in group.memberships)
    if media.uploaded_by_id != current_user.id and group.owner_id != current_user.id and not is_admin:
        raise HTTPException(403, "You can't remove this media item")

    try:
        _delete_stored_object(GROUP_MEDIA_BUCKET, media.image_url)
    except Exception:
        pass  # best-effort — don't fail the request over a storage cleanup hiccup

    db.delete(media)
    db.commit()


# ── Group cover art (owner or admin, same pattern as profile avatar/cover) ──
@router.post("/groups/{group_id}/cover", response_model=GroupOut)
async def upload_group_cover(
    group_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

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
    membership = _require_member(group, current_user)
    _require_owner_or_admin(group, membership, current_user)

    try:
        _delete_stored_object(GROUP_COVER_BUCKET, group.banner_url)
    except Exception as e:
        raise HTTPException(500, f"Removal failed: {e}")

    group.banner_url = ""
    db.commit()
    group = _get_group_or_404(group_id, db)
    return _serialize_group(group, current_user, db)
