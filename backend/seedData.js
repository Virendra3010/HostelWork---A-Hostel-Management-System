const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Room = require('./models/Room');
const Complaint = require('./models/Complaint');
const Leave = require('./models/Leave');
const Announcement = require('./models/Announcement');
const Fee = require('./models/Fee');
const HostelInfo = require('./models/HostelInfo');
const Settings = require('./models/Settings');
const Notification = require('./models/Notification');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-management');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Clear all existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Room.deleteMany({});
    await Complaint.deleteMany({});
    await Leave.deleteMany({});
    await Announcement.deleteMany({});
    await Fee.deleteMany({});
    await HostelInfo.deleteMany({});
    await Settings.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed Users
const seedUsers = async () => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      // Admin
      {
        name: 'Admin User',
        email: 'admin@hostel.com',
        password: hashedPassword,
        role: 'admin',
        phone: '9876543210',
        isActive: true
      },
      
      // Wardens
      {
        name: 'John Smith',
        email: 'john.warden@hostel.com',
        password: hashedPassword,
        role: 'warden',
        phone: '9876543211',
        wardenId: 'W001',
        assignedBlocks: ['A', 'B'],
        isActive: true
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.warden@hostel.com',
        password: hashedPassword,
        role: 'warden',
        phone: '9876543212',
        wardenId: 'W002',
        assignedBlocks: ['C', 'D'],
        isActive: true
      },
      {
        name: 'Michael Brown',
        email: 'michael.warden@hostel.com',
        password: hashedPassword,
        role: 'warden',
        phone: '9876543233',
        wardenId: 'W003',
        assignedBlocks: ['A'],
        isActive: true
      },
      {
        name: 'Emma Wilson',
        email: 'emma.warden@hostel.com',
        password: hashedPassword,
        role: 'warden',
        phone: '9876543234',
        wardenId: 'W004',
        assignedBlocks: ['B'],
        isActive: true
      },
      
      // Students - Block A
      {
        name: 'Alice Cooper',
        email: 'alice@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543213',
        studentId: 'ST001',
        course: 'Computer Science',
        year: 2,
        guardianName: 'Robert Cooper',
        guardianPhone: '9876543313',
        address: '123 Main St, City A',
        preferredBlock: 'A',
        isActive: true
      },
      {
        name: 'Bob Wilson',
        email: 'bob@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543214',
        studentId: 'ST002',
        course: 'Mechanical Engineering',
        year: 3,
        guardianName: 'Mary Wilson',
        guardianPhone: '9876543314',
        address: '456 Oak Ave, City B',
        preferredBlock: 'A',
        isActive: true
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543215',
        studentId: 'ST003',
        course: 'Electrical Engineering',
        year: 1,
        guardianName: 'David Brown',
        guardianPhone: '9876543315',
        address: '789 Pine St, City C',
        preferredBlock: 'A',
        isActive: true
      },
      
      // Students - Block B
      {
        name: 'Diana Prince',
        email: 'diana@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543216',
        studentId: 'ST004',
        course: 'Civil Engineering',
        year: 4,
        guardianName: 'Steve Prince',
        guardianPhone: '9876543316',
        address: '321 Elm St, City D',
        preferredBlock: 'B',
        isActive: true
      },
      {
        name: 'Edward Davis',
        email: 'edward@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543217',
        studentId: 'ST005',
        course: 'Information Technology',
        year: 2,
        guardianName: 'Linda Davis',
        guardianPhone: '9876543317',
        address: '654 Maple Ave, City E',
        preferredBlock: 'B',
        isActive: true
      },
      {
        name: 'Fiona Green',
        email: 'fiona@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543218',
        studentId: 'ST006',
        course: 'Chemical Engineering',
        year: 3,
        guardianName: 'Michael Green',
        guardianPhone: '9876543318',
        address: '987 Cedar St, City F',
        preferredBlock: 'B',
        isActive: true
      },
      
      // Students - Block C
      {
        name: 'George Miller',
        email: 'george@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543219',
        studentId: 'ST007',
        course: 'Biotechnology',
        year: 1,
        guardianName: 'Patricia Miller',
        guardianPhone: '9876543319',
        address: '147 Birch St, City G',
        preferredBlock: 'C',
        isActive: true
      },
      {
        name: 'Hannah White',
        email: 'hannah@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543220',
        studentId: 'ST008',
        course: 'Electronics Engineering',
        year: 2,
        guardianName: 'James White',
        guardianPhone: '9876543320',
        address: '258 Spruce Ave, City H',
        preferredBlock: 'C',
        isActive: true
      },
      
      // Students - Block D
      {
        name: 'Ian Black',
        email: 'ian@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543221',
        studentId: 'ST009',
        course: 'Aerospace Engineering',
        year: 4,
        guardianName: 'Susan Black',
        guardianPhone: '9876543321',
        address: '369 Willow St, City I',
        preferredBlock: 'D',
        isActive: true
      },
      {
        name: 'Julia Gray',
        email: 'julia@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543222',
        studentId: 'ST010',
        course: 'Environmental Engineering',
        year: 3,
        guardianName: 'Thomas Gray',
        guardianPhone: '9876543322',
        address: '741 Poplar Ave, City J',
        preferredBlock: 'D',
        isActive: true
      },
      
      // Additional Students
      {
        name: 'Kevin Brown',
        email: 'kevin@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543223',
        studentId: 'ST011',
        course: 'Computer Science',
        year: 1,
        guardianName: 'Nancy Brown',
        guardianPhone: '9876543323',
        address: '852 Oak St, City K',
        preferredBlock: 'A',
        isActive: true
      },
      {
        name: 'Lisa Wilson',
        email: 'lisa@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543224',
        studentId: 'ST012',
        course: 'Data Science',
        year: 2,
        guardianName: 'Mark Wilson',
        guardianPhone: '9876543324',
        address: '963 Pine Ave, City L',
        preferredBlock: 'B',
        isActive: true
      },
      {
        name: 'Mike Johnson',
        email: 'mike@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543225',
        studentId: 'ST013',
        course: 'Artificial Intelligence',
        year: 3,
        guardianName: 'Sarah Johnson',
        guardianPhone: '9876543325',
        address: '174 Elm St, City M',
        preferredBlock: 'C',
        isActive: true
      },
      {
        name: 'Nina Davis',
        email: 'nina@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543226',
        studentId: 'ST014',
        course: 'Cybersecurity',
        year: 4,
        guardianName: 'Paul Davis',
        guardianPhone: '9876543326',
        address: '285 Maple St, City N',
        preferredBlock: 'D',
        isActive: true
      },
      {
        name: 'Oscar Martinez',
        email: 'oscar@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543227',
        studentId: 'ST015',
        course: 'Software Engineering',
        year: 2,
        guardianName: 'Maria Martinez',
        guardianPhone: '9876543327',
        address: '396 Cedar Ave, City O',
        preferredBlock: 'A',
        isActive: true
      },
      {
        name: 'Paula Garcia',
        email: 'paula@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543228',
        studentId: 'ST016',
        course: 'Network Engineering',
        year: 1,
        guardianName: 'Carlos Garcia',
        guardianPhone: '9876543328',
        address: '507 Birch St, City P',
        preferredBlock: 'B',
        isActive: true
      },
      {
        name: 'Quinn Taylor',
        email: 'quinn@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543229',
        studentId: 'ST017',
        course: 'Machine Learning',
        year: 3,
        guardianName: 'Jennifer Taylor',
        guardianPhone: '9876543329',
        address: '618 Spruce Ave, City Q',
        preferredBlock: 'C',
        isActive: true
      },
      {
        name: 'Rachel Lee',
        email: 'rachel@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543230',
        studentId: 'ST018',
        course: 'Information Systems',
        year: 4,
        guardianName: 'David Lee',
        guardianPhone: '9876543330',
        address: '729 Willow St, City R',
        preferredBlock: 'D',
        isActive: true
      },
      {
        name: 'Sam Anderson',
        email: 'sam@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543231',
        studentId: 'ST019',
        course: 'Robotics Engineering',
        year: 2,
        guardianName: 'Lisa Anderson',
        guardianPhone: '9876543331',
        address: '840 Poplar Ave, City S',
        preferredBlock: 'A',
        isActive: true
      },
      {
        name: 'Tina Clark',
        email: 'tina@student.com',
        password: hashedPassword,
        role: 'student',
        phone: '9876543232',
        studentId: 'ST020',
        course: 'Biomedical Engineering',
        year: 1,
        guardianName: 'Robert Clark',
        guardianPhone: '9876543332',
        address: '951 Oak Ave, City T',
        preferredBlock: 'B',
        isActive: true
      }
    ];
    
    const createdUsers = await User.insertMany(users);
    console.log('✅ Users seeded successfully');
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

