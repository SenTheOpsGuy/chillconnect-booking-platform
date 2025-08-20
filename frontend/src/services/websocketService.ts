import toast from 'react-hot-toast';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  message?: string;
}

export interface NotificationData {
  title: string;
  message: string;
  type: 'booking' | 'chat' | 'payment' | 'system';
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionStatusHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: number | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionStatusHandlers: Set<ConnectionStatusHandler> = new Set();
  private isConnected = false;

  constructor() {
    this.setupHeartbeat();
  }

  connect(token: string): void {
    this.token = token;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.token) {
      console.error('No token provided for WebSocket connection');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/${this.token}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.notifyConnectionStatus(true);
      
      // Show connection success (only after reconnection, not initial)
      if (this.reconnectAttempts > 0) {
        toast.success('Reconnected to live updates');
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnected = false;
      this.notifyConnectionStatus(false);

      // Don't show error for normal closure or authentication issues
      if (event.code !== 1000 && event.code !== 4001) {
        if (this.reconnectAttempts === 0) {
          toast.error('Connection lost. Attempting to reconnect...');
        }
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle system messages
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established');
        break;

      case 'booking_update':
        this.handleBookingNotification(message.data);
        break;

      case 'chat_message':
        this.handleChatNotification(message.data);
        break;

      case 'payment_update':
        this.handlePaymentNotification(message.data);
        break;

      case 'system_notification':
        this.handleSystemNotification(message.data);
        break;

      case 'typing_indicator':
        // Handle typing indicators for chat
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('WebSocket server error:', message.message);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }

    // Notify all registered handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private handleBookingNotification(data: any): void {
    if (!data) return;

    const { action, booking_id, status } = data;
    let title = 'Booking Update';
    let message = '';
    let severity: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (action) {
      case 'booking_confirmed':
        title = 'Booking Confirmed';
        message = `Your booking #${booking_id} has been confirmed`;
        severity = 'success';
        break;
      case 'booking_cancelled':
        title = 'Booking Cancelled';
        message = `Booking #${booking_id} has been cancelled`;
        severity = 'warning';
        break;
      case 'booking_completed':
        title = 'Booking Completed';
        message = `Booking #${booking_id} has been completed`;
        severity = 'success';
        break;
      default:
        message = `Booking #${booking_id} status updated to ${status}`;
    }

    this.showNotification(title, message, 'booking', severity);
  }

  private handleChatNotification(data: any): void {
    if (!data) return;

    const { sender_name, message } = data;
    
    this.showNotification(
      'New Message',
      `${sender_name}: ${message.length > 50 ? message.substring(0, 50) + '...' : message}`,
      'chat',
      'info'
    );
  }

  private handlePaymentNotification(data: any): void {
    if (!data) return;

    const { amount, type, status, action } = data;
    let title = 'Payment Update';
    let message = '';
    let severity: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (action) {
      case 'payment_completed':
        title = 'Payment Successful';
        message = `${amount} tokens ${type === 'purchase' ? 'purchased' : 'received'} successfully`;
        severity = 'success';
        break;
      case 'payment_failed':
        title = 'Payment Failed';
        message = `Payment of ${amount} tokens failed`;
        severity = 'error';
        break;
      default:
        message = `Payment status: ${status}`;
    }

    this.showNotification(title, message, 'payment', severity);
  }

  private handleSystemNotification(data: any): void {
    if (!data) return;

    const { title, message, severity = 'info' } = data;
    this.showNotification(title, message, 'system', severity);
  }

  private showNotification(title: string, message: string, type: string, severity: string): void {
    const notification: NotificationData = {
      title,
      message,
      type: type as any,
      severity: severity as any,
      timestamp: new Date().toISOString()
    };

    // Show toast notification
    switch (severity) {
      case 'success':
        toast.success(`${title}: ${message}`);
        break;
      case 'error':
        toast.error(`${title}: ${message}`);
        break;
      case 'warning':
        toast(`${title}: ${message}`, { icon: '⚠️' });
        break;
      default:
        toast(`${title}: ${message}`);
    }

    // Store notification in localStorage for persistence
    this.storeNotification(notification);
  }

  private storeNotification(notification: NotificationData): void {
    try {
      const stored = localStorage.getItem('chillconnect_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      // Add new notification at the beginning
      notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }
      
      localStorage.setItem('chillconnect_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      toast.error('Unable to maintain connection. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.createConnection();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  addMessageHandler(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  addConnectionStatusHandler(handler: ConnectionStatusHandler): () => void {
    this.connectionStatusHandlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.connectionStatusHandlers.delete(handler);
    };
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection status handler:', error);
      }
    });
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.messageHandlers.clear();
    this.connectionStatusHandlers.clear();
  }

  // Utility methods for getting stored notifications
  getStoredNotifications(): NotificationData[] {
    try {
      const stored = localStorage.getItem('chillconnect_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  clearStoredNotifications(): void {
    localStorage.removeItem('chillconnect_notifications');
  }

  // Typing indicator methods for chat
  sendTypingIndicator(chatId: number, recipientId: number): void {
    this.sendMessage({
      type: 'typing',
      chat_id: chatId,
      recipient_id: recipientId
    });
  }
}

// Export a singleton instance
export const websocketService = new WebSocketService();
export default websocketService;