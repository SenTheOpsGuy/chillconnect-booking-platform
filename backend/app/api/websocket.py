from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import json
import logging
from typing import Optional

from app.core.deps import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.services.websocket import websocket_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/{token}")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time notifications"""
    try:
        # Authenticate user from token
        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid authentication token")
            return

        user_email = payload.get("sub")
        if not user_email:
            await websocket.close(code=4001, reason="Invalid token payload")
            return

        # Get user from database
        user = db.query(User).filter(User.email == user_email).first()
        if not user or not user.is_active:
            await websocket.close(code=4001, reason="User not found or inactive")
            return

        # Connect user to WebSocket manager
        await websocket_manager.connect(websocket, user.id, user.role.value)

        try:
            # Keep connection alive and handle incoming messages
            while True:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    await handle_client_message(websocket, user, message, db)
                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }))
                except Exception as e:
                    logger.error(f"Error handling client message: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Error processing message"
                    }))

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user.id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user.id}: {e}")
        finally:
            websocket_manager.disconnect(websocket)

    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        try:
            await websocket.close(code=4001, reason="Authentication failed")
        except:
            pass

async def handle_client_message(websocket: WebSocket, user: User, message: dict, db: Session):
    """Handle incoming messages from WebSocket clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Heartbeat/ping message
        await websocket.send_text(json.dumps({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }))
    
    elif message_type == "status_update":
        # User wants to update their status
        status = message.get("status", "online")
        # Here you could update user status in database if needed
        # For now, just acknowledge
        await websocket.send_text(json.dumps({
            "type": "status_updated",
            "status": status
        }))
    
    elif message_type == "join_room":
        # Client wants to join a specific room (e.g., for chat)
        room_id = message.get("room_id")
        # Implement room-based messaging if needed
        await websocket.send_text(json.dumps({
            "type": "joined_room",
            "room_id": room_id
        }))
    
    elif message_type == "typing":
        # Handle typing indicators for chat
        chat_id = message.get("chat_id")
        recipient_id = message.get("recipient_id")
        
        if recipient_id:
            typing_data = {
                "chat_id": chat_id,
                "user_name": user.profile.name if user.profile else "Unknown",
                "action": "typing"
            }
            await websocket_manager.send_personal_message(recipient_id, {
                "type": "typing_indicator",
                "data": typing_data
            })
    
    else:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }))

@router.get("/online-users")
async def get_online_users():
    """Get list of online user IDs (admin/debugging endpoint)"""
    return {
        "online_users": websocket_manager.get_online_users(),
        "total_count": websocket_manager.get_user_count()
    }

@router.get("/user-status/{user_id}")
async def get_user_status(user_id: int):
    """Check if a specific user is online"""
    return {
        "user_id": user_id,
        "is_online": websocket_manager.is_user_online(user_id)
    }