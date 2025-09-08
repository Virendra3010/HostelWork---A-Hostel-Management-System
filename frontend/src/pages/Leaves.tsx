/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import { Leave } from '../types';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, AlertCircle, Clock, CheckCircle, Eye, Edit, X, Search, Filter, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

const Leaves: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [viewDetailsLeave, setViewDetailsLeave] = useState<Leave | null>(null);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  
  // Search, Filter, and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    startDate: '',
    endDate: ''
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

  useEffect(() => {
    fetchLeaves();
  }, []);
  
  const calculateLeaveDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.leaveType) params.leaveType = filters.leaveType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await leaveAPI.getLeaveStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching leave stats:', error);
      setStats({
        overview: {
          totalLeaves: 0,
          pendingLeaves: 0,
          approvedLeaves: 0,
          rejectedLeaves: 0
        },
        leaveTypes: {
          personal: 0, medical: 0, emergency: 0, home: 0, other: 0
        },
        distribution: { byType: [] },
        insights: { approvalRate: 0, avgDuration: 0 }
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
      fetchLeaves(1);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchLeaves = async (page = 1) => {
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
      if (filters.leaveType) params.leaveType = filters.leaveType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await leaveAPI.getLeaves(params);
      const leavesData = response.data.data || [];
      setLeaves(leavesData);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || leavesData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(leavesData.length / pagination.itemsPerPage) || 1,
          totalItems: leavesData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leaves');
      // Reset to empty state on error but preserve itemsPerPage
      setLeaves([]);
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

  const handleCreateLeave = async (formData: any) => {
    try {
      await leaveAPI.createLeave(formData);
      toast.success('Leave application submitted successfully');
      setShowCreateModal(false);
      fetchLeaves(1);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    }
  };

  const handleUpdateStatus = async (id: string, status: string, remarks?: string) => {
    try {
      await leaveAPI.updateLeave(id, { status, adminRemarks: remarks });
      toast.success('Leave status updated successfully');
      fetchLeaves(pagination.currentPage);
      setSelectedLeave(null);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    }
  };

  const handleUpdateLeave = async (id: string, formData: any) => {
    try {
      await leaveAPI.updateLeave(id, formData);
      toast.success('Leave application updated successfully');
      fetchLeaves(pagination.currentPage);
      setEditingLeave(null);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update leave application');
    }
  };

  const handleDeleteLeave = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Leave Application',
      message: 'Are you sure you want to delete this leave application?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }
    try {
      await leaveAPI.deleteLeave(id);
      toast.success('Leave application deleted successfully');
      fetchLeaves(pagination.currentPage);
      if (showStats) fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete leave application');
    }
  };

  const CreateLeaveModal = () => {
    const [formData, setFormData] = useState({
      leaveType: 'personal',
      reason: '',
      startDate: '',
      endDate: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleCreateLeave(formData);
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Apply for Leave</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="leave-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Leave Details Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                    <select
                      className="input-field"
                      value={formData.leaveType}
                      onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                      required
                    >
                      <option value="personal">Personal Leave</option>
                      <option value="medical">Medical Leave</option>
                      <option value="emergency">Emergency Leave</option>
                      <option value="home">Home Visit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      required
                      placeholder="Please provide detailed reason for leave"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Duration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      required
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="leave-form" className="btn-primary">
              Submit Application
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditLeaveModal = () => {
    const [formData, setFormData] = useState({
      leaveType: editingLeave?.leaveType || 'personal',
      reason: editingLeave?.reason || '',
      startDate: editingLeave?.startDate ? new Date(editingLeave.startDate).toISOString().split('T')[0] : '',
      endDate: editingLeave?.endDate ? new Date(editingLeave.endDate).toISOString().split('T')[0] : ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingLeave) {
        handleUpdateLeave(editingLeave._id, formData);
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Leave Application</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="edit-leave-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                    <select
                      className="input-field"
                      value={formData.leaveType}
                      onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                      required
                    >
                      <option value="personal">Personal Leave</option>
                      <option value="medical">Medical Leave</option>
                      <option value="emergency">Emergency Leave</option>
                      <option value="home">Home Visit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      required
                      placeholder="Please provide detailed reason for leave"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Duration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      required
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditingLeave(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="edit-leave-form" className="btn-primary">
              Update Application
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UpdateStatusModal = () => {
    const [status, setStatus] = useState(selectedLeave?.status || '');
    const [remarks, setRemarks] = useState(selectedLeave?.adminRemarks || '');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedLeave) {
        handleUpdateStatus(selectedLeave._id, status, remarks);
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-sm modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Update Leave Status</h3>
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
                  <option value="approved">Approved</option>
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
                  onClick={() => setSelectedLeave(null)}
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

  const ViewDetailsModal = ({ leave }: { leave: Leave }) => {
    const calculateDuration = () => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Leave Application Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Leave Type</label>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{leave.leaveType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(leave.status)}
                      <span className="text-sm text-gray-900 dark:text-white capitalize">{leave.status}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                    <p className="text-sm text-gray-900 dark:text-white">{calculateDuration()} days</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Applied Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(leave.startDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Leave Period */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(leave.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(leave.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Reason</h4>
                <p className="text-sm text-gray-900 dark:text-white">{leave.reason}</p>
              </div>

              {/* Student & Room Information */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Student & Room Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student Name</label>
                    <p className="text-sm text-gray-900 dark:text-white">{leave.student?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Number</label>
                    <p className="text-sm text-gray-900 dark:text-white">{leave.room?.roomNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Admin Remarks */}
              {leave.adminRemarks && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {leave.remarksRole === 'admin' ? 'Admin Remarks' : 
                     leave.remarksRole === 'warden' ? 'Warden Remarks' : 'Remarks'}
                    {leave.remarksBy && (
                      <span className="text-xs font-normal text-gray-600 dark:text-gray-400 ml-2">
                        by {leave.remarksBy.name}
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white">{leave.adminRemarks}</p>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end">
            <button
              onClick={() => setViewDetailsLeave(null)}
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
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'medical':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'emergency':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300';
      case 'personal':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'home':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Applications</h1>
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
          {user?.role === 'student' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Statistics Panel for All Users */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leave Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Leaves</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats.overview?.totalLeaves || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Pending</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{stats.overview?.pendingLeaves || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Approved</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{stats.overview?.approvedLeaves || 0}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Rejected</h3>
              <p className="text-2xl font-bold text-red-900 dark:text-red-200">{stats.overview?.rejectedLeaves || 0}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">Approval Rate</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">{stats.insights?.approvalRate || 0}%</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">Avg Duration</h3>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{stats.insights?.avgDuration || 0} days</p>
            </div>
          </div>
          
          {stats.distribution?.byType && stats.distribution.byType.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Leave Type Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {stats.distribution.byType.map((item: any) => (
                  <span key={item._id} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm capitalize">
                    {item._id}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {stats.leaveTypes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detailed Type Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                  Personal: {stats.leaveTypes.personal}
                </span>
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full text-sm">
                  Medical: {stats.leaveTypes.medical}
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-full text-sm">
                  Emergency: {stats.leaveTypes.emergency}
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm">
                  Home: {stats.leaveTypes.home}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                  Other: {stats.leaveTypes.other}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search and Filter Section */}
      {(leaves.length > 0 || searchTerm || Object.values(filters).some(f => f)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search leaves by reason, type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} leave{pagination.totalItems !== 1 ? 's' : ''} found
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                  <select
                    value={filters.leaveType}
                    onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="personal">Personal</option>
                    <option value="medical">Medical</option>
                    <option value="emergency">Emergency</option>
                    <option value="home">Home Visit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date From</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date To</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      leaveType: '',
                      startDate: '',
                      endDate: ''
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

      {/* Leaves List */}
      <div className="space-y-4">
        {leaves.map((leave) => (
          <div key={leave._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(leave.status)}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">{leave.leaveType} Leave</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                  {leave.leaveType.toUpperCase()}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                  {leave.status.toUpperCase()}
                </span>
                {user?.role === 'student' && leave.student?._id === user._id && leave.status === 'pending' && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Editable
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setViewDetailsLeave(leave)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-5 w-5" />
                </button>
                {(user?.role === 'admin' || user?.role === 'warden') && (
                  <button
                    onClick={() => setSelectedLeave(leave)}
                    className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Update Status"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                {user?.role === 'student' && leave.student?._id === user._id && leave.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setEditingLeave(leave)}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Leave Application"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLeave(leave._id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Leave Application"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{leave.reason}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Start Date</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{new Date(leave.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">End Date</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{new Date(leave.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{calculateLeaveDuration(leave.startDate, leave.endDate)} days</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{leave.student?.name || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Room</span>
                <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{leave.room?.roomNumber || 'N/A'}</span>
              </div>
            </div>
            
            {leave.adminRemarks && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {leave.remarksRole === 'admin' ? 'Admin Remarks' : 
                       leave.remarksRole === 'warden' ? 'Warden Remarks' : 'Remarks'}
                      {leave.remarksBy && (
                        <span className="text-xs font-normal text-amber-700 dark:text-amber-400 ml-2">
                          by {leave.remarksBy.name}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{leave.adminRemarks}</p>
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
                onClick={() => fetchLeaves(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      onClick={() => fetchLeaves(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        pageNum === pagination.currentPage
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchLeaves(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {leaves.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leave applications found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : user?.role === 'student' 
                ? 'Apply for your first leave to get started.' 
                : 'No leave applications have been submitted yet.'}
          </p>
        </div>
      )}

      {showCreateModal && <CreateLeaveModal />}
      {selectedLeave && <UpdateStatusModal />}
      {editingLeave && <EditLeaveModal />}
      {viewDetailsLeave && <ViewDetailsModal leave={viewDetailsLeave} />}
      
      <ConfirmComponent />
    </div>
  );
};

export default Leaves;