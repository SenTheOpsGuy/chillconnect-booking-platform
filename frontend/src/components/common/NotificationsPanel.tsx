import React, { useState } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { NotificationData } from '../../services/websocketService';

interface NotificationsPanelProps {
  notifications: NotificationData[];
  unreadCount: number;
  onMarkAsRead: () => void;
  onClearAll: () => void;
  className?: string;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onClearAll,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark as read when opening the panel
      onMarkAsRead();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return '📅';
      case 'chat':
        return '💬';
      case 'payment':
        return '💳';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'border-green-500 bg-green-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="w-6 h-6 text-sensual-red" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-sensual-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className={`p-4 hover:bg-gray-800 transition-colors border-l-4 ${getSeverityColor(notification.severity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <span className="text-gray-400 text-xs flex-shrink-0 ml-2">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notifications yet</p>
                <p className="text-gray-500 text-sm">You'll see your notifications here</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="p-3 border-t border-gray-700 text-center">
              <button className="text-sensual-red hover:text-sensual-red-light text-sm font-medium">
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationsPanel;