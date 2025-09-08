/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */


import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { User } from '../types';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Copy, Grid3X3, List, Info, UserCheck, UserX, Search, Filter, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

const Wardens: React.FC = () => {
  const { confirm, ConfirmComponent } = useConfirm();
  const [wardens, setWardens] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarden, setSelectedWarden] = useState<User | null>(null);
  const [showCredentials, setShowCredentials] = useState<{email: string, password: string} | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [viewDetailsWarden, setViewDetailsWarden] = useState<User | null>(null);
  
  // Search, Filter, and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    assignedBlocks: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [showFilters, setShowFilters] = useState(false);
  const [allWardens, setAllWardens] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);


  useEffect(() => {
    fetchWardens();
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await userAPI.getWardenStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching warden stats:', error);
      // Set fallback stats to show the panel
      const allBlocks = wardens.flatMap(w => w.assignedBlocks || []);
      const uniqueBlocks = Array.from(new Set(allBlocks));
      
      setStats({
        overview: {
          totalWardens: wardens.length,
          activeWardens: wardens.filter(w => w.isActive).length,
          blocksManaged: uniqueBlocks.length
        },
        insights: {
          avgBlocksPerWarden: wardens.length > 0 ? (wardens.reduce((sum, w) => sum + (w.assignedBlocks?.length || 0), 0) / wardens.length).toFixed(1) : 0
        },
        distribution: {
          byBlock: uniqueBlocks.map(block => ({
            _id: block,
            count: wardens.filter(w => w.assignedBlocks?.includes(block)).length
          }))
        }
      });
    }
  };
  
  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, wardens]);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchWardens(1); // Reset to first page on search/filter change
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchWardens = async (page = 1) => {
    try {
      const params: any = {
        page,
        limit: pagination.itemsPerPage
      };
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.assignedBlocks) params.assignedBlocks = filters.assignedBlocks;
      
      console.log('Fetching wardens with params:', params);
      const response = await userAPI.getWardens(params);
      console.log('API response:', response.data);
      
      const wardensData = response.data.data || [];
      setWardens(wardensData);
      setAllWardens(wardensData);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || wardensData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(wardensData.length / pagination.itemsPerPage) || 1,
          totalItems: wardensData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching wardens:', error);
      toast.error('Failed to fetch wardens');
      // Reset to empty state on error but preserve itemsPerPage
      setWardens([]);
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

  const handleCreateWarden = async (formData: any) => {
    try {
      const response = await userAPI.createWarden(formData);
      toast.success('Warden created successfully');
      setShowCredentials({ email: formData.email, password: formData.password });
      setShowCreateModal(false);
      fetchWardens(1); // Refresh and go to first page
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create warden';
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Warden`,
      message: `Are you sure you want to ${action} this warden?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      type: currentStatus ? 'warning' : 'info'
    });
    
    if (confirmed) {
      try {
        await userAPI.updateUser(id, { isActive: !currentStatus });
        toast.success(`Warden ${action}d successfully`);
        fetchWardens(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || `Failed to ${action} warden`);
      }
    }
  };

  const handleUpdateWarden = async (id: string, formData: any) => {
    try {
      // Remove password if empty to avoid validation issues
      const updateData = { ...formData };
      if (!updateData.password || updateData.password === '') {
        delete updateData.password;
      }
      
      await userAPI.updateUser(id, updateData);
      toast.success('Warden updated successfully');
      setSelectedWarden(null);
      fetchWardens(pagination.currentPage); // Refresh current page
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update warden';
      toast.error(errorMessage);
    }
  };

  const handleDeleteWarden = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Warden',
      message: 'Are you sure you want to delete this warden?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await userAPI.deleteUser(id);
        toast.success('Warden deleted successfully');
        fetchWardens(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete warden');
      }
    }
  };

  const WardenModal = ({ warden, onClose, onSubmit }: { warden?: User; onClose: () => void; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      name: warden?.name || '',
      email: warden?.email || '',
      phone: warden?.phone || '',
      password: warden ? '' : 'warden123',
      role: 'warden',
      wardenId: warden?.wardenId || '',
      assignedBlocks: warden?.assignedBlocks || [],
      isActive: warden?.isActive ?? true
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const handleBlockChange = (block: string, checked: boolean) => {
      if (checked) {
        if (formData.assignedBlocks.length >= 2) {
          toast.error('A warden can be assigned to maximum 2 blocks');
          return;
        }
        setFormData({...formData, assignedBlocks: [...formData.assignedBlocks, block]});
      } else {
        setFormData({...formData, assignedBlocks: formData.assignedBlocks.filter(b => b !== block)});
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {warden ? 'Edit Warden' : 'Add New Warden'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="warden-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      placeholder="warden@college.edu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                      placeholder="10-digit phone number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                    />
                  </div>
                  {!warden && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input-field pr-10"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                          placeholder="Set login password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warden Information Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Warden Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warden ID</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.wardenId}
                      onChange={(e) => setFormData({...formData, wardenId: e.target.value})}
                      required
                      placeholder="W001"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned Blocks Section */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Assigned Blocks 
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({formData.assignedBlocks.length}/2 selected)</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['A', 'B', 'C', 'D'].map(block => (
                    <label key={block} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.assignedBlocks.includes(block)}
                        onChange={(e) => handleBlockChange(block, e.target.checked)}
                        disabled={!formData.assignedBlocks.includes(block) && formData.assignedBlocks.length >= 2}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className={`text-sm ${
                        !formData.assignedBlocks.includes(block) && formData.assignedBlocks.length >= 2 
                          ? 'text-gray-400 dark:text-gray-500' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>Block {block}</span>
                    </label>
                  ))}
                </div>
                {formData.assignedBlocks.length >= 2 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    Maximum 2 blocks can be assigned to a warden
                  </p>
                )}
              </div>

              {/* Status Section */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account Status</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Active Warden Account
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inactive accounts cannot login to the system</p>
              </div>
            </form>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button 
                type="submit" 
                form="warden-form"
                className="btn-primary"
              >
                {warden ? 'Update Warden' : 'Create Warden'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CredentialsModal = ({ credentials, onClose }: { credentials: {email: string, password: string}, onClose: () => void }) => {
    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        toast.error('Failed to copy to clipboard');
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-sm modal-container animate-in p-6">
          <h3 className="text-lg font-medium mb-4 text-green-600 dark:text-green-400">Warden Created Successfully!</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Please share these login credentials with the warden:</p>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={credentials.email}
                    readOnly
                    className="input-field flex-1 bg-white dark:bg-gray-600"
                  />
                  <button
                    onClick={() => copyToClipboard(credentials.email)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Copy email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={credentials.password}
                    readOnly
                    className="input-field flex-1 bg-white dark:bg-gray-600 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(credentials.password)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> Make sure to securely share these credentials with the warden. 
                They can use these to login to the HostelWork system.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="btn-primary">
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewDetailsModal = ({ warden, onClose }: { warden: User, onClose: () => void }) => {
    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Warden Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{warden.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{warden.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{warden.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      warden.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {warden.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warden Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Warden Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Warden ID</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{warden.wardenId || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{warden.role}</p>
                  </div>
                </div>
              </div>

              {/* Assigned Blocks */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assigned Blocks</h4>
                {warden.assignedBlocks && warden.assignedBlocks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {warden.assignedBlocks.map((block, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                        Block {block}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No blocks assigned</p>
                )}
              </div>

              {/* System Information */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User ID</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{warden._id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{warden.createdAt ? new Date(warden.createdAt).toLocaleDateString() : 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-end">
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Remove unused variable
  // const filteredWardens = wardens;

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warden Management</h1>
        <div className="flex items-center space-x-3">
          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-md transition-colors ${
              showStats
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle Statistics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Warden</span>
          </button>
        </div>
      </div>
      
      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Warden Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Wardens</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.overview?.totalWardens || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Active Wardens</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.overview?.activeWardens || 0}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Blocks Managed</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.overview?.blocksManaged || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Avg Blocks/Warden</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.insights?.avgBlocksPerWarden || 0}</p>
            </div>
          </div>
          
          {stats.distribution?.byBlock && stats.distribution.byBlock.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Block Coverage</h3>
              <div className="flex flex-wrap gap-2">
                {stats.distribution.byBlock.map((item: any) => (
                  <span key={item._id} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                    Block {item._id}: {item.count} warden{item.count !== 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search and Filter Section - Only show if there are wardens */}
      {(allWardens.length > 0 || searchTerm || Object.values(filters).some(f => f)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search wardens by name, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} warden{pagination.totalItems !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors relative ${
                  showFilters
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Blocks</label>
                  <select
                    value={filters.assignedBlocks}
                    onChange={(e) => setFilters({...filters, assignedBlocks: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Blocks</option>
                    <option value="A">Block A</option>
                    <option value="B">Block B</option>
                    <option value="C">Block C</option>
                    <option value="D">Block D</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      assignedBlocks: ''
                    });
                    setSearchTerm('');
                    // Immediately fetch data with cleared filters
                    setTimeout(() => fetchWardens(1), 100);
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



      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Warden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Assigned Blocks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {wardens.map((warden) => (
                  <tr key={warden._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{warden.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">ID: {warden.wardenId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{warden.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{warden.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {warden.assignedBlocks?.map(block => (
                          <span key={block} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            Block {block}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        warden.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {warden.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewDetailsWarden(warden)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedWarden(warden)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit Warden"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(warden._id, warden.isActive)}
                          className={warden.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                          title={warden.isActive ? 'Deactivate Warden' : 'Activate Warden'}
                        >
                          {warden.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteWarden(warden._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Warden"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardens.map((warden) => (
            <div key={warden._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg dark:hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-500 transition-all duration-200">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 dark:text-white font-semibold text-xs">
                        {warden.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{warden.name}</h3>
                      {warden.wardenId && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">ID: {warden.wardenId}</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    warden.isActive ? 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white' : 'bg-red-100 dark:bg-red-600 text-red-700 dark:text-white'
                  }`}>
                    {warden.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Contact */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 border dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Contact</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{warden.email}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{warden.phone}</p>
                </div>

                {/* Assigned Blocks */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-md p-3 border dark:border-blue-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-blue-200 mb-2">Assigned Blocks</p>
                  {warden.assignedBlocks && warden.assignedBlocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {warden.assignedBlocks.map((block, index) => (
                        <span key={index} className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500 text-white">
                          Block {block}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No blocks assigned</p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={() => setViewDetailsWarden(warden)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="View Details"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedWarden(warden)}
                    className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                    title="Edit Warden"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(warden._id, warden.isActive)}
                    className={`p-1.5 rounded transition-colors ${
                      warden.isActive 
                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-100' 
                        : 'text-green-600 hover:text-green-700 hover:bg-green-100'
                    }`}
                    title={warden.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {warden.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteWarden(warden._id)}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                    title="Delete Warden"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination - Show when items exceed 100 or multiple pages exist */}
      {(pagination.totalItems > 100 || pagination.totalPages > 1 || pagination.currentPage > 1) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchWardens(pagination.currentPage - 1)}
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
                      onClick={() => fetchWardens(pageNum)}
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
                onClick={() => fetchWardens(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {wardens.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No wardens found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by creating a new warden.'}
          </p>
        </div>
      )}

      {showCreateModal && (
        <WardenModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateWarden}
        />
      )}

      {selectedWarden && (
        <WardenModal
          warden={selectedWarden}
          onClose={() => setSelectedWarden(null)}
          onSubmit={(data) => handleUpdateWarden(selectedWarden._id, data)}
        />
      )}

      {showCredentials && (
        <CredentialsModal
          credentials={showCredentials}
          onClose={() => setShowCredentials(null)}
        />
      )}

      {viewDetailsWarden && (
        <ViewDetailsModal
          warden={viewDetailsWarden}
          onClose={() => setViewDetailsWarden(null)}
        />
      )}
      
      <ConfirmComponent />
    </div>
  );
};

export default Wardens;