import asyncio
import logging
from typing import Any
import socketio

logger = logging.getLogger(__name__)

# Socket.IO Async Server supporting both WebSockets and HTTP long-polling fallback
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    ping_timeout=30,
    ping_interval=15,
)

_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Stores reference to the main asyncio event loop for thread-safe cross-thread emissions."""
    global _main_loop
    _main_loop = loop


def get_main_loop() -> asyncio.AbstractEventLoop | None:
    return _main_loop


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
    """Handles incoming client connection and assigns appropriate room memberships."""
    logger.info(f"[Socket.IO] Client connected: {sid}")
    await sio.enter_room(sid, "all_clients")

    # If client passed auth credentials, join role-based rooms
    if isinstance(auth, dict):
        role = str(auth.get("role", "")).lower()
        if role in ["officer", "vc", "admin"]:
            await sio.enter_room(sid, "staff_channel")
            logger.info(f"[Socket.IO] Client {sid} joined staff_channel as {role}")
        if role in ["vc", "admin"]:
            await sio.enter_room(sid, "vc_channel")
            logger.info(f"[Socket.IO] Client {sid} joined vc_channel")

    return True


@sio.event
async def disconnect(sid: str) -> None:
    """Handles client disconnection."""
    logger.info(f"[Socket.IO] Client disconnected: {sid}")


@sio.on("join_room")
async def handle_join_room(sid: str, data: dict) -> None:
    """Allows clients to subscribe to specific rooms (e.g., staff_channel, app_{id})."""
    room = data.get("room")
    if room:
        await sio.enter_room(sid, room)
        logger.info(f"[Socket.IO] Client {sid} joined room: {room}")


@sio.on("leave_room")
async def handle_leave_room(sid: str, data: dict) -> None:
    """Allows clients to unsubscribe from specific rooms."""
    room = data.get("room")
    if room:
        await sio.leave_room(sid, room)
        logger.info(f"[Socket.IO] Client {sid} left room: {room}")


@sio.on("ping_check")
async def handle_ping_check(sid: str, data: Any = None) -> dict:
    """Heartbeat response for health checks."""
    return {"status": "pong", "sid": sid}


def emit_realtime_event(event: str, data: Any, room: str | None = None) -> None:
    """Thread-safe synchronous emitter that safely schedules sio.emit on the running asyncio loop."""
    try:
        current_loop = None
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        target_loop = current_loop or _main_loop
        if current_loop and current_loop.is_running():
            current_loop.create_task(sio.emit(event, data, room=room))
        elif target_loop and target_loop.is_running():
            asyncio.run_coroutine_threadsafe(sio.emit(event, data, room=room), target_loop)
        elif target_loop:
            target_loop.run_until_complete(sio.emit(event, data, room=room))
        else:
            logger.warning(f"[Socket.IO] No event loop available to emit event {event}")
    except Exception as e:
        logger.error(f"[Socket.IO] Failed to emit event {event}: {e}")
