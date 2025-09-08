/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import { complaintAPI } from '../services/api';
import { Complaint } from '../types';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Plus, AlertCircle, Clock, CheckCircle, Eye, Edit, Search, Filter, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

const Complaints: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [viewDetailsComplaint, setViewDetailsComplaint] = useState<Complaint | null>(null);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  
  // Search, Filter, and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  useEffect(() => {
    fetchComplaints();
  }, []);
  
  const fetchStats = async () => {
    try {
      const params: any = {};
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      
      const response = await complaintAPI.getComplaintStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching complaint stats:', error);
      setStats({
        overview: {
          totalComplaints: 0,
          pendingComplaints: 0,
          inProgressComplaints: 0,
          resolvedComplaints: 0,
          rejectedComplaints: 0
        },
        priority: { urgent: 0, high: 0, medium: 0, low: 0 },
        distribution: { byCategory: [] },
        insights: { resolutionRate: 0 }
      });
    }
  };
  
  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, searchTerm, filters]);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchComplaints(1);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchComplaints = async (page = 1) => {
    try {
      const params: any = {
        page,
        limit: pagination.itemsPerPage,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      
      const response = await complaintAPI.getComplaints(params);
      const complaintsData = response.data.data || [];
      setComplaints(complaintsData);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || complaintsData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(complaintsData.length / pagination.itemsPerPage) || 1,
          totalItems: complaintsData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('Failed to fetch complaints');
      // Reset to empty state on error but preserve itemsPerPage
      setComplaints([]);
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

  const handleCreateComplaint = async (formData: any) => {
    try {
      await complaintAPI.createComplaint(formData);
      toast.success('Complaint filed successfully');
      setShowCreateModal(false);
      fetchComplaints(1);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to file complaint');
    }
  };

  const handleUpdateStatus = async (id: string, status: string, remarks?: string) => {
    try {
      await complaintAPI.updateComplaint(id, { status, adminRemarks: remarks });
      toast.success('Complaint updated successfully');
      fetchComplaints(pagination.currentPage);
      setSelectedComplaint(null);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update complaint');
    }
  };

  const handleUpdateComplaint = async (id: string, formData: any) => {
    try {
      await complaintAPI.updateComplaint(id, formData);
      toast.success('Complaint updated successfully');
      fetchComplaints(pagination.currentPage);
      setEditingComplaint(null);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update complaint');
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Complaint',
      message: 'Are you sure you want to delete this complaint?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }
    try {
      await complaintAPI.deleteComplaint(id);
      toast.success('Complaint deleted successfully');
      fetchComplaints(pagination.currentPage);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete complaint');
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedComplaints.length === 0) {
      toast.error('Please select complaints to update');
      return;
    }
    
    const confirmed = await confirm({
      title: 'Bulk Update Status',
      message: `Are you sure you want to update ${selectedComplaints.length} complaint(s) to ${status.replace('_', ' ')}?`,
      confirmText: 'Update',
      type: 'warning'
    });
    
    if (!confirmed) return;
    
    try {
      await complaintAPI.bulkUpdateStatus({
        complaintIds: selectedComplaints,
        status,
        adminRemarks: `Bulk updated to ${status.replace('_', ' ')}`
      });
      toast.success(`${selectedComplaints.length} complaint(s) updated successfully`);
      setSelectedComplaints([]);
      setShowBulkActions(false);
      fetchComplaints(pagination.currentPage);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update complaints');
    }
  };

  const handleSelectComplaint = (id: string) => {
    setSelectedComplaints(prev => 
      prev.includes(id) 
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedComplaints.length === complaints.length) {
      setSelectedComplaints([]);
    } else {
      setSelectedComplaints(complaints.map(c => c._id));
    }
  };

  const CreateComplaintModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: 'maintenance',
      priority: 'medium'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleCreateComplaint(formData);
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">File New Complaint</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="complaint-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Complaint Details Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Complaint Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                      placeholder="Provide detailed information about the complaint"
                    />
                  </div>
                </div>
              </div>

              {/* Classification Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Classification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="cleanliness">Cleanliness</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="security">Security</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      className="input-field"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="complaint-form" className="btn-primary">
              File Complaint
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UpdateStatusModal = () => {
    const [status, setStatus] = useState(selectedComplaint?.status || '');
    const [remarks, setRemarks] = useState(selectedComplaint?.adminRemarks || '');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedComplaint) {
        handleUpdateStatus(selectedComplaint._id, status, remarks);
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-sm modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Update Status</h3>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  className="input-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {user?.role === 'admin' ? 'Admin Remarks' : 'Warden Remarks'}
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const EditComplaintModal = () => {
    const [formData, setFormData] = useState({
      title: editingComplaint?.title || '',
      description: editingComplaint?.description || '',
      category: editingComplaint?.category || 'maintenance',
      priority: editingComplaint?.priority || 'medium'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingComplaint) {
        handleUpdateComplaint(editingComplaint._id, formData);
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Complaint</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="edit-complaint-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Complaint Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                      placeholder="Provide detailed information about the complaint"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Classification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="cleanliness">Cleanliness</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="security">Security</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      className="input-field"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditingComplaint(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="edit-complaint-form" className="btn-primary">
              Update Complaint
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewDetailsModal = ({ complaint }: { complaint: Complaint }) => {
    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Complaint Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <p className="text-sm text-gray-900 dark:text-white">{complaint.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(complaint.status)}
                      <span className="text-sm text-gray-900 dark:text-white capitalize">{complaint.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{complaint.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Description</h4>
                <p className="text-sm text-gray-900 dark:text-white">{complaint.description}</p>
              </div>

              {/* Student & Room Information */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Student & Room Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student Name</label>
                    <p className="text-sm text-gray-900 dark:text-white">{complaint.student?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Number</label>
                    <p className="text-sm text-gray-900 dark:text-white">{complaint.room?.roomNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filed Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {complaint.adminRemarks && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {complaint.remarksRole === 'admin' ? 'Admin Remarks' : 
                     complaint.remarksRole === 'warden' ? 'Warden Remarks' : 'Remarks'}
                    {complaint.remarksBy && (
                      <span className="text-xs font-normal text-gray-600 dark:text-gray-400 ml-2">
                        by {complaint.remarksBy.name}
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white">{complaint.adminRemarks}</p>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => setViewDetailsComplaint(null)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-md transition-colors ${
              showStats
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Toggle Statistics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          {(user?.role === 'admin' || user?.role === 'warden') && complaints.length > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showBulkActions
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Bulk Actions
            </button>
          )}
          {user?.role === 'student' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>File Complaint</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Statistics Panel for All Users */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Complaint Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Complaints</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats.overview?.totalComplaints || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Pending</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{stats.overview?.pendingComplaints || 0}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">In Progress</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">{stats.overview?.inProgressComplaints || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Resolved</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{stats.overview?.resolvedComplaints || 0}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">Resolution Rate</h3>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{stats.insights?.resolutionRate || 0}%</p>
            </div>
          </div>
          
          {stats.distribution?.byCategory && stats.distribution.byCategory.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {stats.distribution.byCategory.map((item: any) => (
                  <span key={item._id} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm capitalize">
                    {item._id}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {stats.priority && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority Distribution</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full text-sm">
                  Urgent: {stats.priority.urgent}
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-full text-sm">
                  High: {stats.priority.high}
                </span>
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full text-sm">
                  Medium: {stats.priority.medium}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                  Low: {stats.priority.low}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search and Filter Section */}
      {(complaints.length > 0 || searchTerm || Object.values(filters).some(f => f)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search complaints by title, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} complaint{pagination.totalItems !== 1 ? 's' : ''} found
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
                {Object.values(filters).some(f => f) && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary-600 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="cleanliness">Cleanliness</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      priority: '',
                      category: ''
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


      
      {/* Bulk Actions Panel */}
      {showBulkActions && (user?.role === 'admin' || user?.role === 'warden') && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedComplaints.length === complaints.length && complaints.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {selectedComplaints.length} of {complaints.length} selected
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedComplaints([]);
                setShowBulkActions(false);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Cancel
            </button>
          </div>
          {selectedComplaints.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">Update selected to:</span>
              <button
                onClick={() => handleBulkStatusUpdate('in_progress')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                In Progress
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('resolved')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Resolved
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('rejected')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Rejected
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Complaints List */}
      <div className="space-y-4">
        {complaints.map((complaint) => (
          <div key={complaint._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                {showBulkActions && (user?.role === 'admin' || user?.role === 'warden') && (
                  <input
                    type="checkbox"
                    checked={selectedComplaints.includes(complaint._id)}
                    onChange={() => handleSelectComplaint(complaint._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}
                {getStatusIcon(complaint.status)}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{complaint.title}</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(complaint.priority)}`}>
                  {complaint.priority.toUpperCase()}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(complaint.status)}`}>
                  {complaint.status.replace('_', ' ').toUpperCase()}
                </span>
                {user?.role === 'student' && complaint.student?._id === user._id && complaint.status === 'pending' && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Editable
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setViewDetailsComplaint(complaint)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-5 w-5" />
                </button>
                {(user?.role === 'admin' || user?.role === 'warden') && (
                  <button
                    onClick={() => setSelectedComplaint(complaint)}
                    className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Update Status"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                {user?.role === 'student' && complaint.student?._id === user._id && complaint.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setEditingComplaint(complaint)}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Complaint"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteComplaint(complaint._id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Complaint"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{complaint.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 capitalize mt-1">{complaint.category}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Room</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{complaint.room?.roomNumber || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{complaint.student?.name || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filed Date</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{new Date(complaint.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {complaint.adminRemarks && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {complaint.remarksRole === 'admin' ? 'Admin Remarks' : 
                       complaint.remarksRole === 'warden' ? 'Warden Remarks' : 'Remarks'}
                      {complaint.remarksBy && (
                        <span className="text-xs font-normal text-amber-700 dark:text-amber-400 ml-2">
                          by {complaint.remarksBy.name}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{complaint.adminRemarks}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
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
                onClick={() => fetchComplaints(pagination.currentPage - 1)}
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
                      onClick={() => fetchComplaints(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        pageNum === pagination.currentPage
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchComplaints(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {complaints.length === 0 && !loading && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No complaints found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : user?.role === 'student' 
                ? 'File your first complaint to get started.' 
                : 'No complaints have been filed yet.'}
          </p>
        </div>
      )}

      {showCreateModal && <CreateComplaintModal />}
      {selectedComplaint && <UpdateStatusModal />}
      {editingComplaint && <EditComplaintModal />}
      {viewDetailsComplaint && <ViewDetailsModal complaint={viewDetailsComplaint} />}
      
      <ConfirmComponent />
    </div>
  );
};

export default Complaints;