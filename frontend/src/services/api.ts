import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Check if it's account deactivation
      if (error.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/?deactivated=true';
        return Promise.reject(error);
      }
      // Regular unauthorized access
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) => {
    console.log('Making login request to:', `${API_BASE_URL}/auth/login`);
    return api.post('/auth/login', { email, password });
  },
  register: (userData: any) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
};

export const userAPI = {
  getUsers: (params?: any) => api.get('/users', { params }),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getWardens: (params?: any) => api.get('/users/wardens', { params }),
  createWarden: (data: any) => api.post('/users/wardens', data),
  getStudents: (params?: any) => api.get('/users/students', { params }),
  getStudentStats: () => api.get('/users/students/stats'),
  getWardenStats: () => api.get('/users/wardens/stats'),
  bulkStudentOperations: (data: any) => api.post('/users/students/bulk', data),
};

export const roomAPI = {
  getRooms: (params?: any) => api.get('/rooms', { params }),
  getRoomStats: () => api.get('/rooms/stats'),
  getRoom: (id: string) => api.get(`/rooms/${id}`),
  createRoom: (data: any) => api.post('/rooms', data),
  updateRoom: (id: string, data: any) => api.put(`/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete(`/rooms/${id}`),
  allocateRoom: (data: any) => api.post('/rooms/allocate', data),
  deallocateRoom: (data: any) => api.post('/rooms/deallocate', data),
  getMyRoom: () => api.get('/rooms/my-room'),
  getUnallocatedStudents: () => api.get('/rooms/unallocated-students'),
  getAvailableBlocks: () => api.get('/rooms/available-blocks'),
};

export const complaintAPI = {
  getComplaints: (params?: any) => api.get('/complaints', { params }),
  getComplaintStats: (params?: any) => api.get('/complaints/stats', { params }),
  createComplaint: (data: any) => api.post('/complaints', data),
  updateComplaint: (id: string, data: any) => api.put(`/complaints/${id}`, data),
  deleteComplaint: (id: string) => api.delete(`/complaints/${id}`),
  assignComplaint: (id: string, data: any) => api.put(`/complaints/${id}/assign`, data),
  bulkUpdateStatus: (data: any) => api.put('/complaints/bulk-update', data),
};

export const feeAPI = {
  getFees: (params?: any) => api.get('/fees', { params }),
  getFeeStats: (params?: any) => api.get('/fees/stats', { params }),
  generateFees: (data: any) => api.post('/fees/generate', data),
  payFee: (data: any) => api.post('/fees/pay', data),
  deleteFee: (id: string) => api.delete(`/fees/${id}`),
  getEligibleRooms: (params?: any) => api.get('/fees/eligible-rooms', { params }),
};

export const leaveAPI = {
  getLeaves: (params?: any) => api.get('/leaves', { params }),
  getLeaveStats: (params?: any) => api.get('/leaves/stats', { params }),
  createLeave: (data: any) => api.post('/leaves', data),
  updateLeave: (id: string, data: any) => api.put(`/leaves/${id}`, data),
  deleteLeave: (id: string) => api.delete(`/leaves/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: () => api.get('/dashboard/charts'),
  getWardenStats: () => api.get('/dashboard/warden-stats'),
};

export const notificationAPI = {
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  deleteAllNotifications: () => api.delete('/notifications/delete-all'),
};

export const announcementAPI = {
  getAnnouncements: (params?: any) => api.get('/announcements', { params }),
  getAllAnnouncements: (params?: any) => api.get('/announcements/all', { params }),
  getAnnouncementStats: (params?: any) => api.get('/announcements/stats', { params }),
  createAnnouncement: (data: any) => api.post('/announcements', data),
  updateAnnouncement: (id: string, data: any) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
};

export const hostelInfoAPI = {
  getHostelInfo: () => api.get('/hostel-info'),
  updateHostelInfo: (data: any) => api.put('/hostel-info', data),
};

export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data: any) => api.put('/profile', data),
  changePassword: (data: any) => api.put('/profile/password', data),
};

export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
  getSystemStats: () => api.get('/settings/stats'),
  resetSettings: () => api.post('/settings/reset'),
  backupData: () => api.get('/settings/backup'),
};

export default api;