// Seed Rooms
const seedRooms = async () => {
  try {
    const rooms = [];
    const blocks = ['A', 'B', 'C', 'D'];
    const roomTypes = ['single', 'double', 'triple', 'quad'];
    const amenities = ['WiFi', 'Study Table', 'Wardrobe', 'Fan'];
    const premiumAmenities = ['AC', 'Attached Bathroom', 'Balcony', 'Geyser'];
    
    let roomCounter = 1;
    
    for (const block of blocks) {
      for (let floor = 1; floor <= 3; floor++) {
        for (let roomInFloor = 1; roomInFloor <= 8; roomInFloor++) {
          const roomNumber = `${block}${floor}${roomInFloor.toString().padStart(2, '0')}`;
          const capacity = Math.floor(Math.random() * 4) + 1;
          const roomType = roomTypes[capacity - 1];
          const isAC = Math.random() > 0.7;
          const baseRent = capacity === 1 ? 8000 : capacity === 2 ? 6000 : capacity === 3 ? 5000 : 4000;
          const monthlyRent = isAC ? baseRent + 2000 : baseRent;
          
          const roomAmenities = [...amenities];
          if (isAC) roomAmenities.push('AC');
          if (Math.random() > 0.5) roomAmenities.push('Attached Bathroom');
          if (floor === 3 && Math.random() > 0.6) roomAmenities.push('Balcony');
          if (Math.random() > 0.4) roomAmenities.push('Geyser');
          
          rooms.push({
            roomNumber,
            block,
            floor,
            capacity,
            roomType,
            amenities: roomAmenities,
            monthlyRent,
            isAvailable: true,
            maintenanceStatus: Math.random() > 0.9 ? 'needs_repair' : 'good',
            occupants: []
          });
          
          roomCounter++;
        }
      }
    }
    
    const createdRooms = await Room.insertMany(rooms);
    console.log('✅ Rooms seeded successfully');
    return createdRooms;
  } catch (error) {
    console.error('Error seeding rooms:', error);
  }
};

