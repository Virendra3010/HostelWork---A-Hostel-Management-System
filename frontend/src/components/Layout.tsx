/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { 
  Home, Users, Building, MessageSquare, CreditCard, 
  Calendar, Bell, Settings, LogOut, Menu, X, Building2, ChevronDown, User, Megaphone, Info 
} from 'lucide-react';
import Logo from './Logo';


interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [managementDropdownOpen, setManagementDropdownOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const getNotificationRedirectPath = (notification: any) => {
    console.log('Notification type:', notification.type, 'User role:', user?.role);
    
    switch (notification.type) {
      case 'complaint_new':
      case 'complaint_resolved':
      case 'complaint_updated':
        return '/complaints';
      case 'leave_approved':
      case 'leave_rejected':
      case 'leave_request':
      case 'leave_updated':
        return '/leaves';
      case 'room_allocated':
      case 'room_deallocated':
      case 'room_updated':
      case 'room_added':
      case 'room_deleted':
        if (user?.role === 'student') {
          return '/rooms'; // Students see room listings in their block
        } else if (user?.role === 'admin') {
          return '/users?role=student'; // Admin sees student management for room allocations
        } else {
          return '/rooms'; // Wardens see room management
        }
      case 'student_assigned':
      case 'student_removed':
      case 'student_updated':
      case 'student_activated':
      case 'student_deactivated':
      case 'student_deleted':
        if (user?.role === 'student') {
          return '/users?role=student'; // Students see other students in their block
        } else {
          return '/users?role=student'; // Admin/Warden see student management
        }
      case 'warden_updated':
      case 'warden_activated':
      case 'warden_deactivated':
        if (user?.role === 'student') {
          return '/dashboard'; // Students just see dashboard
        } else {
          return '/dashboard';
        }
      case 'warden_added':
      case 'warden_removed':
        if (user?.role === 'admin') {
          return '/wardens';
        } else {
          return '/dashboard';
        }
      case 'fee_due':
      case 'fee_paid':
      case 'fee_payment':
      case 'fee_overdue':
      case 'fee_generated':
        return '/fees';
      case 'announcement_new':
      case 'announcement_updated':
      case 'announcement_deleted':
        return '/announcements';
      case 'hostel_info_updated':
        return '/about';
      case 'notification_deleted':
        return '/notifications';
      case 'profile_updated':
      case 'account_activated':
      case 'account_deactivated':
        return '/profile';
      case 'system_alert':
      case 'notice_new':
        return '/dashboard';
      default:
        console.log('Default case, notification type:', notification.type);
        return '/notifications';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    const redirectPath = getNotificationRedirectPath(notification);
    console.log('Redirecting to:', redirectPath);
    setNotificationDropdownOpen(false);
    navigate(redirectPath);
  };
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (forceRefresh = false) => {
    try {
      setNotificationsLoading(true);
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      const [unreadResponse, notificationsResponse] = await Promise.all([
        notificationAPI.getUnreadCount(),
        notificationAPI.getNotifications({ page: 1, limit: 8 })
      ]);
      setUnreadCount(unreadResponse.data.count || 0);
      const notificationsList = notificationsResponse.data.data || notificationsResponse.data.notifications || [];
      setNotifications(notificationsList);
      console.log(`Fetched ${notificationsList.length} notifications, ${unreadResponse.data.count || 0} unread`);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications(true);
      const interval = setInterval(() => {
        // Check if any modal is open by looking for modal overlay elements
        const hasOpenModal = document.querySelector('.modal-overlay');
        if (!hasOpenModal) {
          fetchNotifications(false);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notificationDropdownOpen) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [notificationDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Remove read notifications when dropdown closes (disabled to show all notifications)
  // useEffect(() => {
  //   if (!notificationDropdownOpen) {
  //     setTimeout(() => {
  //       setNotifications(prev => prev.filter(n => !n.isRead));
  //     }, 300); // Delay to allow smooth closing animation
  //   }
  // }, [notificationDropdownOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationAPI.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === notificationId);
        return notification && !notification.isRead ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'warden', 'student'] },
    { name: 'My Room', href: '/my-room', icon: Building, roles: ['student'] },
    { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['admin', 'warden', 'student'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'warden', 'student'] },
  ];

  const profileItems = [
    { name: 'My Profile', href: '/profile', icon: User, roles: ['admin', 'warden', 'student'] },
    { name: 'About Hostel', href: '/about', icon: Info, roles: ['admin', 'warden', 'student'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'warden', 'student'] },
  ];

  const managementItems = [
    { name: 'Student Management', href: '/users?role=student', icon: Users, roles: ['admin', 'warden'] },
    { name: 'My Block Students', href: '/users?role=student', icon: Users, roles: ['student'] },
    { name: 'Warden Management', href: '/wardens', icon: Users, roles: ['admin'] },
    { name: 'Room Management', href: '/rooms', icon: Building, roles: ['admin', 'warden'] },
    { name: 'My Block Rooms', href: '/rooms', icon: Building, roles: ['student'] },
  ];

  const requestItems = [
    { name: 'Complaints', href: '/complaints', icon: MessageSquare, roles: ['admin', 'warden', 'student'] },
    { name: 'Leave Requests', href: '/leaves', icon: Calendar, roles: ['admin', 'warden', 'student'] },
    { name: 'Fee Management', href: '/fees', icon: CreditCard, roles: ['admin', 'warden', 'student'] },
  ];

  const filteredManagementItems = managementItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const filteredRequestItems = requestItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const filteredProfileItems = profileItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  // Helper functions to check if dropdown should be highlighted
  const isManagementActive = () => {
    const managementPaths = ['/users', '/wardens', '/rooms'];
    return managementPaths.some(path => location.pathname.startsWith(path));
  };

  const isRequestsActive = () => {
    const requestPaths = ['/complaints', '/leaves', '/fees'];
    return requestPaths.some(path => location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link to="/dashboard" className="hover:scale-105 transition-transform duration-200">
                <Logo size="lg" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === '/dashboard'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              {/* Management Dropdown */}
              {filteredManagementItems.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isManagementActive()
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => setManagementDropdownOpen(!managementDropdownOpen)}
                  >
                    <Users className="h-4 w-4" />
                    <span>Management</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${managementDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {managementDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 z-[60] border border-gray-200/50 dark:border-gray-700/50">
                      <div className="py-2">
                        {filteredManagementItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 mx-2 rounded-lg"
                              onClick={() => setManagementDropdownOpen(false)}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Requests Dropdown */}
              {filteredRequestItems.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isRequestsActive()
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Requests</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${requestDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {requestDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 z-[60] border border-gray-200/50 dark:border-gray-700/50">
                      <div className="py-2">
                        {filteredRequestItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 mx-2 rounded-lg"
                              onClick={() => setRequestDropdownOpen(false)}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Announcements */}
              <Link
                to="/announcements"
                className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith('/announcements')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <Megaphone className="h-4 w-4" />
                <span>Announcements</span>
              </Link>
              

              

              
              {/* My Room (for students only) */}
              {user?.role === 'student' && (
                <Link
                  to="/my-room"
                  className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                    location.pathname.startsWith('/my-room')
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>My Room</span>
                </Link>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationDropdownRef}>
                  <button
                    type="button"
                    className="relative p-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                    onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {notificationDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-96 rounded-xl shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 z-[60] border border-gray-200/50 dark:border-gray-700/50">
                      <div className="py-1">
                        <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notifications</h3>
                            <div className="flex items-center space-x-2">
                              {unreadCount > 0 && (
                                <button
                                  onClick={handleMarkAllAsRead}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  Mark all read
                                </button>
                              )}
                              {notifications.length > 0 && (
                                <button
                                  onClick={handleDeleteAllNotifications}
                                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  Remove all
                                </button>
                              )}
                            </div>
                          </div>
                          {unreadCount > 0 && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto" style={{scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6'}}>
                          {notificationsLoading ? (
                            <div className="px-4 py-8 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
                            </div>
                          ) : (!notifications || notifications.length === 0) ? (
                            <div className="px-6 py-12 text-center">
                              <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                              </div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No notifications yet</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">You'll see updates here when they arrive</p>
                            </div>
                          ) : (
                            (notifications || []).map((notification: any) => {
                              const getNotificationIcon = (type: string) => {
                                switch (type) {
                                  case 'complaint_new':
                                  case 'complaint_resolved':
                                    return '🔧';
                                  case 'leave_approved':
                                  case 'leave_rejected':
                                  case 'leave_request':
                                    return '📅';
                                  case 'room_allocated':
                                  case 'room_deallocated':
                                  case 'room_updated':
                                    return '🏠';
                                  case 'student_assigned':
                                  case 'student_removed':
                                  case 'student_updated':
                                    return '👤';
                                  case 'fee_due':
                                  case 'fee_paid':
                                    return '💰';
                                  case 'notification_deleted':
                                    return '🗑️';
                                  default:
                                    return '📢';
                                }
                              };
                              
                              return (
                                <div
                                  key={notification._id}
                                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-all duration-200 ${
                                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                  }`}
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white pr-2">
                                          {notification.title}
                                        </p>
                                        {!notification.isRead && (
                                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                        {notification.message}
                                      </p>
                                      <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                          {formatTimeAgo(notification.createdAt)}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                                            notification.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 dark:border-red-800/30' :
                                            notification.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 dark:border-orange-800/30' :
                                            notification.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 dark:border-yellow-800/30' :
                                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:border-green-800/30'
                                          }`}>
                                            {notification.priority}
                                          </span>
                                          {!notification.isRead && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(notification._id);
                                              }}
                                              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors p-1 rounded text-xs font-medium"
                                              title="Mark as read"
                                            >
                                              ✓
                                            </button>
                                          )}
                                          <button
                                            onClick={(e) => handleDeleteNotification(notification._id, e)}
                                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
                                            title="Delete notification"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {notifications && notifications.length > 0 && (
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Showing {Math.min(notifications.length, 8)} of {unreadCount > notifications.length ? unreadCount : notifications.length}
                              </span>
                              <Link
                                to="/notifications"
                                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                                onClick={() => setNotificationDropdownOpen(false)}
                              >
                                View all →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 z-[60] border border-gray-200/50 dark:border-gray-700/50">
                      <div className="py-2">
                        {filteredProfileItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 mx-2 rounded-lg"
                              onClick={() => setProfileDropdownOpen(false)}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                        <div className="border-t border-gray-200/50 dark:border-gray-700/50 mt-2 pt-2">
                          <button
                            onClick={() => {
                              handleLogout();
                              setProfileDropdownOpen(false);
                            }}
                            className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 w-full text-left transition-all duration-200 mx-2 rounded-lg"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  type="button"
                  className="p-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-3 pt-3 pb-4 space-y-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  location.pathname === '/dashboard'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              
              {/* Mobile Management Section */}
              {filteredManagementItems.length > 0 && (
                <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-3">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Management
                  </div>
                  {filteredManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              
              {/* Mobile Requests Section */}
              {filteredRequestItems.length > 0 && (
                <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-3">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Requests
                  </div>
                  {filteredRequestItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              
              {/* Announcements */}
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-3">
                <Link
                  to="/announcements"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    location.pathname === '/announcements'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Megaphone className="h-5 w-5" />
                  <span>Announcements</span>
                </Link>
                

                
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    location.pathname === '/notifications'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>Notifications</span>
                </Link>
                
                {/* My Room (for students only) */}
                {user?.role === 'student' && (
                  <Link
                    to="/my-room"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      location.pathname === '/my-room'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building className="h-5 w-5" />
                    <span>My Room</span>
                  </Link>
                )}
              </div>
              
              {/* Mobile Profile Section */}
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-3">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profile
                </div>
                <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg mx-1 mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-base font-medium text-gray-900 dark:text-white">{user?.name}</div>
                  </div>
                </div>
                {filteredProfileItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="flex-1 pt-16">
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>


    </div>
  );
};

export default Layout;