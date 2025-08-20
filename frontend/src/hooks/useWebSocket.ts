import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService, { WebSocketMessage, NotificationData } from '../services/websocketService';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const cleanupRefs = useRef<Array<() => void>>([]);

  const { autoConnect = true, onMessage, onConnectionChange } = options;

  useEffect(() => {
    // Load stored notifications on mount
    const storedNotifications = websocketService.getStoredNotifications();
    setNotifications(storedNotifications);
    
    // Calculate unread count (notifications from the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = storedNotifications.filter(
      n => new Date(n.timestamp) > oneHourAgo
    );
    setUnreadCount(recentNotifications.length);
  }, []);

  useEffect(() => {
    if (!user || !autoConnect) return;

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Connect to WebSocket
    websocketService.connect(token);

    // Set up message handler
    const messageCleanup = websocketService.addMessageHandler((message) => {
      if (onMessage) {
        onMessage(message);
      }

      // Update notifications for certain message types
      if (['booking_update', 'chat_message', 'payment_update', 'system_notification'].includes(message.type)) {
        const updatedNotifications = websocketService.getStoredNotifications();
        setNotifications(updatedNotifications);
        setUnreadCount(prev => prev + 1);
      }
    });

    // Set up connection status handler
    const connectionCleanup = websocketService.addConnectionStatusHandler((connected) => {
      setIsConnected(connected);
      if (onConnectionChange) {
        onConnectionChange(connected);
      }
    });

    // Store cleanup functions
    cleanupRefs.current = [messageCleanup, connectionCleanup];

    // Cleanup on unmount
    return () => {
      cleanupRefs.current.forEach(cleanup => cleanup());
      cleanupRefs.current = [];
    };
  }, [user, autoConnect, onMessage, onConnectionChange]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!user) {
      websocketService.disconnect();
      setIsConnected(false);
    }
  }, [user]);

  const sendMessage = (message: any) => {
    websocketService.sendMessage(message);
  };

  const clearNotifications = () => {
    websocketService.clearStoredNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const sendTypingIndicator = (chatId: number, recipientId: number) => {
    websocketService.sendTypingIndicator(chatId, recipientId);
  };

  return {
    isConnected,
    notifications,
    unreadCount,
    sendMessage,
    clearNotifications,
    markAsRead,
    sendTypingIndicator,
    // Direct access to websocket service for advanced usage
    websocketService
  };
};

export default useWebSocket;