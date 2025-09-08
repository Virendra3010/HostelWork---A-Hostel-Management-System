export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'warden' | 'student';
  phone: string;
  isActive: boolean;
  studentId?: string;
  preferredBlock?: string;
  course?: string;
  year?: number;
  wardenId?: string;
  assignedBlocks?: string[];
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  _id: string;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupants: Array<{
    student: User;
    joinDate: string;
  }>;
  roomType: string;
  amenities: string[];
  monthlyRent: number;
  isAvailable: boolean;
  maintenanceStatus: string;
}

export interface Complaint {
  _id: string;
  student: User;
  room: Room;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: User;
  adminRemarks?: string;
  remarksBy?: User;
  remarksRole?: 'admin' | 'warden';
  createdAt: string;
}

export interface Fee {
  _id: string;
  student: User;
  room: Room;
  feeType: 'semester' | 'yearly';
  semester?: string;
  year: number;
  roomRent: number;
  messFee: number;
  electricityBill: number;
  maintenanceFee: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  dueDate: string;
  paymentMethod?: string;
  transactionId?: string;
  paidDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Leave {
  _id: string;
  student: User;
  room: Room;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
  approvedBy?: User;
  adminRemarks?: string;
  remarksBy?: User;
  remarksRole?: 'admin' | 'warden';
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  priority: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: User;
  targetAudience: 'all' | 'students' | 'wardens' | 'specific_blocks';
  targetBlocks: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt?: string;
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalWardens?: number;
  totalRooms?: number;
  occupiedRooms?: number;
  availableRooms?: number;
  assignedRooms?: number;
  occupancyRate?: number;
  pendingComplaints?: number;
  totalComplaints?: number;
  resolvedComplaints?: number;
  inProgressComplaints?: number;
  pendingLeaves?: number;
  approvedLeaves?: number;
  totalLeaves?: number;
  pendingFees?: number;
  totalRevenue?: number;
  totalDue?: number;
  roomInfo?: Room;
  wardenInfo?: User;
  blockOccupancy?: Array<{
    block: string;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    occupancyRate: number;
  }>;
  recentActivities?: {
    complaints: Complaint[];
    leaves: Leave[];
    registrations: User[];
  };
  feeCollectionTrend?: Array<{
    _id: { year: number; month: number };
    totalCollected: number;
    count: number;
  }>;
  maintenanceStats?: Array<{
    _id: string;
    count: number;
  }>;
  complaintCategories?: Array<{
    _id: string;
    count: number;
  }>;
  // Warden-specific properties
  assignedBlocks?: string[];
  totalRoomsInBlocks?: number;
  occupiedRoomsInBlocks?: number;
  availableRoomsInBlocks?: number;
  studentsInBlocks?: number;
  recentComplaints?: Complaint[];
  recentLeaves?: Leave[];
  blockStudents?: Array<{
    name: string;
    studentId: string;
    roomNumber: string;
    block: string;
    isAllocated: boolean;
  }>;
  myComplaints?: number;
}