// Allocate students to rooms
const allocateStudentsToRooms = async (users, rooms) => {
  try {
    const students = users.filter(user => user.role === 'student');
    
    // Allocate specific students to specific rooms for testing
    const allocations = [
      { studentEmail: 'alice@student.com', roomNumber: 'A101' },
      { studentEmail: 'bob@student.com', roomNumber: 'A101' },
      { studentEmail: 'charlie@student.com', roomNumber: 'A102' },
      { studentEmail: 'kevin@student.com', roomNumber: 'A102' },
      { studentEmail: 'oscar@student.com', roomNumber: 'A103' },
      { studentEmail: 'sam@student.com', roomNumber: 'A103' },
      { studentEmail: 'diana@student.com', roomNumber: 'B201' },
      { studentEmail: 'edward@student.com', roomNumber: 'B201' },
      { studentEmail: 'fiona@student.com', roomNumber: 'B202' },
      { studentEmail: 'lisa@student.com', roomNumber: 'B202' },
      { studentEmail: 'paula@student.com', roomNumber: 'B203' },
      { studentEmail: 'tina@student.com', roomNumber: 'B203' },
      { studentEmail: 'george@student.com', roomNumber: 'C301' },
      { studentEmail: 'hannah@student.com', roomNumber: 'C301' },
      { studentEmail: 'mike@student.com', roomNumber: 'C302' },
      { studentEmail: 'quinn@student.com', roomNumber: 'C302' },
      { studentEmail: 'ian@student.com', roomNumber: 'D101' },
      { studentEmail: 'julia@student.com', roomNumber: 'D102' },
      { studentEmail: 'nina@student.com', roomNumber: 'D102' },
      { studentEmail: 'rachel@student.com', roomNumber: 'D103' }
    ];
    
    for (const allocation of allocations) {
      const student = students.find(s => s.email === allocation.studentEmail);
      const room = rooms.find(r => r.roomNumber === allocation.roomNumber);
      
      if (student && room && room.occupants.length < room.capacity) {
        room.occupants.push({
          student: student._id,
          joinDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date within last 90 days
        });
        await room.save();
      }
    }
    
    console.log('✅ Students allocated to rooms successfully');
  } catch (error) {
    console.error('Error allocating students to rooms:', error);
  }
};

