/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { notificationAPI } from '../services/api';
import { Notification } from '../types';
import { 
  Bell, BellRing, Check, CheckCheck, Trash2, 
  AlertCircle, Info, CheckCircle, Clock, X, Search, Filter, Eye, BarChart3, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

interface NotificationStats {
  overview: {
    totalNotifications: number;
    readNotifications: number;
    unreadNotifications: number;
  };
  priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  distribution: {
    byType: Array<{ _id: string; count: number }>;
  };
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });

  useEffect(() => {
    fetchNotifications();
  }, []);
  
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchNotifications(1);
  }, [filter]);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchNotifications(1);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchNotifications = async (page = 1) => {
    try {
      const params: any = {
        page,
        limit: pagination.itemsPerPage,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      if (filter !== 'all') {
        params.isRead = filter === 'read';
      }
      
      const response = await notificationAPI.getNotifications(params);
      const notificationsData = response.data.notifications || response.data.data || [];
      setNotifications(notificationsData);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || notificationsData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(notificationsData.length / pagination.itemsPerPage) || 1,
          totalItems: notificationsData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
      // Reset to empty state on error but preserve itemsPerPage
      setNotifications([]);
      setPagination(prev => ({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: prev.itemsPerPage
      }));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === id ? { ...notif, isRead: true } : notif
        )
      );
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      toast.success('Notification deleted');
      // Refresh if current page becomes empty
      const remainingItems = notifications.length - 1;
      const currentPageItems = remainingItems - ((pagination.currentPage - 1) * pagination.itemsPerPage);
      if (currentPageItems <= 0 && pagination.currentPage > 1) {
        fetchNotifications(pagination.currentPage - 1);
      } else {
        fetchNotifications(pagination.currentPage);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'complaint_new':
      case 'complaint_updated':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'complaint_resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'room_allocated':
      case 'room_updated':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'leave_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'leave_rejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'fee_payment':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fee_overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };



  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Memoized stats calculation for better performance
  const stats = useMemo<NotificationStats | null>(() => {
    if (!showStats || notifications.length === 0) return null;
    
    const calculatedStats = notifications.reduce((acc, notification) => {
      acc.total++;
      
      if (notification.isRead) acc.read++;
      else acc.unread++;
      
      // Priority counts
      switch (notification.priority) {
        case 'urgent': acc.urgent++; break;
        case 'high': acc.high++; break;
        case 'medium': acc.medium++; break;
        case 'low': acc.low++; break;
      }
      
      // Type counts
      acc.types[notification.type] = (acc.types[notification.type] || 0) + 1;
      
      return acc;
    }, {
      total: 0, read: 0, unread: 0,
      urgent: 0, high: 0, medium: 0, low: 0,
      types: {} as Record<string, number>
    });
    
    const typeDistribution = Object.entries(calculatedStats.types).map(([type, count]) => ({
      _id: type,
      count
    }));
    
    return {
      overview: {
        totalNotifications: calculatedStats.total,
        readNotifications: calculatedStats.read,
        unreadNotifications: calculatedStats.unread
      },
      priority: {
        urgent: calculatedStats.urgent,
        high: calculatedStats.high,
        medium: calculatedStats.medium,
        low: calculatedStats.low
      },
      distribution: {
        byType: typeDistribution
      }
    };
  }, [showStats, notifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-md transition-colors ${
              showStats
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Toggle Statistics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-primary flex items-center space-x-2"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Panel for All Users */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-800/30">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Notifications</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats.overview?.totalNotifications || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-800/30">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Read</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{stats.overview?.readNotifications || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border dark:border-yellow-800/30">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Unread</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{stats.overview?.unreadNotifications || 0}</p>
            </div>
          </div>
          
          {stats.priority && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority Distribution</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm border dark:border-red-800/30">
                  Urgent: {stats.priority.urgent}
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm border dark:border-orange-800/30">
                  High: {stats.priority.high}
                </span>
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm border dark:border-yellow-800/30">
                  Medium: {stats.priority.medium}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm border dark:border-gray-600">
                  Low: {stats.priority.low}
                </span>
              </div>
            </div>
          )}
          
          {stats.distribution?.byType && stats.distribution.byType.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {stats.distribution.byType.map((item) => (
                  <span key={item._id} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm border dark:border-gray-600">
                    {item._id.replace('_', ' ')}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search notifications by title, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
              />
            </div>
          </div>
          
          {/* Filter Toggle and Results Count */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.totalItems} notification{pagination.totalItems !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                showFilters
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
                >
                  <option value="all">All Notifications</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilter('all');
                  setSearchTerm('');
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search.' : 
               filter === 'unread' ? 'All notifications have been read' : 
               'You have no notifications yet'}
            </p>
          </div>
        ) : (
          notifications.map((notification: Notification) => (
            <div key={notification._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full border dark:border-blue-800/30">
                      New
                    </span>
                  )}
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    notification.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 dark:border-red-800/30' :
                    notification.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 dark:border-orange-800/30' :
                    notification.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 dark:border-yellow-800/30' :
                    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 dark:border-green-800/30'
                  }`}>
                    {notification.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification._id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</span>
                  <span className="text-sm text-gray-900 dark:text-white mt-1 capitalize">{notification.type.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</span>
                  <span className="text-sm text-gray-900 dark:text-white mt-1 capitalize">{notification.priority}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</span>
                  <span className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(notification.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination - Show when items exceed 100 or multiple pages exist */}
      {(pagination.totalItems > 100 || pagination.totalPages > 1 || pagination.currentPage > 1) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchNotifications(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchNotifications(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        pageNum === pagination.currentPage
                          ? 'bg-primary-600 dark:bg-primary-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchNotifications(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmComponent />
    </div>
  );
};

export default Notifications;