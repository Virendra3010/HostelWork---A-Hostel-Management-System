/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { announcementAPI, roomAPI } from '../services/api';
import { Announcement } from '../types';
import { 
  Plus, Edit, Trash2, Eye, Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Megaphone, Clock, Users, AlertTriangle, AlertCircle, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AnnouncementStats {
  overview: {
    total: number;
    active: number;
    expired: number;
    inactive: number;
  };
  byPriority: Record<string, number>;
  byAudience: Record<string, number>;
}



const Announcements: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNext: false,
    hasPrev: false
  });
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    priority: '',
    targetAudience: '',
    active: 'true',
    expired: ''
  });
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewDetailsAnnouncement, setViewDetailsAnnouncement] = useState<Announcement | null>(null);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    targetBlocks: [] as string[],
    priority: 'medium',
    expiresAt: ''
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchAvailableBlocks();
    if (user?.role === 'admin' || user?.role === 'warden') {
      fetchStats();
    }
  }, []);

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, searchTerm, filters]);

  useEffect(() => {
    // Mark as interacted when any filter is applied or search is used
    if (searchTerm || Object.values(filters).some(f => f && f !== 'true')) {
      setHasInteracted(true);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchAnnouncements(1);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchAvailableBlocks = async () => {
    try {
      const response = await roomAPI.getAvailableBlocks();
      console.log('Available blocks response:', response.data);
      setAvailableBlocks(response.data.blocks || []);
    } catch (error) {
      console.error('Error fetching available blocks:', error);
      // Fallback: try to get blocks from existing rooms data if available
      try {
        const roomsResponse = await roomAPI.getRooms({ limit: 100 });
        const rooms = roomsResponse.data.data || [];
        const blockSet = new Set(rooms.map((room: any) => room.block).filter(Boolean));
        const blocks = Array.from(blockSet) as string[];
        blocks.sort();
        setAvailableBlocks(blocks);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.priority) params.priority = filters.priority;
      if (filters.targetAudience) params.targetAudience = filters.targetAudience;
      if (filters.active) params.active = filters.active;
      if (filters.expired) params.expired = filters.expired;
      
      const response = await announcementAPI.getAnnouncementStats(params);
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Error fetching announcement stats:', error);
      setStats({
        overview: {
          total: 0,
          active: 0,
          expired: 0,
          inactive: 0
        },
        byPriority: {},
        byAudience: {}
      });
    }
  };

  const fetchAnnouncements = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pagination.itemsPerPage
      };
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.priority) params.priority = filters.priority;
      if (filters.targetAudience) params.targetAudience = filters.targetAudience;
      if (filters.active) params.active = filters.active;
      if (filters.expired) params.expired = filters.expired;
      
      const response = user?.role === 'student' 
        ? await announcementAPI.getAnnouncements(params)
        : await announcementAPI.getAllAnnouncements(params);
      
      const announcements = response.data.announcements || [];
      setAnnouncements(announcements);
      setAllAnnouncements(announcements);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || announcements.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage,
          hasNext: response.data.pagination.hasNext || false,
          hasPrev: response.data.pagination.hasPrev || false
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(announcements.length / pagination.itemsPerPage) || 1,
          totalItems: announcements.length,
          itemsPerPage: pagination.itemsPerPage,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (error) {
      console.error('Fetch announcements error:', error);
      toast.error('Failed to fetch announcements');
      // Reset to empty state on error but preserve itemsPerPage
      setAnnouncements([]);
      setAllAnnouncements([]);
      setPagination(prev => ({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: prev.itemsPerPage,
        hasNext: false,
        hasPrev: false
      }));
    } finally {
      setLoading(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnnouncement) {
        await announcementAPI.updateAnnouncement(editingAnnouncement._id, formData);
        toast.success('Announcement updated successfully');
      } else {
        await announcementAPI.createAnnouncement(formData);
        toast.success('Announcement created successfully');
      }
      resetForm();
      fetchAnnouncements(1);
      if (showStats) fetchStats();
    } catch (error) {
      toast.error('Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await announcementAPI.deleteAnnouncement(id);
        toast.success('Announcement deleted successfully');
        fetchAnnouncements(pagination.currentPage);
        if (showStats) fetchStats();
      } catch (error) {
        toast.error('Failed to delete announcement');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      targetAudience: 'all',
      targetBlocks: [],
      priority: 'medium',
      expiresAt: ''
    });
    setShowCreateModal(false);
    setEditingAnnouncement(null);
    setViewDetailsAnnouncement(null);
  };

  const startEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      targetAudience: announcement.targetAudience,
      targetBlocks: announcement.targetBlocks,
      priority: announcement.priority,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : ''
    });
    setEditingAnnouncement(announcement);
    setShowCreateModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'all': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'students': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'wardens': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'specific_blocks': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };



  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    fetchAnnouncements(newPage);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };



  const canCreateAnnouncement = user?.role === 'admin' || user?.role === 'warden';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay updated with important announcements</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-md transition-colors ${
              showStats
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle Statistics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          {canCreateAnnouncement && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Announcement</span>
            </button>
          )}
        </div>
      </div>



      {/* Statistics Panel for All Users */}
      {showStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Announcement Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Announcements</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats?.overview?.total || announcements.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Active</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{stats?.overview?.active || announcements.filter(a => a.isActive).length}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Expired</h3>
              <p className="text-2xl font-bold text-red-900 dark:text-red-200">{stats?.overview?.expired || announcements.filter(a => a.expiresAt && new Date(a.expiresAt) < new Date()).length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300">Inactive</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-200">{stats?.overview?.inactive || announcements.filter(a => !a.isActive).length}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(stats?.byPriority && Object.keys(stats.byPriority).length > 0) ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Priority</h3>
                <div className="space-y-1">
                  {Object.entries(stats.byPriority).map(([priority, count]: [string, any]) => (
                    <div key={priority} className="flex justify-between text-sm">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{priority}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Priority</h3>
                <div className="space-y-1">
                  {(() => {
                    const priorityCounts: {[key: string]: number} = {};
                    announcements.forEach(announcement => {
                      priorityCounts[announcement.priority] = (priorityCounts[announcement.priority] || 0) + 1;
                    });
                    return Object.entries(priorityCounts).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{priority}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            
            {(stats?.byAudience && Object.keys(stats.byAudience).length > 0) ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Audience</h3>
                <div className="space-y-1">
                  {Object.entries(stats.byAudience).map(([audience, count]: [string, any]) => (
                    <div key={audience} className="flex justify-between text-sm">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{audience.replace('_', ' ')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Audience</h3>
                <div className="space-y-1">
                  {(() => {
                    const audienceCounts: {[key: string]: number} = {};
                    announcements.forEach(announcement => {
                      audienceCounts[announcement.targetAudience] = (audienceCounts[announcement.targetAudience] || 0) + 1;
                    });
                    return Object.entries(audienceCounts).map(([audience, count]) => (
                      <div key={audience} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{audience.replace('_', ' ')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      {(hasInteracted || announcements.length > 0 || (stats && stats.overview.total > 0)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search announcements by title or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} announcement{pagination.totalItems !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors relative ${
                  showFilters
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {Object.values(filters).some(f => f && f !== 'true') && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary-600 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                  <select
                    value={filters.targetAudience}
                    onChange={(e) => setFilters({...filters, targetAudience: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Audiences</option>
                    <option value="all">All Users</option>
                    <option value="students">Students</option>
                    <option value="wardens">Wardens</option>
                    <option value="specific_blocks">Specific Blocks</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.active}
                    onChange={(e) => setFilters({...filters, active: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                    <option value="">All Status</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration</label>
                  <select
                    value={filters.expired}
                    onChange={(e) => setFilters({...filters, expired: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Announcements</option>
                    <option value="false">Not Expired</option>
                    <option value="true">Expired</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      priority: '',
                      targetAudience: '',
                      active: 'true',
                      expired: ''
                    });
                    setSearchTerm('');
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                    if (showStats) fetchStats();
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading announcements...</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No announcements found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || Object.values(filters).some(v => v && v !== 'true') 
                    ? 'Try adjusting your search or filters.' 
                    : canCreateAnnouncement 
                      ? 'Create your first announcement to get started.' 
                      : 'No announcements have been posted yet.'}
                </p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{announcement.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                            {announcement.priority.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTargetAudienceColor(announcement.targetAudience)}`}>
                            {announcement.targetAudience === 'specific_blocks' ? 'SPECIFIC BLOCKS' : announcement.targetAudience.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setViewDetailsAnnouncement(announcement)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {canCreateAnnouncement && (announcement.author?._id === user?._id || user?.role === 'admin') && (
                        <>
                          <button
                            onClick={() => startEdit(announcement)}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement._id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed line-clamp-3">{announcement.content}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Author</span>
                      <span className="text-sm text-gray-900 dark:text-white mt-1">{announcement.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
                      <span className="text-sm text-gray-900 dark:text-white mt-1">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target</span>
                      <span className="text-sm text-gray-900 dark:text-white mt-1 capitalize">
                        {announcement.targetAudience === 'specific_blocks' ? `Blocks: ${announcement.targetBlocks.join(', ')}` : announcement.targetAudience}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expires</span>
                      <span className="text-sm text-gray-900 dark:text-white mt-1">
                        {announcement.expiresAt ? new Date(announcement.expiresAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                  
                  {(() => {
                    if (!announcement.expiresAt) return null;
                    const expiryDate = new Date(announcement.expiresAt);
                    const isExpired = expiryDate < new Date();
                    if (!isExpired) return null;
                    
                    return (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">Expired Announcement</p>
                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">This announcement expired on {expiryDate.toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                    onClick={() => fetchAnnouncements(pagination.currentPage - 1)}
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
                          onClick={() => fetchAnnouncements(pageNum)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            pageNum === pagination.currentPage
                              ? 'bg-primary-600 dark:bg-primary-700 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => fetchAnnouncements(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="announcement-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter announcement title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                      <textarea
                        required
                        rows={4}
                        className="input-field"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Enter announcement content"
                      />
                    </div>
                  </div>
                </div>

                {/* Targeting & Priority Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Targeting & Priority</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                      <select
                        className="input-field"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as 'all' | 'students' | 'wardens' | 'specific_blocks' })}
                      >
                        <option value="all">All Users</option>
                        <option value="students">Students Only</option>
                        <option value="wardens">Wardens Only</option>
                        <option value="specific_blocks">Specific Blocks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                      <select
                        className="input-field"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  {formData.targetAudience === 'specific_blocks' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Blocks</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-700">
                        {availableBlocks.length > 0 ? (
                          availableBlocks.map(block => (
                            <label key={block} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formData.targetBlocks.includes(block)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      targetBlocks: [...formData.targetBlocks, block]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      targetBlocks: formData.targetBlocks.filter(b => b !== block)
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Block {block}</span>
                            </label>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No blocks available</p>
                          </div>
                        )}
                      </div>
                      {formData.targetBlocks.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Selected: {formData.targetBlocks.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Schedule Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Schedule</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires At (Optional)</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" form="announcement-form" className="btn-primary">
                {editingAnnouncement ? 'Update' : 'Create'} Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewDetailsAnnouncement && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Announcement Details</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                      <p className="text-sm text-gray-900 dark:text-white">{viewDetailsAnnouncement.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getPriorityColor(viewDetailsAnnouncement.priority)}`}>
                        {viewDetailsAnnouncement.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Author</label>
                      <p className="text-sm text-gray-900 dark:text-white">{viewDetailsAnnouncement.author?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created Date</label>
                      <p className="text-sm text-gray-900 dark:text-white">{new Date(viewDetailsAnnouncement.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content</h4>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{viewDetailsAnnouncement.content}</p>
                </div>

                {/* Targeting Information */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Targeting Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Audience</label>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getTargetAudienceColor(viewDetailsAnnouncement.targetAudience)}`}>
                        {viewDetailsAnnouncement.targetAudience === 'specific_blocks' ? 'SPECIFIC BLOCKS' : viewDetailsAnnouncement.targetAudience.toUpperCase()}
                      </span>
                    </div>
                    {viewDetailsAnnouncement.targetAudience === 'specific_blocks' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Blocks</label>
                        <p className="text-sm text-gray-900 dark:text-white">{viewDetailsAnnouncement.targetBlocks.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule Information */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Schedule Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                      <p className="text-sm text-gray-900 dark:text-white">{viewDetailsAnnouncement.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expires At</label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {viewDetailsAnnouncement.expiresAt ? new Date(viewDetailsAnnouncement.expiresAt).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setViewDetailsAnnouncement(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmComponent />
    </div>
  );
};

export default Announcements;