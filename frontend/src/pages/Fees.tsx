/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { feeAPI } from '../services/api';
import { Fee, Room, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Calendar, IndianRupee, Plus, Eye, Edit, Building, Users, Download, Search, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

const Fees: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [fees, setFees] = useState<Fee[]>([]);
  const [feeStats, setFeeStats] = useState({
    totalDue: 0,
    totalPaid: 0,
    pendingFees: 0,
    totalRecords: 0
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'individual' | 'room-wise'>('individual');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [viewDetailsFee, setViewDetailsFee] = useState<Fee | null>(null);
  
  // Search, Filter, and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    feeType: '',
    semester: '',
    year: '',
    minAmount: '',
    maxAmount: '',
    dueDateFrom: '',
    dueDateTo: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [showFilters, setShowFilters] = useState(false);


  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchData(1);
      fetchStats();
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchStats = async () => {
    try {
      const params: any = {};
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.feeType) params.feeType = filters.feeType;
      if (filters.semester) params.semester = filters.semester;
      if (filters.year) params.year = filters.year;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;
      
      console.log('Fetching fee stats with params:', params);
      const response = await feeAPI.getFeeStats(params);
      console.log('Fee stats response:', response.data);
      
      setFeeStats(response.data.stats || {
        totalDue: 0,
        totalPaid: 0,
        pendingFees: 0,
        totalRecords: 0
      });
    } catch (error) {
      console.error('Error fetching fee stats:', error);
      setFeeStats({
        totalDue: 0,
        totalPaid: 0,
        pendingFees: 0,
        totalRecords: 0
      });
    }
  };

  const fetchData = async (page = 1) => {
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
      if (filters.feeType) params.feeType = filters.feeType;
      if (filters.semester) params.semester = filters.semester;
      if (filters.year) params.year = filters.year;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;
      
      const feesResponse = await feeAPI.getFees(params);
      const feesData = feesResponse.data.data || [];
      setFees(feesData);
      
      // Update pagination with proper fallback
      if (feesResponse.data.pagination) {
        setPagination({
          ...feesResponse.data.pagination,
          currentPage: page || feesResponse.data.pagination.currentPage,
          totalPages: feesResponse.data.pagination.totalPages || 1,
          totalItems: feesResponse.data.pagination.totalItems || feesData.length,
          itemsPerPage: feesResponse.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(feesData.length / pagination.itemsPerPage) || 1,
          totalItems: feesData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching fees data:', error);
      toast.error('Failed to fetch data');
      // Reset to empty state on error but preserve itemsPerPage
      setFees([]);
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

  const handleGenerateFees = async (formData: any) => {
    try {
      await feeAPI.generateFees(formData);
      toast.success('Monthly fees generated successfully');
      setShowGenerateModal(false);
      fetchData(1);
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate fees');
    }
  };

  const handlePayment = async (formData: any) => {
    try {
      await feeAPI.payFee({
        feeId: selectedFee?._id,
        ...formData
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedFee(null);
      fetchData(pagination.currentPage);
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleDeleteFee = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Fee Record',
      message: 'Are you sure you want to delete this fee record? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }
    try {
      await feeAPI.deleteFee(id);
      toast.success('Fee record deleted successfully');
      fetchData(pagination.currentPage);
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete fee record');
    }
  };

  const GenerateFeesModal = () => {
    const [formData, setFormData] = useState({
      feeType: 'semester',
      semester: 'Fall',
      year: new Date().getFullYear(),
      type: 'all', // all, room, individual
      selectedRooms: [] as string[],
      selectedStudents: [] as string[]
    });
    const [eligibleRooms, setEligibleRooms] = useState<Room[]>([]);
    const [modalStudents, setModalStudents] = useState<User[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    
    // Fetch eligible rooms when fee type, semester, or year changes
    useEffect(() => {
      if (formData.feeType && formData.year) {
        fetchEligibleRooms();
      }
    }, [formData.feeType, formData.semester, formData.year]);
    
    // Fetch students when modal opens
    useEffect(() => {
      const fetchStudents = async () => {
        try {
          const { userAPI } = await import('../services/api');
          const response = await userAPI.getUsers({ role: 'student' });
          setModalStudents(response.data.data || []);
        } catch (error) {
          console.error('Error fetching students:', error);
          setModalStudents([]);
        }
      };
      fetchStudents();
    }, []);
    
    const fetchEligibleRooms = async () => {
      setLoadingRooms(true);
      try {
        const params: any = {
          feeType: formData.feeType,
          year: formData.year
        };
        if (formData.feeType === 'semester') {
          params.semester = formData.semester;
        }
        
        const response = await feeAPI.getEligibleRooms(params);
        setEligibleRooms(response.data.rooms || []);
      } catch (error) {
        console.error('Error fetching eligible rooms:', error);
        toast.error('Failed to fetch eligible rooms');
        setEligibleRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleGenerateFees(formData);
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Generate Monthly Fees</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="generate-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Period Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fee Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Type</label>
                    <select
                      className="input-field"
                      value={formData.feeType}
                      onChange={(e) => setFormData({...formData, feeType: e.target.value})}
                      required
                    >
                      <option value="semester">Semester</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {formData.feeType === 'semester' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                      <select
                        className="input-field"
                        value={formData.semester}
                        onChange={(e) => setFormData({...formData, semester: e.target.value})}
                        required
                      >
                        <option value="Fall">Fall</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})}
                      required
                      min={2020}
                      max={2030}
                    />
                  </div>
                </div>
              </div>

              {/* Generation Type Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Generation Type</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="all"
                      checked={formData.type === 'all'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Generate for all allocated students</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="room"
                      checked={formData.type === 'room'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Generate for specific rooms</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="individual"
                      checked={formData.type === 'individual'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Generate for specific students</span>
                  </label>
                </div>
              </div>

              {/* Room Selection */}
              {formData.type === 'room' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Rooms</h4>
                  {loadingRooms ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading eligible rooms...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {eligibleRooms.map(room => (
                          <label key={room._id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.selectedRooms.includes(room._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({...formData, selectedRooms: [...formData.selectedRooms, room._id]});
                                } else {
                                  setFormData({...formData, selectedRooms: formData.selectedRooms.filter(id => id !== room._id)});
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {room.roomNumber} ({room.occupants?.length || 0} student{room.occupants?.length !== 1 ? 's' : ''})
                            </span>
                          </label>
                        ))}
                      </div>
                      {eligibleRooms.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No eligible rooms found for {formData.feeType === 'semester' ? `${formData.semester} Semester ${formData.year}` : `Academic Year ${formData.year}`}.
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            All students may already have fees generated for this period.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Student Selection */}
              {formData.type === 'individual' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Students</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {modalStudents.map(student => (
                      <label key={student._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, selectedStudents: [...formData.selectedStudents, student._id]});
                            } else {
                              setFormData({...formData, selectedStudents: formData.selectedStudents.filter(id => id !== student._id)});
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{student.name} ({student.studentId})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="generate-form" className="btn-primary">
              Generate Fees
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    const [formData, setFormData] = useState({
      amount: selectedFee?.dueAmount || 0,
      paymentMethod: 'online',
      transactionId: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handlePayment(formData);
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-sm modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Record Payment</h3>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Amount</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  required
                  min={1}
                  max={selectedFee?.dueAmount}
                  step={0.01}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Due Amount: ₹{selectedFee?.dueAmount}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <select
                  className="input-field"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                >
                  <option value="online">Online Payment</option>
                  <option value="card">Card Payment</option>
                  <option value="upi">UPI Payment</option>
                  <option value="cash">Cash Payment</option>
                  <option value="cheque">Cheque Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                  placeholder="Enter transaction ID"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const ViewDetailsModal = ({ fee }: { fee: Fee }) => {
    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Fee Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Period</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {fee.feeType === 'semester' ? `${fee.semester} Semester ${fee.year}` : `Academic Year ${fee.year}`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(fee.status)}`}>
                      {fee.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(fee.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
                    <p className="text-sm text-gray-900 dark:text-white">{fee.room?.roomNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <p className="text-sm text-gray-900 dark:text-white">{fee.student?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                    <p className="text-sm text-gray-900 dark:text-white">{fee.student?.studentId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fee Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Room Rent:</span>
                    <span className="text-sm text-gray-900 dark:text-white">₹{fee.roomRent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mess Fee:</span>
                    <span className="text-sm text-gray-900 dark:text-white">₹{fee.messFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Electricity Bill:</span>
                    <span className="text-sm text-gray-900 dark:text-white">₹{fee.electricityBill}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Maintenance Fee:</span>
                    <span className="text-sm text-gray-900 dark:text-white">₹{fee.maintenanceFee}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Total Amount:</span>
                    <span className="text-sm text-gray-900 dark:text-white">₹{fee.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</label>
                    <p className="text-sm text-gray-900 dark:text-white">₹{fee.paidAmount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Amount</label>
                    <p className="text-sm text-gray-900 dark:text-white">₹{fee.dueAmount}</p>
                  </div>
                  {fee.paymentMethod && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{fee.paymentMethod}</p>
                    </div>
                  )}
                  {fee.transactionId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
                      <p className="text-sm text-gray-900 dark:text-white">{fee.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => setViewDetailsFee(null)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const groupedByRoom = useMemo(() => {
    return fees.reduce((acc, fee) => {
      const roomKey = fee.room?.roomNumber || 'Unknown';
      if (!acc[roomKey]) {
        acc[roomKey] = {
          room: fee.room,
          fees: [],
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0
        };
      }
      acc[roomKey].fees.push(fee);
      acc[roomKey].totalAmount += fee.totalAmount;
      acc[roomKey].paidAmount += fee.paidAmount;
      acc[roomKey].dueAmount += fee.dueAmount;
      return acc;
    }, {} as Record<string, any>);
  }, [fees]);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          {user?.role !== 'student' && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('individual')}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'individual'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Users className="h-4 w-4 mr-1 inline" />
                Individual
              </button>
              <button
                onClick={() => setViewMode('room-wise')}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'room-wise'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Building className="h-4 w-4 mr-1 inline" />
                Room-wise
              </button>
            </div>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Generate Fees</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Search and Filter Section */}
      {(fees.length > 0 || searchTerm || Object.values(filters).some(f => f)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by transaction ID, payment method..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} fee{pagination.totalItems !== 1 ? 's' : ''} found
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
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Type</label>
                  <select
                    value={filters.feeType}
                    onChange={(e) => setFilters({...filters, feeType: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="semester">Semester</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                  <select
                    value={filters.semester}
                    onChange={(e) => setFilters({...filters, semester: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filters.feeType === 'yearly'}
                  >
                    <option value="">All Semesters</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={filters.year}
                    onChange={(e) => setFilters({...filters, year: e.target.value})}
                    placeholder="e.g., 2024"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    min={2020}
                    max={2030}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                    placeholder="₹0"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    min={0}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Amount</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                    placeholder="₹100000"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    min={0}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date From</label>
                  <input
                    type="date"
                    value={filters.dueDateFrom}
                    onChange={(e) => setFilters({...filters, dueDateFrom: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date To</label>
                  <input
                    type="date"
                    value={filters.dueDateTo}
                    onChange={(e) => setFilters({...filters, dueDateTo: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      feeType: '',
                      semester: '',
                      year: '',
                      minAmount: '',
                      maxAmount: '',
                      dueDateFrom: '',
                      dueDateTo: ''
                    });
                    setSearchTerm('');
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                    fetchStats();
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

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Due</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{feeStats.totalDue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Paid</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{feeStats.totalPaid.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Fees</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feeStats.pendingFees}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feeStats.totalRecords}
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Individual View */}
      {viewMode === 'individual' && (
        <div className="space-y-4">
          {fees.map((fee) => (
            <div key={fee._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {fee.feeType === 'semester' ? `${fee.semester} Semester ${fee.year}` : `Academic Year ${fee.year}`}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{fee.student?.name || 'N/A'} ({fee.student?.studentId || 'N/A'})</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(fee.status)}`}>
                    {fee.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setViewDetailsFee(fee)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  {(user?.role === 'admin' || user?.role === 'warden') && fee.dueAmount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedFee(fee);
                        setShowPaymentModal(true);
                      }}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Record Payment"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  {user?.role === 'admin' && fee.paidAmount === 0 && (
                    <button
                      onClick={() => handleDeleteFee(fee._id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Fee Record"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Room</span>
                  <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{fee.room?.roomNumber || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Amount</span>
                  <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">₹{fee.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Paid Amount</span>
                  <span className="text-sm text-green-600 dark:text-green-400 mt-1">₹{fee.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Amount</span>
                  <span className="text-sm text-red-600 dark:text-red-400 mt-1">₹{fee.dueAmount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Date</span>
                  <span className="text-sm text-gray-900 dark:text-gray-200 mt-1">{new Date(fee.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room-wise View */}
      {viewMode === 'room-wise' && (
        <div className="space-y-4">
          {Object.values(groupedByRoom).map((roomData: any) => (
            <div key={roomData.room?._id || 'unknown'} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Room {roomData.room?.roomNumber || 'Unknown'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Block {roomData.room?.block || 'N/A'} | {roomData.fees.length} students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Due</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">₹{roomData.dueAmount.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{roomData.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Paid Amount</p>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">₹{roomData.paidAmount.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Due Amount</p>
                  <p className="text-lg font-semibold text-red-700 dark:text-red-300">₹{roomData.dueAmount.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Students:</h4>
                {roomData.fees.map((fee: Fee) => (
                  <div key={fee._id} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{fee.student?.name || 'N/A'}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({fee.student?.studentId || 'N/A'})</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(fee.status)}`}>
                        {fee.status}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-200">₹{fee.dueAmount}</span>
                      <button
                        onClick={() => setViewDetailsFee(fee)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                onClick={() => fetchData(pagination.currentPage - 1)}
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
                      onClick={() => fetchData(pageNum)}
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
                onClick={() => fetchData(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {fees.length === 0 && !loading && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No fees found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : user?.role === 'admin' 
                ? 'Generate fees to get started.' 
                : 'No fee records match your criteria.'}
          </p>
        </div>
      )}

      {showGenerateModal && <GenerateFeesModal />}
      {showPaymentModal && <PaymentModal />}
      {viewDetailsFee && <ViewDetailsModal fee={viewDetailsFee} />}
      
      <ConfirmComponent />
    </div>
  );
};

export default Fees;