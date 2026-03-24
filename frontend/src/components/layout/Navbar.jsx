import React, { useState, useEffect, useRef } from 'react';
import { HiBell, HiUserCircle } from 'react-icons/hi';
import { FiPackage, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { notificationsAPI } from '../../services/api';

const NOTIFICATION_ICONS = {
  low_stock: FiAlertTriangle,
  out_of_stock: FiPackage,
  order: FiCheckCircle,
  system: FiInfo,
};
const NOTIFICATION_COLORS = {
  low_stock: 'text-yellow-500',
  out_of_stock: 'text-red-500',
  order: 'text-green-500',
  system: 'text-blue-500',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Navbar = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'customer';

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getNotifications({ limit: 20 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-16">
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <HiBell className="h-6 w-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
                    ) : (
                      notifications.map(n => {
                        const Icon = NOTIFICATION_ICONS[n.type] || FiInfo;
                        const iconColor = NOTIFICATION_COLORS[n.type] || 'text-gray-500';
                        return (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && handleMarkRead(n.id)}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 border-b border-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                          >
                            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.is_read && (
                              <span className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white">
                  {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user.full_name || user.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
                <HiUserCircle className="h-5 w-5 text-gray-600" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <a href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-100">
                    Your Profile
                  </a>
                  <a href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100">
                    Settings
                  </a>
                  <div className="border-t my-2"></div>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.href = '/';
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;