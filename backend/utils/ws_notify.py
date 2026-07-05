from fastapi import WebSocket
from typing import Dict
import json

user_sockets: Dict[int, WebSocket] = {}


async def push_to_user(user_id: int, payload: dict) -> None:
    ws = user_sockets.get(user_id)
    if not ws:
        return
    try:
        await ws.send_text(json.dumps(payload))
    except Exception:
        user_sockets.pop(user_id, None)
