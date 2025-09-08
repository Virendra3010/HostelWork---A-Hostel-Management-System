/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { roomAPI, userAPI } from '../services/api';
import { Room, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Building, Users, Plus, Grid3X3, List, Edit, Trash2, Info, UserPlus, UserMinus, Search, Filter, ChevronLeft, ChevronRight, BarChart3, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRoomStatus } from '../utils/roomUtils';
import { useConfirm } from '../hooks/useConfirm';

const Rooms: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [viewDetailsRoom, setViewDetailsRoom] = useState<Room | null>(null);
  const [showDeallocateModal, setShowDeallocateModal] = useState(false);
  const [deallocateRoom, setDeallocateRoom] = useState<Room | null>(null);
  
  // Search, Filter, and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    block: '',
    roomType: '',
    occupancy: '',
    maintenanceStatus: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [showFilters, setShowFilters] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchRooms();
    if (user?.role === 'warden') {
      fetchUnallocatedStudents();
    }
  }, []);
  
  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, user?.role, rooms]);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
      fetchRooms(1); // Reset to first page on search/filter change
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const fetchRooms = async (page = 1) => {
    try {
      const params: any = {
        page,
        limit: pagination.itemsPerPage
      };
      
      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters with proper mapping
      if (filters.block) {
        params.block = filters.block;
      }
      
      if (filters.roomType) params.roomType = filters.roomType;
      if (filters.maintenanceStatus) params.maintenanceStatus = filters.maintenanceStatus;
      
      // Fix occupancy filter mapping
      if (filters.occupancy) {
        switch (filters.occupancy) {
          case 'available':
            params.available = 'true';
            break;
          case 'partial':
            params.available = 'partial';
            break;
          case 'full':
            params.available = 'full';
            break;
          default:
            params.available = filters.occupancy;
        }
      }
      
      console.log('Fetching rooms with params:', params);
      console.log('User role:', user?.role);
      console.log('User assigned blocks:', user?.assignedBlocks);
      
      const response = await roomAPI.getRooms(params);
      const roomsData = response.data.data || [];
      setRooms(roomsData);
      setAllRooms(roomsData);
      
      // Update pagination with proper fallback
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || roomsData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        // Enhanced fallback pagination
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(roomsData.length / pagination.itemsPerPage) || 1,
          totalItems: roomsData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
      // Reset to empty state on error but preserve itemsPerPage
      setRooms([]);
      setAllRooms([]);
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

  const fetchStats = async () => {
    try {
      const response = await roomAPI.getRoomStats();
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Error fetching room stats:', error);
      // Create fallback stats from current data
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.occupants.length > 0).length;
      const availableRooms = rooms.filter(r => r.occupants.length < r.capacity).length;
      const fullyOccupiedRooms = rooms.filter(r => r.occupants.length === r.capacity).length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      
      // Block distribution
      const blockCounts: {[key: string]: number} = {};
      rooms.forEach(room => {
        blockCounts[room.block] = (blockCounts[room.block] || 0) + 1;
      });
      
      // Room type distribution
      const typeCounts: {[key: string]: number} = {};
      rooms.forEach(room => {
        typeCounts[room.roomType] = (typeCounts[room.roomType] || 0) + 1;
      });
      
      // Capacity stats
      const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
      const occupiedCapacity = rooms.reduce((sum, room) => sum + room.occupants.length, 0);
      
      setStats({
        overview: {
          total: totalRooms,
          available: availableRooms,
          occupied: occupiedRooms,
          occupancyRate
        },
        byBlock: blockCounts,
        byType: typeCounts,
        capacity: {
          total: totalCapacity,
          occupied: occupiedCapacity,
          available: totalCapacity - occupiedCapacity
        }
      });
    }
  };

  const fetchUnallocatedStudents = async () => {
    try {
      const response = await roomAPI.getUnallocatedStudents();
      setStudents(response.data.students);
    } catch (error) {
      console.error('Failed to fetch students');
    }
  };

  const handleAllocateRoom = async (roomId: string, studentId: string) => {
    try {
      await roomAPI.allocateRoom({ roomId, studentId });
      toast.success('Room allocated successfully');
      setShowAllocateModal(false);
      setSelectedRoom(null); // Reset selected room to prevent edit modal from opening
      fetchRooms(pagination.currentPage); // Refresh current page
      fetchUnallocatedStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to allocate room');
    }
  };

  const handleDeallocateRoom = async (roomId: string, studentId: string) => {
    try {
      await roomAPI.deallocateRoom({ roomId, studentId });
      toast.success('Room deallocated successfully');
      setShowDeallocateModal(false);
      setDeallocateRoom(null);
      setSelectedRoom(null); // Reset selected room to prevent edit modal from opening
      fetchRooms(pagination.currentPage); // Refresh current page
      fetchUnallocatedStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deallocate room');
    }
  };

  const handleCreateRoom = async (formData: any) => {
    try {
      await roomAPI.createRoom(formData);
      toast.success('Room created successfully');
      setShowCreateModal(false);
      fetchRooms(1); // Refresh and go to first page
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create room');
    }
  };

  const handleUpdateRoom = async (id: string, formData: any) => {
    try {
      await roomAPI.updateRoom(id, formData);
      toast.success('Room updated successfully');
      setSelectedRoom(null);
      fetchRooms(pagination.currentPage); // Refresh current page
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Room',
      message: 'Are you sure you want to delete this room?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await roomAPI.deleteRoom(id);
        toast.success('Room deleted successfully');
        fetchRooms(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete room');
      }
    }
  };

  const RoomModal = ({ room, onClose, onSubmit }: { room?: Room; onClose: () => void; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      roomNumber: room?.roomNumber || '',
      block: room?.block || 'A',
      floor: room?.floor || 1,
      capacity: room?.capacity || 2,
      roomType: room?.roomType || 'double',
      monthlyRent: room?.monthlyRent || 8000,
      amenities: room?.amenities || [] as string[],
      maintenanceStatus: room?.maintenanceStatus || 'good',
      isAvailable: room?.isAvailable ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const handleAmenityChange = (amenity: string, checked: boolean) => {
      if (checked) {
        setFormData({...formData, amenities: [...formData.amenities, amenity]});
      } else {
        setFormData({...formData, amenities: formData.amenities.filter(a => a !== amenity)});
      }
    };

    const availableAmenities = ['WiFi', 'AC', 'Attached Bathroom', 'Balcony', 'Study Table', 'Wardrobe', 'Fan', 'Geyser'];

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {room ? 'Edit Room' : 'Add New Room'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="room-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Number</label>
                    <input
                      type="text"
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                      required
                      placeholder="e.g., A101, B205"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block</label>
                    <select
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.block}
                      onChange={(e) => setFormData({...formData, block: e.target.value})}
                    >
                      <option value="A">Block A</option>
                      <option value="B">Block B</option>
                      <option value="C">Block C</option>
                      <option value="D">Block D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Floor</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.floor}
                      onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                      placeholder="Floor number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Type</label>
                    <select
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.roomType}
                      onChange={(e) => setFormData({...formData, roomType: e.target.value})}
                    >
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="triple">Triple</option>
                      <option value="quad">Quad</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Capacity & Pricing Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-blue-200 mb-3">Capacity & Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                    <select
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    >
                      <option value={1}>1 Person</option>
                      <option value={2}>2 Persons</option>
                      <option value={3}>3 Persons</option>
                      <option value={4}>4 Persons</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Rent (₹)</label>
                    <input
                      type="number"
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({...formData, monthlyRent: parseInt(e.target.value)})}
                      placeholder="8000"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities Section */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-green-200 mb-3">Amenities</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableAmenities.map(amenity => (
                    <label key={amenity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border dark:border-yellow-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-yellow-200 mb-3">Room Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Status</label>
                    <select
                      className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                      value={formData.maintenanceStatus}
                      onChange={(e) => setFormData({...formData, maintenanceStatus: e.target.value})}
                    >
                      <option value="good">Good</option>
                      <option value="needs_repair">Needs Repair</option>
                      <option value="under_maintenance">Under Maintenance</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAvailable"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                    />
                    <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                      Available for Allocation
                    </label>
                  </div>
                </div>
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
                form="room-form"
                className="btn-primary"
              >
                {room ? 'Update Room' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AllocateRoomModal = () => {
    const [selectedStudent, setSelectedStudent] = useState('');
    const [modalStudents, setModalStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchStudentsForRoom = async () => {
        if (!selectedRoom) return;
        
        try {
          setLoading(true);
          // Fetch all unallocated students in warden's assigned blocks
          const response = await roomAPI.getUnallocatedStudents();
          const allUnallocatedStudents = response.data.students || [];
          
          // Filter students to only show those from the same block as the selected room
          const studentsInRoomBlock = allUnallocatedStudents.filter((student: User) => 
            student.preferredBlock === selectedRoom.block
          );
          
          setModalStudents(studentsInRoomBlock);
        } catch (error) {
          console.error('Failed to fetch students for room allocation:', error);
          setModalStudents([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchStudentsForRoom();
    }, [selectedRoom]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedRoom && selectedStudent) {
        handleAllocateRoom(selectedRoom._id, selectedStudent);
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg modal-sm modal-container animate-in p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Allocate Room {selectedRoom?.roomNumber} (Block {selectedRoom?.block})
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Student for Room {selectedRoom?.roomNumber}
              </label>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <select
                  className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">Choose a student</option>
                  {modalStudents.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.studentId || 'No ID'})
                    </option>
                  ))}
                </select>
              )}
              {!loading && modalStudents.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  No unallocated students found in Block {selectedRoom?.block}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAllocateModal(false);
                  setSelectedRoom(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading || !selectedStudent}
              >
                Allocate Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ViewDetailsModal = ({ room, onClose }: { room: Room, onClose: () => void }) => {
    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Room Details - {room.roomNumber}</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Number</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{room.roomNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Block</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">Block {room.block}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Floor</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{room.floor}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Type</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{room.roomType}</p>
                  </div>
                </div>
              </div>

              {/* Capacity & Pricing */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-blue-200 mb-3">Capacity & Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{room.capacity} persons</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Rent</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">₹{room.monthlyRent}</p>
                  </div>
                </div>
              </div>

              {/* Occupants */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-green-200 mb-3">Current Occupants ({room.occupants.length}/{room.capacity})</h4>
                {room.occupants.length > 0 ? (
                  <div className="space-y-2">
                    {room.occupants.map((occupant, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-600 p-3 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{occupant.student.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">Joined: {new Date(occupant.joinDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No occupants currently</p>
                )}
              </div>

              {/* Amenities */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border dark:border-yellow-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-yellow-200 mb-3">Amenities</h4>
                {room.amenities && room.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map((amenity, index) => (
                      <span key={index} className="px-2 py-1 bg-white dark:bg-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 rounded">
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No amenities listed</p>
                )}
              </div>

              {/* Status */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border dark:border-red-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-red-200 mb-3">Status Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Availability</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      room.isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {room.isAvailable ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Maintenance Status</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{room.maintenanceStatus?.replace('_', ' ') || 'Good'}</p>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {user?.role === 'student' ? `Block ${user?.preferredBlock || ''} Rooms` : 'Rooms Management'}
        </h1>
        <div className="flex items-center space-x-3">
          {/* Stats Toggle for All Users */}
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
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Room</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Statistics Panel for All Users */}
      {showStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Room Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Rooms</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats?.overview?.total || rooms.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Available</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats?.overview?.available || rooms.filter(r => r.occupants.length < r.capacity).length}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Occupied</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats?.overview?.occupied || rooms.filter(r => r.occupants.length > 0).length}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Occupancy Rate</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats?.overview?.occupancyRate || (rooms.length > 0 ? Math.round((rooms.filter(r => r.occupants.length > 0).length / rooms.length) * 100) : 0)}%</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(stats?.byBlock && Object.keys(stats.byBlock).length > 0) ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Block</h3>
                <div className="space-y-1">
                  {Object.entries(stats.byBlock).map(([block, count]: [string, any]) => (
                    <div key={block} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Block {block}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Block</h3>
                <div className="space-y-1">
                  {(() => {
                    const blockCounts: {[key: string]: number} = {};
                    rooms.forEach(room => {
                      blockCounts[room.block] = (blockCounts[room.block] || 0) + 1;
                    });
                    return Object.entries(blockCounts).map(([block, count]) => (
                      <div key={block} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Block {block}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            
            {(stats?.byType && Object.keys(stats.byType).length > 0) ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Type</h3>
                <div className="space-y-1">
                  {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{type}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Type</h3>
                <div className="space-y-1">
                  {(() => {
                    const typeCounts: {[key: string]: number} = {};
                    rooms.forEach(room => {
                      typeCounts[room.roomType] = (typeCounts[room.roomType] || 0) + 1;
                    });
                    return Object.entries(typeCounts).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{type}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Capacity</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats?.capacity?.total || rooms.reduce((sum, room) => sum + room.capacity, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Occupied</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats?.capacity?.occupied || rooms.reduce((sum, room) => sum + room.occupants.length, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Available</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats?.capacity?.available || (rooms.reduce((sum, room) => sum + room.capacity, 0) - rooms.reduce((sum, room) => sum + room.occupants.length, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filter Section - Only show if there are rooms */}
      {(allRooms.length > 0 || searchTerm || Object.values(filters).some(f => f)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search rooms by number, block..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Filter Toggle and Results Count */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.totalItems} room{pagination.totalItems !== 1 ? 's' : ''} found
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block</label>
                  <select
                    value={filters.block}
                    onChange={(e) => setFilters({...filters, block: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Blocks</option>
                    {user?.role === 'warden' ? (
                      (user?.assignedBlocks || []).map(block => (
                        <option key={block} value={block}>Block {block}</option>
                      ))
                    ) : (
                      ['A', 'B', 'C', 'D'].map(block => (
                        <option key={block} value={block}>Block {block}</option>
                      ))
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Type</label>
                  <select
                    value={filters.roomType}
                    onChange={(e) => setFilters({...filters, roomType: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                    <option value="quad">Quad</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Occupancy Status</label>
                  <select
                    value={filters.occupancy}
                    onChange={(e) => setFilters({...filters, occupancy: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Rooms</option>
                    <option value="available">Available (Has Space)</option>
                    <option value="partial">Partially Occupied</option>
                    <option value="full">Fully Occupied</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance</label>
                  <select
                    value={filters.maintenanceStatus}
                    onChange={(e) => setFilters({...filters, maintenanceStatus: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="good">Good</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="under_maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.role === 'warden' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      Showing rooms from your assigned blocks: {(user?.assignedBlocks || []).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setFilters({
                      block: '',
                      roomType: '',
                      occupancy: '',
                      maintenanceStatus: ''
                    });
                    setSearchTerm('');
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center space-x-1"
                >
                  <X className="h-3 w-3" />
                  <span>Clear All Filters</span>
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
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status & Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rooms.map((room) => (
                  <tr key={room._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{room.roomNumber}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Block {room.block} • Floor {room.floor}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div>{room.roomType} • ₹{room.monthlyRent}/month</div>
                        <div className="text-gray-500 dark:text-gray-400">Capacity: {room.capacity}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div>{room.occupants.length}/{room.capacity} occupied</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {(() => {
                          const { status, colorClass, bgClass } = getRoomStatus(room.occupants, room.capacity);
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bgClass} ${colorClass}`}>
                              {status}
                            </span>
                          );
                        })()}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Maintenance: <span className={`font-medium ${
                            room.maintenanceStatus === 'good' ? 'text-green-600 dark:text-green-400' :
                            room.maintenanceStatus === 'needs_repair' ? 'text-yellow-600 dark:text-yellow-400' :
                            room.maintenanceStatus === 'under_maintenance' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {room.maintenanceStatus?.replace('_', ' ') || 'Good'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewDetailsRoom(room)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => setSelectedRoom(room)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit Room"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Room"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {user?.role === 'warden' && (
                          <>
                            {room.occupants.length < room.capacity && (
                              <button
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setShowAllocateModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Allocate Room"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                            )}
                            {room.occupants.length > 0 && (
                              <button
                                onClick={() => {
                                  setDeallocateRoom(room);
                                  setShowDeallocateModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-900"
                                title="Remove Student"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
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
          {rooms.map((room) => (
            <div key={room._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg dark:hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-500 transition-all duration-200">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building className="h-4 w-4 text-primary-600 dark:text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{room.roomNumber}</h3>
                      <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">Block {room.block} • Floor {room.floor}</p>
                    </div>
                  </div>
                  {(() => {
                    const { status, colorClass, bgClass } = getRoomStatus(room.occupants, room.capacity);
                    return (
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${bgClass} ${colorClass}`}>
                        {status}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Room Details */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 border dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Room Details</p>
                  <p className="text-xs text-gray-900 dark:text-white">{room.roomType} • ₹{room.monthlyRent}/month</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Capacity: {room.capacity} persons</p>
                </div>

                {/* Occupancy */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-md p-3 border dark:border-blue-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-blue-200 mb-2">Occupancy</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-900 dark:text-blue-100">{room.occupants.length}/{room.capacity} occupied</span>
                    <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Maintenance Status */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-md p-3 border dark:border-yellow-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-yellow-200 mb-2">Maintenance</p>
                  <span className={`text-xs font-medium ${
                    room.maintenanceStatus === 'good' ? 'text-green-600 dark:text-green-400' :
                    room.maintenanceStatus === 'needs_repair' ? 'text-yellow-600 dark:text-yellow-400' :
                    room.maintenanceStatus === 'under_maintenance' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {room.maintenanceStatus?.replace('_', ' ') || 'Good'}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={() => setViewDetailsRoom(room)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="View Details"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                        title="Edit Room"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room._id)}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {user?.role === 'warden' && (
                    <>
                      {room.occupants.length < room.capacity && (
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowAllocateModal(true);
                          }}
                          className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                          title="Allocate Room"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {room.occupants.length > 0 && (
                        <button
                          onClick={() => {
                            setDeallocateRoom(room);
                            setShowDeallocateModal(true);
                          }}
                          className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                          title="Remove Student"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
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
                onClick={() => fetchRooms(pagination.currentPage - 1)}
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
                      onClick={() => fetchRooms(pageNum)}
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
                onClick={() => fetchRooms(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {rooms.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No rooms found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : user?.role === 'admin' 
                ? 'Get started by creating a new room.' 
                : 'No rooms match your criteria.'}
          </p>
        </div>
      )}

      {showCreateModal && (
        <RoomModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRoom}
        />
      )}

      {selectedRoom && !showAllocateModal && (
        <RoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onSubmit={(data) => handleUpdateRoom(selectedRoom._id, data)}
        />
      )}

      {viewDetailsRoom && (
        <ViewDetailsModal
          room={viewDetailsRoom}
          onClose={() => setViewDetailsRoom(null)}
        />
      )}

      {showAllocateModal && <AllocateRoomModal />}
      {showDeallocateModal && <DeallocateRoomModal />}
      
      <ConfirmComponent />
    </div>
  );

  function DeallocateRoomModal() {
    const [selectedStudent, setSelectedStudent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (deallocateRoom && selectedStudent) {
        const confirmed = await confirm({
          title: 'Remove Student',
          message: `Remove selected student from Room ${deallocateRoom.roomNumber}?`,
          confirmText: 'Remove',
          type: 'warning'
        });
        if (confirmed) {
          handleDeallocateRoom(deallocateRoom._id, selectedStudent);
        }
      }
    };

    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg modal-sm modal-container animate-in p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Remove Student from Room {deallocateRoom?.roomNumber}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Student to Remove</label>
              <select
                className="input-field bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                required
              >
                <option value="">Choose a student</option>
                {deallocateRoom?.occupants.map((occupant) => (
                  <option key={occupant.student._id} value={occupant.student._id}>
                    {occupant.student.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeallocateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700">
                Remove Student
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
};

export default Rooms;