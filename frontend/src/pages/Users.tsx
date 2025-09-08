/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { userAPI, roomAPI } from '../services/api';
import { User } from '../types';
import { Users as UsersIcon, Plus, Edit, Trash2, Eye, EyeOff, Copy, Grid3X3, List, Info, UserCheck, UserX, Home, LogOut, Search, Filter, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';

const AssignRoomModal = ({ user, onClose, onSuccess }: { user: User, onClose: () => void, onSuccess?: () => void }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        if (!user.preferredBlock) {
          toast.error('Student has no preferred block assigned');
          setLoading(false);
          return;
        }

        const response = await roomAPI.getRooms({ block: user.preferredBlock, limit: 1000 });
        const allRooms = response.data.data || [];
        
        const availableRooms = allRooms.filter((room: any) => 
          room.block === user.preferredBlock && 
          room.occupants.length < room.capacity && 
          room.isAvailable
        );
        
        setRooms(availableRooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        toast.error('Failed to fetch available rooms');
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [user.preferredBlock]);

  const handleAssign = async () => {
    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }
    
    const selectedRoomData = rooms.find(room => room._id === selectedRoom);
    if (!selectedRoomData) {
      toast.error('Selected room not found');
      return;
    }
    
    if (selectedRoomData.block !== user.preferredBlock) {
      toast.error(`Cannot assign room from Block ${selectedRoomData.block} to student from Block ${user.preferredBlock}`);
      return;
    }
    
    try {
      await roomAPI.allocateRoom({ roomId: selectedRoom, studentId: user._id });
      toast.success('Room assigned successfully');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign room');
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-container">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Assign Room to {user.name}</h3>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Rooms in Block {user.preferredBlock}
                </label>
                {!user.preferredBlock ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">Student has no preferred block assigned. Please assign a block first.</p>
                  </div>
                ) : rooms.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No available rooms in Block {user.preferredBlock}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {rooms.map((room) => (
                      <div
                        key={room._id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedRoom === room._id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedRoom(room._id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{room.roomNumber}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {room.roomType} • Floor {room.floor}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              ₹{room.monthlyRent}/month
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                              {room.capacity - room.occupants.length} available
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedRoom || loading || !user.preferredBlock}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCredentials, setShowCredentials] = useState<{email: string, password: string} | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [viewDetailsUser, setViewDetailsUser] = useState<User | null>(null);
  const [assignRoomUser, setAssignRoomUser] = useState<User | null>(null);
  const [userRooms, setUserRooms] = useState<{[key: string]: any}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    block: '',
    course: '',
    year: '',
    hasRoom: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [showFilters, setShowFilters] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';
  const isWarden = currentUser?.role === 'warden';
  const isStudent = currentUser?.role === 'student';

  useEffect(() => {
    fetchUsers(1);
  }, []);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchUsers(1);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);
  
  const fetchStats = async () => {
    if (!isAdmin && !isWarden && !isStudent) return;
    try {
      const response = await userAPI.getStudentStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      const totalStudents = users.length;
      const activeStudents = users.filter(u => u.isActive).length;
      const studentsWithRooms = Object.keys(userRooms).length;
      const occupancyRate = totalStudents > 0 ? Math.round((studentsWithRooms / totalStudents) * 100) : 0;
      
      const blockCounts: {[key: string]: number} = {};
      users.forEach(user => {
        if (user.preferredBlock) {
          blockCounts[user.preferredBlock] = (blockCounts[user.preferredBlock] || 0) + 1;
        }
      });
      
      const blockDistribution = Object.entries(blockCounts).map(([block, count]) => ({
        _id: block,
        count
      }));
      
      setStats({
        overview: {
          totalStudents,
          activeStudents,
          studentsWithRooms,
        },
        insights: {
          occupancyRate
        },
        distribution: {
          byBlock: blockDistribution
        }
      });
    }
  };
  
  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, isAdmin, isWarden, isStudent, users, userRooms]);

  const fetchUsers = async (page = 1) => {
    try {
      const params: any = {
        page,
        limit: pagination.itemsPerPage
      };
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      if (filters.status) params.status = filters.status;
      if (filters.block) params.block = filters.block;
      if (filters.course) params.course = filters.course;
      if (filters.year && filters.year !== '' && !isNaN(parseInt(filters.year))) params.year = parseInt(filters.year);
      if (filters.hasRoom) params.hasRoom = filters.hasRoom;
      
      let response;
      
      if (currentUser?.role === 'student') {
        params.role = 'student';
        if (currentUser.preferredBlock && !params.block) {
          params.block = currentUser.preferredBlock;
        }
        response = await userAPI.getUsers(params);
      } else if (isAdmin) {
        response = await userAPI.getStudents(params);
      } else if (isWarden) {
        params.role = 'student';
        response = await userAPI.getUsers(params);
      } else {
        params.role = 'student';
        response = await userAPI.getUsers(params);
      }
      
      const studentsData = response.data.data || [];
      setUsers(studentsData);
      
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          currentPage: page || response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalItems: response.data.pagination.totalItems || studentsData.length,
          itemsPerPage: response.data.pagination.itemsPerPage || pagination.itemsPerPage
        });
      } else {
        setPagination({
          currentPage: page || 1,
          totalPages: Math.ceil(studentsData.length / pagination.itemsPerPage) || 1,
          totalItems: studentsData.length,
          itemsPerPage: pagination.itemsPerPage
        });
      }

      const roomsData: {[key: string]: any} = {};
      try {
        const roomParams = currentUser?.role === 'admin' ? { limit: 1000 } : { limit: 1000 };
        const allRoomsResponse = await roomAPI.getRooms(roomParams);
        const allRooms = allRoomsResponse.data.data || [];
        
        for (const room of allRooms) {
          if (room.occupants && room.occupants.length > 0) {
            for (const occupant of room.occupants) {
              let studentId;
              if (typeof occupant === 'string') {
                studentId = occupant;
              } else if (occupant.student) {
                studentId = typeof occupant.student === 'string' ? occupant.student : occupant.student._id;
              } else if (occupant._id) {
                studentId = occupant._id;
              }
              
              if (studentId) {
                roomsData[studentId] = {
                  ...room,
                  roomNumber: room.roomNumber,
                  roomType: room.roomType,
                  floor: room.floor,
                  monthlyRent: room.monthlyRent,
                  block: room.block
                };
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching room data:', error);
      }
      setUserRooms(roomsData);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
      toast.error(errorMessage);
      setUsers([]);
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

  const handleCreateUser = async (formData: any) => {
    try {
      await userAPI.createUser(formData);
      toast.success('Student created successfully');
      setShowCredentials({ email: formData.email, password: formData.password });
      setShowCreateModal(false);
      fetchUsers(1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (id: string, formData: any) => {
    try {
      await userAPI.updateUser(id, formData);
      toast.success('User updated successfully');
      setSelectedUser(null);
      fetchUsers(pagination.currentPage);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      const roomInfo = error.response?.data?.roomInfo;
      
      if (roomInfo) {
        toast.error(
          `Cannot change block: Student is in Room ${roomInfo.roomNumber} (Block ${roomInfo.block}). Deallocate room first.`,
          { duration: 6000 }
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u._id === id);
    const hasRoom = user && userRooms[user._id];
    
    let confirmMessage = 'Are you sure you want to delete this user?';
    if (hasRoom) {
      confirmMessage = `This student is currently allocated to Room ${userRooms[user._id].roomNumber}. Deleting the student will automatically deallocate the room. Are you sure you want to continue?`;
    }
    
    const confirmed = await confirm({
      title: 'Delete Student',
      message: confirmMessage,
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await userAPI.deleteUser(id);
        toast.success(hasRoom ? 'Student deleted and room deallocated successfully' : 'User deleted successfully');
        fetchUsers(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Student`,
      message: `Are you sure you want to ${action} this student?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      type: currentStatus ? 'warning' : 'info'
    });
    
    if (confirmed) {
      try {
        await userAPI.updateUser(id, { isActive: !currentStatus });
        toast.success(`Student ${action}d successfully`);
        fetchUsers(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || `Failed to ${action} student`);
      }
    }
  };

  const handleDeallocateRoom = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Deallocate Room',
      message: 'Are you sure you want to deallocate this student from their room?',
      confirmText: 'Deallocate',
      type: 'warning'
    });
    
    if (confirmed) {
      try {
        const studentRoom = userRooms[userId];
        if (!studentRoom) {
          toast.error('Student room information not found');
          return;
        }
        await roomAPI.deallocateRoom({ roomId: studentRoom._id, studentId: userId });
        toast.success('Room deallocated successfully');
        fetchUsers(pagination.currentPage);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to deallocate room');
      }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isAdmin ? 'Student Management' : isStudent ? `Students${currentUser?.preferredBlock ? ` (Block ${currentUser.preferredBlock})` : ''}` : 'Students'}
        </h1>
        <div className="flex items-center space-x-3">
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
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
            </button>
          )}
        </div>
      </div>
      
      {showStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Students</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats?.overview?.totalStudents || users.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Active Students</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats?.overview?.activeStudents || users.filter(u => u.isActive).length}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">With Rooms</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats?.overview?.studentsWithRooms || Object.keys(userRooms).length}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Occupancy Rate</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats?.insights?.occupancyRate || (users.length > 0 ? Math.round((Object.keys(userRooms).length / users.length) * 100) : 0)}%</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students by name, email, ID, phone, course, guardian..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (!hasInteracted) setHasInteracted(true);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.totalItems} student{pagination.totalItems !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={() => {
                setShowFilters(!showFilters);
                if (!hasInteracted) setHasInteracted(true);
              }}
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
        
        {(showFilters || Object.values(filters).some(f => f)) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isStudent ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({...filters, status: e.target.value});
                    if (!hasInteracted) setHasInteracted(true);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              {!isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block</label>
                  <select
                    value={filters.block}
                    onChange={(e) => {
                      setFilters({...filters, block: e.target.value});
                      if (!hasInteracted) setHasInteracted(true);
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Blocks</option>
                    <option value="A">Block A</option>
                    <option value="B">Block B</option>
                    <option value="C">Block C</option>
                    <option value="D">Block D</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                <select
                  value={filters.course}
                  onChange={(e) => {
                    setFilters({...filters, course: e.target.value});
                    if (!hasInteracted) setHasInteracted(true);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Courses</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => {
                    setFilters({...filters, year: e.target.value});
                    if (!hasInteracted) setHasInteracted(true);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Status</label>
                <select
                  value={filters.hasRoom}
                  onChange={(e) => {
                    setFilters({...filters, hasRoom: e.target.value});
                    if (!hasInteracted) setHasInteracted(true);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Students</option>
                  <option value="true">With Room</option>
                  <option value="false">Without Room</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    status: '',
                    block: '',
                    course: '',
                    year: '',
                    hasRoom: ''
                  });
                  setSearchTerm('');
                  setHasInteracted(false);
                  setShowFilters(false);
                  setTimeout(() => fetchUsers(1), 100);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Academic Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
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
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        {user.studentId && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.studentId}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        {user.course && <div>Course: {user.course}</div>}
                        {user.year && <div>Year: {user.year}</div>}
                        {user.preferredBlock && <div>Block: {user.preferredBlock}</div>}
                        {userRooms[user._id] && (
                          <div className="text-green-600 dark:text-green-400 font-medium flex items-center">
                            <Home className="h-3 w-3 mr-1" />
                            Room: {userRooms[user._id].roomNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>Phone: {user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewDetailsUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        {isWarden && !userRooms[user._id] && user.preferredBlock && (
                          <button
                            onClick={() => setAssignRoomUser(user)}
                            className="text-green-600 hover:text-green-900"
                            title="Assign Room"
                          >
                            <Home className="h-4 w-4" />
                          </button>
                        )}
                        {isWarden && userRooms[user._id] && (
                          <button
                            onClick={() => handleDeallocateRoom(user._id)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Deallocate Room"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit Student"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(user._id, user.isActive)}
                            className={user.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                            title={user.isActive ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg dark:hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-500 transition-all duration-200">
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 dark:text-white font-semibold text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</h3>
                      {user.studentId && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">ID: {user.studentId}</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    user.isActive ? 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white' : 'bg-red-100 dark:bg-red-600 text-red-700 dark:text-white'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 border dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Contact</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{user.email}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{user.phone}</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-md p-3 border dark:border-blue-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-blue-200 mb-2">Academic</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900 dark:text-blue-100 truncate font-medium" title={user.course || 'No course'}>
                      {user.course || 'No course assigned'}
                    </p>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <span className="text-sm text-gray-600 dark:text-blue-300">
                        {user.year ? `Year ${user.year}` : 'No year'}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Block Badge */}
                        {user.preferredBlock ? (
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500 text-white">
                            Block {user.preferredBlock}
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-400 text-white">
                            No Block
                          </span>
                        )}
                        {/* Room Badge */}
                        {userRooms[user._id] && (
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500 text-white flex items-center">
                            <Home className="h-3 w-3 mr-1" />
                            Room {userRooms[user._id].roomNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={() => setViewDetailsUser(user)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="View Details"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  {isWarden && !userRooms[user._id] && user.preferredBlock && (
                    <button
                      onClick={() => setAssignRoomUser(user)}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                      title="Assign Room"
                    >
                      <Home className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isWarden && userRooms[user._id] && (
                    <button
                      onClick={() => handleDeallocateRoom(user._id)}
                      className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                      title="Deallocate Room"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                      title="Edit Student"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleStatus(user._id, user.isActive)}
                      className={`p-1.5 rounded transition-colors ${
                        user.isActive 
                          ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-100' 
                          : 'text-green-600 hover:text-green-700 hover:bg-green-100'
                      }`}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(pagination.totalItems > 100 || pagination.totalPages > 1 || pagination.currentPage > 1) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchUsers(pagination.currentPage - 1)}
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
                      onClick={() => fetchUsers(pageNum)}
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
                onClick={() => fetchUsers(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No students found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by creating a new student.'}
          </p>
        </div>
      )}

      {isAdmin && showCreateModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Student</h3>
            </div>
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                const processedData = {
                  ...data,
                  role: 'student',
                  isActive: formData.has('isActive'),
                  year: data.year ? parseInt(data.year as string) : null
                };
                handleCreateUser(processedData);
              }} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                      <input type="text" name="name" className="input-field" required placeholder="Enter full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                      <input type="email" name="email" className="input-field" required placeholder="student@college.edu" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                      <input type="tel" name="phone" className="input-field" required placeholder="10-digit phone number" pattern="[0-9]{10}" maxLength={10} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} name="password" className="input-field pr-10" required defaultValue="student123" placeholder="Set login password" />
                        <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-blue-200 mb-3">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                      <input type="text" name="studentId" className="input-field" required placeholder="ST001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                      <select name="course" className="input-field" required>
                        <option value="">Select Course</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Chemical">Chemical</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                      <select name="year" className="input-field">
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Block</label>
                      <select name="preferredBlock" className="input-field" defaultValue="A">
                        <option value="A">Block A</option>
                        <option value="B">Block B</option>
                        <option value="C">Block C</option>
                        <option value="D">Block D</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-green-200 mb-3">Guardian Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label>
                      <input type="text" name="guardianName" className="input-field" required placeholder="Parent/Guardian full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone</label>
                      <input type="tel" name="guardianPhone" className="input-field" required placeholder="Guardian contact number" pattern="[0-9]{10}" maxLength={10} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Home Address</label>
                    <textarea name="address" className="input-field" rows={2} required placeholder="Complete home address" />
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border dark:border-yellow-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-yellow-200 mb-3">Account Status</h4>
                  <div className="flex items-center">
                    <input type="checkbox" name="isActive" id="isActive" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700" defaultChecked={true} />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">Active Student Account</label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inactive accounts cannot login to the system</p>
                </div>
                
                <div className="modal-footer">
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="modal-btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="modal-btn-primary">
                      Create Student
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAdmin && selectedUser && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container animate-in">
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Student</h3>
            </div>
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                const processedData = {
                  ...data,
                  role: 'student',
                  isActive: formData.has('isActive'),
                  year: data.year ? parseInt(data.year as string) : null
                };
                handleUpdateUser(selectedUser._id, processedData);
              }} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                      <input type="text" name="name" className="input-field" required defaultValue={selectedUser.name} placeholder="Enter full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                      <input type="email" name="email" className="input-field" required defaultValue={selectedUser.email} placeholder="student@college.edu" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                      <input type="tel" name="phone" className="input-field" required defaultValue={selectedUser.phone} placeholder="10-digit phone number" pattern="[0-9]{10}" maxLength={10} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-blue-200 mb-3">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                      <input type="text" name="studentId" className="input-field" required defaultValue={selectedUser.studentId || ''} placeholder="ST001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                      <select name="course" className="input-field" required defaultValue={selectedUser.course || ''}>
                        <option value="">Select Course</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Chemical">Chemical</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                      <select name="year" className="input-field" defaultValue={selectedUser.year || ''}>
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Block</label>
                      <select name="preferredBlock" className="input-field" defaultValue={selectedUser.preferredBlock || 'A'}>
                        <option value="A">Block A</option>
                        <option value="B">Block B</option>
                        <option value="C">Block C</option>
                        <option value="D">Block D</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-green-200 mb-3">Guardian Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label>
                      <input type="text" name="guardianName" className="input-field" required defaultValue={selectedUser.guardianName || ''} placeholder="Parent/Guardian full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone</label>
                      <input type="tel" name="guardianPhone" className="input-field" required defaultValue={selectedUser.guardianPhone || ''} placeholder="Guardian contact number" pattern="[0-9]{10}" maxLength={10} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Home Address</label>
                    <textarea name="address" className="input-field" rows={2} required defaultValue={selectedUser.address || ''} placeholder="Complete home address" />
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border dark:border-yellow-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-yellow-200 mb-3">Account Status</h4>
                  <div className="flex items-center">
                    <input type="checkbox" name="isActive" id="isActiveEdit" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700" defaultChecked={selectedUser.isActive} />
                    <label htmlFor="isActiveEdit" className="ml-2 block text-sm text-gray-900 dark:text-white">Active Student Account</label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inactive accounts cannot login to the system</p>
                </div>
                
                <div className="modal-footer">
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setSelectedUser(null)} className="modal-btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="modal-btn-primary">
                      Update Student
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewDetailsUser && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-lg modal-height-constrained flex flex-col modal-container">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Student Details</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        viewDetailsUser.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {viewDetailsUser.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-blue-200 mb-3">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.studentId || 'Not assigned'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.course || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.year ? `${viewDetailsUser.year}${viewDetailsUser.year === 1 ? 'st' : viewDetailsUser.year === 2 ? 'nd' : viewDetailsUser.year === 3 ? 'rd' : 'th'} Year` : 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Block</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.preferredBlock ? `Block ${viewDetailsUser.preferredBlock}` : 'Not specified'}</p>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-green-200 mb-3">Guardian Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Guardian Name</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.guardianName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Guardian Phone</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.guardianPhone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Home Address</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewDetailsUser.address || 'Not provided'}</p>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border dark:border-purple-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-purple-200 mb-3">Room Information</h4>
                  {userRooms[viewDetailsUser._id] ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Number</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">{userRooms[viewDetailsUser._id].roomNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Type</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{userRooms[viewDetailsUser._id].roomType}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Floor</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">Floor {userRooms[viewDetailsUser._id].floor}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">₹{userRooms[viewDetailsUser._id].monthlyRent}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No room assigned</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-end">
                <button onClick={() => setViewDetailsUser(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignRoomUser && (
        <AssignRoomModal
          user={assignRoomUser}
          onClose={() => setAssignRoomUser(null)}
          onSuccess={() => fetchUsers(pagination.currentPage)}
        />
      )}

      {showCredentials && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-container animate-in">
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Student Created Successfully!</h3>
            </div>
            <div className="modal-content">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Please share these login credentials with the student:</p>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <div className="flex items-center space-x-2">
                      <input type="text" value={showCredentials.email} readOnly className="input-field flex-1 bg-white dark:bg-gray-600" />
                      <button onClick={() => {
                        navigator.clipboard.writeText(showCredentials.email);
                        toast.success('Email copied to clipboard!');
                      }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" title="Copy email">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                    <div className="flex items-center space-x-2">
                      <input type="text" value={showCredentials.password} readOnly className="input-field flex-1 bg-white dark:bg-gray-600 font-mono" />
                      <button onClick={() => {
                        navigator.clipboard.writeText(showCredentials.password);
                        toast.success('Password copied to clipboard!');
                      }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" title="Copy password">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <div className="flex justify-end">
                  <button onClick={() => setShowCredentials(null)} className="modal-btn-primary">
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmComponent />
    </div>
  );
};

export default Users;