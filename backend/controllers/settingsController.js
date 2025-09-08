const Settings = require('../models/Settings');
const User = require('../models/User');

// Helper function to get student count in warden's assigned blocks
const getWardenBlockStudents = async (assignedBlocks) => {
  try {
    const Room = require('../models/Room');
    const rooms = await Room.find({ block: { $in: assignedBlocks } }).populate('occupants.student');
    let studentCount = 0;
    rooms.forEach(room => {
      studentCount += room.occupants.length;
    });
    return studentCount;
  } catch (error) {
    console.error('Error counting warden block students:', error);
    return 0;
  }
};

// Get system settings based on user role
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne().populate('lastUpdatedBy', 'name email');
    
    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        lastUpdatedBy: req.user.id
      });
      await settings.populate('lastUpdatedBy', 'name email');
    }

    // Filter settings based on user role
    let filteredSettings = {};
    
    if (req.user.role === 'admin' || req.user.role === 'Admin') {
      // Admin gets full access to all settings
      filteredSettings = settings.toObject();
    } else if (req.user.role === 'warden' || req.user.role === 'Warden') {
      // Warden gets limited access - only read-only academic and complaint settings
      filteredSettings = {
        _id: settings._id,
        hostelName: settings.hostelName,
        hostelAddress: settings.hostelAddress,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        feeSettings: settings.feeSettings, // Include for display (read-only)
        roomSettings: settings.roomSettings, // Include for display (read-only)
        notificationSettings: settings.notificationSettings, // Include for display (read-only)
        systemSettings: settings.systemSettings, // Include for display (read-only)
        academicSettings: settings.academicSettings,
        complaintSettings: settings.complaintSettings,
        lastUpdatedBy: settings.lastUpdatedBy,
        updatedAt: settings.updatedAt
      };
    } else {
      // Students get access to relevant information for their hostel life
      filteredSettings = {
        _id: settings._id,
        hostelName: settings.hostelName,
        hostelAddress: settings.hostelAddress,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        feeSettings: {
          monthlyFee: settings.feeSettings.monthlyFee,
          securityDeposit: settings.feeSettings.securityDeposit,
          lateFeePercentage: settings.feeSettings.lateFeePercentage,
          feeGracePeriodDays: settings.feeSettings.feeGracePeriodDays
        },
        roomSettings: {
          availableBlocks: settings.roomSettings.availableBlocks
        },
        academicSettings: {
          currentSemester: settings.academicSettings.currentSemester,
          semesterStartDate: settings.academicSettings.semesterStartDate,
          semesterEndDate: settings.academicSettings.semesterEndDate
        },
        complaintSettings: {
          escalationDays: settings.complaintSettings.escalationDays,
          allowAnonymousComplaints: settings.complaintSettings.allowAnonymousComplaints
        },
        lastUpdatedBy: settings.lastUpdatedBy,
        updatedAt: settings.updatedAt
      };
    }

    res.status(200).json({
      success: true,
      settings: filteredSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update system settings
const updateSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const updateData = {
      ...req.body,
      lastUpdatedBy: req.user.id
    };

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(updateData);
    } else {
      settings = await Settings.findOneAndUpdate(
        {},
        updateData,
        { new: true, runValidators: true }
      );
    }

    await settings.populate('lastUpdatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get system statistics based on user role
const getSystemStats = async (req, res) => {
  try {
    // Only admin and warden can access statistics
    if (req.user.role === 'student' || req.user.role === 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Statistics not available for students.'
      });
    }

    const Room = require('../models/Room');
    const Complaint = require('../models/Complaint');
    const Leave = require('../models/Leave');
    const Notification = require('../models/Notification');

    let statsQuery = {};
    
    // Filter data based on user role
    if (req.user.role === 'warden' || req.user.role === 'Warden') {
      // Wardens only see stats for their assigned blocks
      const wardenBlocks = req.user.assignedBlocks || [];
      statsQuery = { block: { $in: wardenBlocks } };
    }

    const [
      totalUsers,
      totalStudents,
      totalWardens,
      totalRooms,
      occupiedRooms,
      totalBlocks,
      wardenBlockStudents,
      totalComplaints,
      pendingComplaints,
      totalLeaves,
      pendingLeaves,
      totalNotifications,
      unreadNotifications
    ] = await Promise.all([
      (req.user.role === 'admin' || req.user.role === 'Admin') ? User.countDocuments({ isActive: true }) : 0,
      (req.user.role === 'admin' || req.user.role === 'Admin') ? User.countDocuments({ role: 'student', isActive: true }) : 0,
      (req.user.role === 'admin' || req.user.role === 'Admin') ? User.countDocuments({ role: 'warden', isActive: true }) : 0,
      Room.countDocuments((req.user.role === 'warden' || req.user.role === 'Warden') ? statsQuery : {}),
      Room.countDocuments({ ...statsQuery, isAvailable: false }),
      (req.user.role === 'admin' || req.user.role === 'Admin') ? Room.distinct('block').then(blocks => blocks.length) : 0,
      (req.user.role === 'warden' || req.user.role === 'Warden') ? getWardenBlockStudents(req.user.assignedBlocks || []) : 0,
      Complaint.countDocuments((req.user.role === 'warden' || req.user.role === 'Warden') ? { 'room.block': { $in: req.user.assignedBlocks || [] } } : {}),
      Complaint.countDocuments({ status: 'pending', ...((req.user.role === 'warden' || req.user.role === 'Warden') ? { 'room.block': { $in: req.user.assignedBlocks || [] } } : {}) }),
      Leave.countDocuments(),
      Leave.countDocuments({ status: 'pending' }),
      Notification.countDocuments((req.user.role === 'warden' || req.user.role === 'Warden') ? { recipient: req.user.id } : {}),
      Notification.countDocuments({ isRead: false, ...((req.user.role === 'warden' || req.user.role === 'Warden') ? { recipient: req.user.id } : {}) })
    ]);

    const stats = {
      users: (req.user.role === 'admin' || req.user.role === 'Admin') ? {
        total: totalUsers,
        students: totalStudents,
        wardens: totalWardens,
        admins: totalUsers - totalStudents - totalWardens
      } : (req.user.role === 'warden' || req.user.role === 'Warden') ? {
        students: wardenBlockStudents
      } : null,
      rooms: {
        total: totalRooms,
        occupied: occupiedRooms,
        available: totalRooms - occupiedRooms,
        occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
      },
      blocks: (req.user.role === 'admin' || req.user.role === 'Admin') ? {
        total: totalBlocks
      } : null,
      complaints: {
        total: totalComplaints,
        pending: pendingComplaints,
        resolved: totalComplaints - pendingComplaints
      },
      leaves: {
        total: totalLeaves,
        pending: pendingLeaves,
        processed: totalLeaves - pendingLeaves
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: totalNotifications - unreadNotifications
      }
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Reset system settings to default
const resetSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    await Settings.deleteMany({});
    
    const defaultSettings = await Settings.create({
      lastUpdatedBy: req.user.id
    });

    await defaultSettings.populate('lastUpdatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Settings reset to default successfully',
      settings: defaultSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Backup system data
const backupData = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const Room = require('../models/Room');
    const Complaint = require('../models/Complaint');
    const Leave = require('../models/Leave');
    const Notification = require('../models/Notification');

    const [users, rooms, complaints, leaves, notifications, settings] = await Promise.all([
      User.find().select('-password'),
      Room.find(),
      Complaint.find(),
      Leave.find(),
      Notification.find(),
      Settings.find()
    ]);

    const backupData = {
      timestamp: new Date(),
      version: '1.0',
      data: {
        users,
        rooms,
        complaints,
        leaves,
        notifications,
        settings
      }
    };

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      backup: backupData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSystemStats,
  resetSettings,
  backupData
};