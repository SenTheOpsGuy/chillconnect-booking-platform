from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional, Set
import json
import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    BOOKING_UPDATE = "booking_update"
    CHAT_MESSAGE = "chat_message"
    PAYMENT_UPDATE = "payment_update"
    SYSTEM_NOTIFICATION = "system_notification"
    USER_STATUS = "user_status"

class WebSocketManager:
    def __init__(self):
        # Store active connections: user_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store user info for each websocket
        self.connection_info: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: int, user_role: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.connection_info[websocket] = {
            "user_id": user_id,
            "user_role": user_role,
            "connected_at": datetime.utcnow()
        }
        
        logger.info(f"WebSocket connected for user {user_id} ({user_role})")
        
        # Send initial connection confirmation
        await self.send_personal_message(user_id, {
            "type": "connection_established",
            "message": "Connected to ChillConnect notifications",
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.connection_info:
            user_info = self.connection_info[websocket]
            user_id = user_info["user_id"]
            
            # Remove websocket from user's connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                
                # Remove user entry if no more connections
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove connection info
            del self.connection_info[websocket]
            
            logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, user_id: int, message: dict):
        """Send a message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            connections = self.active_connections[user_id].copy()
            
            for websocket in connections:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    # Remove failed connection
                    self.disconnect(websocket)

    async def send_to_role(self, role: str, message: dict):
        """Send a message to all users with a specific role"""
        for user_id, connections in self.active_connections.items():
            for websocket in connections.copy():
                if websocket in self.connection_info:
                    user_info = self.connection_info[websocket]
                    if user_info["user_role"] == role:
                        try:
                            await websocket.send_text(json.dumps(message))
                        except Exception as e:
                            logger.error(f"Error sending message to {role} user {user_id}: {e}")
                            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected users"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(user_id, message)

    def get_user_count(self) -> int:
        """Get the number of connected users"""
        return len(self.active_connections)

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[int]:
        """Get list of all online user IDs"""
        return list(self.active_connections.keys())

    async def send_booking_notification(self, user_id: int, booking_data: dict):
        """Send booking-related notification"""
        message = {
            "type": NotificationType.BOOKING_UPDATE,
            "data": booking_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(user_id, message)

    async def send_chat_notification(self, user_id: int, chat_data: dict):
        """Send chat message notification"""
        message = {
            "type": NotificationType.CHAT_MESSAGE,
            "data": chat_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(user_id, message)

    async def send_payment_notification(self, user_id: int, payment_data: dict):
        """Send payment-related notification"""
        message = {
            "type": NotificationType.PAYMENT_UPDATE,
            "data": payment_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(user_id, message)

    async def send_system_notification(self, user_id: int, notification_data: dict):
        """Send system notification"""
        message = {
            "type": NotificationType.SYSTEM_NOTIFICATION,
            "data": notification_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(user_id, message)

# Global WebSocket manager instance
websocket_manager = WebSocketManager()

# Helper functions for sending notifications from other parts of the app
async def notify_booking_update(seeker_id: int, provider_id: int, booking_data: dict):
    """Notify both seeker and provider about booking updates"""
    await websocket_manager.send_booking_notification(seeker_id, booking_data)
    await websocket_manager.send_booking_notification(provider_id, booking_data)

async def notify_chat_message(recipient_id: int, sender_name: str, message: str, chat_id: int):
    """Notify user about new chat message"""
    chat_data = {
        "chat_id": chat_id,
        "sender_name": sender_name,
        "message": message,
        "action": "new_message"
    }
    await websocket_manager.send_chat_notification(recipient_id, chat_data)

async def notify_payment_success(user_id: int, amount: int, transaction_type: str):
    """Notify user about successful payment"""
    payment_data = {
        "amount": amount,
        "type": transaction_type,
        "status": "success",
        "action": "payment_completed"
    }
    await websocket_manager.send_payment_notification(user_id, payment_data)

async def notify_system_message(user_id: int, title: str, message: str, severity: str = "info"):
    """Send system notification to user"""
    notification_data = {
        "title": title,
        "message": message,
        "severity": severity,
        "action": "system_message"
    }
    await websocket_manager.send_system_notification(user_id, notification_data)