// Seed Announcements
const seedAnnouncements = async (users) => {
  try {
    const admin = users.find(user => user.role === 'admin');
    const wardens = users.filter(user => user.role === 'warden');
    
    const announcements = [
      {
        title: 'Welcome to New Academic Year 2024',
        content: 'We welcome all students to the new academic year. Please ensure you complete your registration and room allocation process.',
        author: admin._id,
        targetAudience: 'all',
        priority: 'high',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Mess Timing Changes',
        content: 'New mess timings: Breakfast 7:00-9:00 AM, Lunch 12:00-2:00 PM, Dinner 7:00-9:00 PM. Please adhere to these timings.',
        author: admin._id,
        targetAudience: 'students',
        priority: 'medium',
        isActive: true
      },
      {
        title: 'Block A Maintenance Notice',
        content: 'Scheduled maintenance for Block A electrical systems on Saturday. Power will be off from 9 AM to 5 PM.',
        author: wardens[0]._id,
        targetAudience: 'specific_blocks',
        targetBlocks: ['A'],
        priority: 'high',
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'WiFi Password Update',
        content: 'WiFi password has been updated for security reasons. New password: Hostel2024@Secure. Please update your devices.',
        author: admin._id,
        targetAudience: 'all',
        priority: 'medium',
        isActive: true
      },
      {
        title: 'Warden Meeting Schedule',
        content: 'Monthly warden meeting scheduled for next Monday at 10 AM in the admin office. Please confirm your attendance.',
        author: admin._id,
        targetAudience: 'wardens',
        priority: 'medium',
        isActive: true
      },
      {
        title: 'New Security Measures',
        content: 'Enhanced security measures implemented. All visitors must register at the main gate and carry visitor passes.',
        author: admin._id,
        targetAudience: 'all',
        priority: 'high',
        isActive: true
      },
      {
        title: 'Library Hours Extended',
        content: 'Library hours extended till 11 PM on weekdays and 9 PM on weekends for better study environment.',
        author: admin._id,
        targetAudience: 'students',
        priority: 'medium',
        isActive: true
      },
      {
        title: 'Block C Water Supply Maintenance',
        content: 'Water supply maintenance in Block C scheduled for Sunday 6 AM to 2 PM. Please store water in advance.',
        author: wardens[1]._id,
        targetAudience: 'specific_blocks',
        targetBlocks: ['C'],
        priority: 'high',
        isActive: true,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ];
    
    await Announcement.insertMany(announcements);
    console.log('✅ Announcements seeded successfully');
  } catch (error) {
    console.error('Error seeding announcements:', error);
  }
};

// Seed Complaints
const seedComplaints = async (users, rooms) => {
  try {
    const students = users.filter(user => user.role === 'student');
    const wardens = users.filter(user => user.role === 'warden');
    
    const complaintData = [
      { studentIndex: 0, roomNumber: 'A101', title: 'AC Not Working', description: 'The air conditioner in our room has stopped working since yesterday. It\'s getting very hot.', category: 'electrical', priority: 'high', status: 'in_progress', wardenIndex: 0 },
      { studentIndex: 2, roomNumber: 'A102', title: 'Water Leakage in Bathroom', description: 'There is continuous water leakage from the bathroom ceiling. Please fix it urgently.', category: 'plumbing', priority: 'urgent', status: 'pending' },
      { studentIndex: 3, roomNumber: 'B201', title: 'Broken Window', description: 'The window glass is cracked and needs replacement for security reasons.', category: 'maintenance', priority: 'medium', status: 'resolved', wardenIndex: 0, remarks: 'Window has been replaced with new glass.' },
      { studentIndex: 5, roomNumber: 'B202', title: 'Room Cleaning Issue', description: 'The cleaning staff has not been cleaning our room properly for the past week.', category: 'cleanliness', priority: 'low', status: 'pending' },
      { studentIndex: 6, roomNumber: 'C301', title: 'WiFi Connection Problem', description: 'WiFi signal is very weak in our room. Unable to attend online classes properly.', category: 'electrical', priority: 'high', status: 'pending' },
      { studentIndex: 8, roomNumber: 'D101', title: 'Door Lock Malfunction', description: 'Room door lock is not working properly. Sometimes it gets stuck.', category: 'maintenance', priority: 'medium', status: 'in_progress', wardenIndex: 1 },
      { studentIndex: 10, roomNumber: 'A103', title: 'Security Concern', description: 'Main entrance door is not locking properly at night, security issue.', category: 'security', priority: 'high', status: 'pending' },
      { studentIndex: 12, roomNumber: 'C302', title: 'Bathroom Tap Leaking', description: 'Bathroom tap has been leaking continuously for 3 days, wasting water.', category: 'plumbing', priority: 'medium', status: 'pending' },
      { studentIndex: 14, roomNumber: 'D102', title: 'Room Ventilation Issue', description: 'Room has poor ventilation, very stuffy and uncomfortable.', category: 'other', priority: 'low', status: 'pending' }
    ];
    
    const complaints = [];
    
    for (const data of complaintData) {
      const student = students[data.studentIndex];
      const room = rooms.find(r => r.roomNumber === data.roomNumber);
      
      if (student && room) {
        const complaint = {
          student: student._id,
          room: room._id,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: data.status
        };
        
        if (data.wardenIndex !== undefined && wardens[data.wardenIndex]) {
          complaint.assignedTo = wardens[data.wardenIndex]._id;
        }
        
        if (data.remarks) {
          complaint.adminRemarks = data.remarks;
          complaint.resolvedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        }
        
        complaints.push(complaint);
      }
    }
    
    if (complaints.length > 0) {
      await Complaint.insertMany(complaints);
      console.log(`✅ ${complaints.length} Complaints seeded successfully`);
    } else {
      console.log('⚠️ No complaints could be created - check student/room data');
    }
  } catch (error) {
    console.error('Error seeding complaints:', error);
  }
};

// Seed Leave Requests
const seedLeaves = async (users, rooms) => {
  try {
    const students = users.filter(user => user.role === 'student');
    const wardens = users.filter(user => user.role === 'warden');
    
    const leaves = [
      {
        student: students[0]._id,
        room: rooms.find(r => r.roomNumber === 'A101')._id,
        leaveType: 'home',
        reason: 'Going home for sister\'s wedding ceremony',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'approved',
        approvedBy: wardens[0]._id,
        adminRemarks: 'Approved for family function',
        approvedDate: new Date(),
        emergencyContact: {
          name: 'Robert Cooper',
          phone: '9876543313',
          relation: 'Father'
        }
      },
      {
        student: students[1]._id,
        room: rooms.find(r => r.roomNumber === 'A101')._id,
        leaveType: 'medical',
        reason: 'Medical checkup and treatment at home',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'pending',
        emergencyContact: {
          name: 'Mary Wilson',
          phone: '9876543314',
          relation: 'Mother'
        }
      },
      {
        student: students[3]._id,
        room: rooms.find(r => r.roomNumber === 'B201')._id,
        leaveType: 'emergency',
        reason: 'Grandfather is seriously ill, need to visit immediately',
        startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: 'approved',
        approvedBy: wardens[1]._id,
        adminRemarks: 'Emergency leave approved',
        approvedDate: new Date(),
        emergencyContact: {
          name: 'Steve Prince',
          phone: '9876543316',
          relation: 'Father'
        }
      },
      {
        student: students[6]._id,
        room: rooms.find(r => r.roomNumber === 'C301')._id,
        leaveType: 'personal',
        reason: 'Attending cousin\'s graduation ceremony',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        status: 'pending',
        emergencyContact: {
          name: 'Patricia Miller',
          phone: '9876543319',
          relation: 'Mother'
        }
      },
      {
        student: students[11] ? students[11]._id : students[5]._id,
        room: rooms.find(r => r.roomNumber === 'B203') || rooms.find(r => r.roomNumber === 'B202'),
        leaveType: 'medical',
        reason: 'Dental treatment appointment',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'approved',
        approvedBy: wardens[0]._id,
        adminRemarks: 'Medical leave approved',
        approvedDate: new Date(),
        emergencyContact: {
          name: 'Mark Wilson',
          phone: '9876543324',
          relation: 'Father'
        }
      }
    ];
    
    await Leave.insertMany(leaves);
    console.log('✅ Leave requests seeded successfully');
  } catch (error) {
    console.error('Error seeding leaves:', error);
  }
};

// Seed Fees
const seedFees = async (users, rooms) => {
  try {
    const students = users.filter(user => user.role === 'student');
    const allocatedRooms = rooms.filter(room => room.occupants.length > 0);
    
    const fees = [];
    const currentYear = new Date().getFullYear();
    
    for (const room of allocatedRooms) {
      for (const occupant of room.occupants) {
        const student = students.find(s => s._id.toString() === occupant.student.toString());
        if (student) {
          // Create semester fees
          const roomRent = room.monthlyRent * 6; // 6 months
          const messFee = 3000 * 6;
          const electricityBill = 500 * 6;
          const maintenanceFee = 200 * 6;
          const totalAmount = roomRent + messFee + electricityBill + maintenanceFee;
          
          // Fall semester fee (some paid, some pending)
          const paidAmount = Math.random() > 0.5 ? totalAmount : Math.floor(totalAmount * Math.random());
          
          fees.push({
            student: student._id,
            room: room._id,
            feeType: 'semester',
            semester: 'Fall',
            year: currentYear,
            roomRent,
            messFee,
            electricityBill,
            maintenanceFee,
            totalAmount,
            paidAmount,
            dueAmount: totalAmount - paidAmount,
            status: paidAmount === totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
            dueDate: new Date(currentYear, 11, 15), // December 15
            paidDate: paidAmount > 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
            paymentMethod: paidAmount > 0 ? ['online', 'card', 'upi', 'cash'][Math.floor(Math.random() * 4)] : null,
            transactionId: paidAmount > 0 ? `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null
          });
        }
      }
    }
    
    await Fee.insertMany(fees);
    console.log('✅ Fees seeded successfully');
  } catch (error) {
    console.error('Error seeding fees:', error);
  }
};

// Seed Hostel Info
const seedHostelInfo = async () => {
  try {
    const hostelInfo = {
      name: 'Excellence Hostel',
      address: '123 University Campus, Education City, State 12345',
      phone: '9876543200',
      email: 'info@excellencehostel.edu',
      website: 'https://excellencehostel.edu',
      description: 'Excellence Hostel provides comfortable and secure accommodation for students with modern amenities and 24/7 support.',
      facilities: [
        'WiFi Internet',
        '24/7 Security',
        'Mess Facility',
        'Laundry Service',
        'Recreation Room',
        'Study Hall',
        'Medical Facility',
        'Parking Area'
      ],
      rules: [
        'No smoking or alcohol consumption',
        'Visitors allowed only during specified hours',
        'Maintain cleanliness in rooms and common areas',
        'No loud music after 10 PM',
        'Report any maintenance issues immediately'
      ],
      wardenContact: '9876543201',
      emergencyContact: '9876543202'
    };
    
    await HostelInfo.create(hostelInfo);
    console.log('✅ Hostel info seeded successfully');
  } catch (error) {
    console.error('Error seeding hostel info:', error);
  }
};

// Seed Settings
const seedSettings = async () => {
  try {
    const settings = {
      siteName: 'Excellence Hostel Management',
      siteDescription: 'Complete hostel management solution',
      maintenanceMode: false,
      allowRegistration: true,
      emailNotifications: true,
      smsNotifications: false,
      maxFileSize: 5242880, // 5MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      sessionTimeout: 3600000, // 1 hour
      passwordPolicy: {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false
      }
    };
    
    await Settings.create(settings);
    console.log('✅ Settings seeded successfully');
  } catch (error) {
    console.error('Error seeding settings:', error);
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const users = await seedUsers();
    const rooms = await seedRooms();
    
    await allocateStudentsToRooms(users, rooms);
    await seedAnnouncements(users);
    await seedComplaints(users, rooms);
    await seedLeaves(users, rooms);
    await seedFees(users, rooms);
    await seedHostelInfo();
    await seedSettings();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Admin: admin@hostel.com / password123');
    console.log('Warden 1: john.warden@hostel.com / password123 (Blocks A, B)');
    console.log('Warden 2: sarah.warden@hostel.com / password123 (Blocks C, D)');
    console.log('Student: alice@student.com / password123 (Block A)');
    console.log('Student: diana@student.com / password123 (Block B)');
    console.log('Student: george@student.com / password123 (Block C)');
    console.log('Student: ian@student.com / password123 (Block D)');
    console.log('Additional Wardens: michael.warden@hostel.com / password123');
    console.log('Additional Wardens: emma.warden@hostel.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();