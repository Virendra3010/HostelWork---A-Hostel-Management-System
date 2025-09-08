const Leave = require('../models/Leave');
const Room = require('../models/Room');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// Create leave request
const createLeave = async (req, res) => {
  try {
    const { leaveType, reason, startDate, endDate, emergencyContact } = req.body;

    // Find student's room
    const room = await Room.findOne({
      'occupants.student': req.user.id
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'You must be allocated a room to apply for leave'
      });
    }

    const leave = await Leave.create({
      student: req.user.id,
      room: room._id,
      leaveType,
      reason,
      startDate,
      endDate,
      emergencyContact
    });

    await leave.populate('student', 'name email studentId');
    await leave.populate('room', 'roomNumber block floor');

    // Send notifications to admin and wardens
    await NotificationService.notifyLeaveRequest(leave);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get leaves with pagination and filtering
const getLeaves = async (req, res) => {
  try {
    const {
      status,
      leaveType,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter = {};

    // Students can only see their own leaves
    if (req.user.role === 'student') {
      filter.student = req.user.id;
    }

    // Wardens can see leaves from their assigned blocks
    if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        const rooms = await Room.find({
          block: { $in: warden.assignedBlocks }
        });
        const roomIds = rooms.map(room => room._id);
        filter.room = { $in: roomIds };
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: limit }
        });
      }
    }

    // Apply filters
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    
    // Date range filtering
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Add search functionality
    if (search) {
      const { paginate, buildSearchQuery } = require('../utils/pagination');
      const searchQuery = buildSearchQuery(search, ['reason', 'leaveType']);
      filter = { ...filter, ...searchQuery };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const { paginate } = require('../utils/pagination');
    const result = await paginate(Leave, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [
        { path: 'student', select: 'name email studentId' },
        { path: 'room', select: 'roomNumber block floor' },
        { path: 'approvedBy', select: 'name email' },
        { path: 'remarksBy', select: 'name role' }
      ]
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update leave
const updateLeave = async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;
    const leave = await Leave.findById(req.params.id).populate('room', 'roomNumber block floor').populate('student', 'name email studentId');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Students can only update their own pending leaves
    if (req.user.role === 'student') {
      if (leave.student.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own leave requests'
        });
      }
      
      if (leave.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You can only update pending leave requests'
        });
      }
      
      // Students can update leave details
      const { leaveType, reason, startDate, endDate, emergencyContact } = req.body;
      leave.leaveType = leaveType || leave.leaveType;
      leave.reason = reason || leave.reason;
      leave.startDate = startDate || leave.startDate;
      leave.endDate = endDate || leave.endDate;
      leave.emergencyContact = emergencyContact || leave.emergencyContact;
    } else {
      // Admin/Warden can approve/reject
      const changes = {};
      
      if (status && status !== leave.status) {
        leave.status = status;
        changes.status = status;
      }
      
      if (adminRemarks) {
        leave.adminRemarks = adminRemarks;
        leave.remarksBy = req.user.id;
        leave.remarksRole = req.user.role;
        changes.adminRemarks = adminRemarks;
      }
      
      if (status === 'approved' || status === 'rejected') {
        leave.approvedBy = req.user.id;
        leave.approvedDate = new Date();
        // Send specific approved/rejected notification to student
        await NotificationService.notifyLeaveStatusUpdate(leave, status);
        // Also send cross-role notifications for status changes
        if (Object.keys(changes).length > 0) {
          await NotificationService.notifyLeaveUpdated(leave, req.user, changes);
        }
      } else if (Object.keys(changes).length > 0) {
        // Send general update notification
        await NotificationService.notifyLeaveUpdated(leave, req.user, changes);
      }
    }

    await leave.save();

    await leave.populate('student', 'name email studentId');
    await leave.populate('room', 'roomNumber block floor');
    await leave.populate('approvedBy', 'name email');
    await leave.populate('remarksBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete leave
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Students can only delete their own pending leaves
    if (req.user.role === 'student') {
      if (leave.student.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own leave requests'
        });
      }
      
      if (leave.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You can only delete pending leave requests'
        });
      }
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get leave statistics (totals without pagination)
const getLeaveStats = async (req, res) => {
  try {
    const {
      status,
      leaveType,
      search,
      startDate,
      endDate
    } = req.query;
    
    let filter = {};

    // Students can only see their own leaves
    if (req.user.role === 'student') {
      const mongoose = require('mongoose');
      filter.student = new mongoose.Types.ObjectId(req.user.id);
    }

    // Wardens can see leaves from their assigned blocks
    if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        const rooms = await Room.find({
          block: { $in: warden.assignedBlocks }
        });
        const roomIds = rooms.map(room => room._id);
        filter.room = { $in: roomIds };
      } else {
        return res.status(200).json({
          success: true,
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
    }

    // Apply same filters as getLeaves
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    if (search) {
      const { buildSearchQuery } = require('../utils/pagination');
      const searchQuery = buildSearchQuery(search, ['reason', 'leaveType']);
      filter = { ...filter, ...searchQuery };
    }

    // Calculate statistics using aggregation
    const stats = await Leave.aggregate([
      { $match: filter },
      {
        $addFields: {
          duration: {
            $add: [
              {
                $divide: [
                  { $subtract: ['$endDate', '$startDate'] },
                  1000 * 60 * 60 * 24
                ]
              },
              1
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalLeaves: { $sum: 1 },
          pendingLeaves: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedLeaves: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedLeaves: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          personalCount: {
            $sum: { $cond: [{ $eq: ['$leaveType', 'personal'] }, 1, 0] }
          },
          medicalCount: {
            $sum: { $cond: [{ $eq: ['$leaveType', 'medical'] }, 1, 0] }
          },
          emergencyCount: {
            $sum: { $cond: [{ $eq: ['$leaveType', 'emergency'] }, 1, 0] }
          },
          homeCount: {
            $sum: { $cond: [{ $eq: ['$leaveType', 'home'] }, 1, 0] }
          },
          otherCount: {
            $sum: { $cond: [{ $eq: ['$leaveType', 'other'] }, 1, 0] }
          },
          totalDays: { $sum: '$duration' }
        }
      }
    ]);

    // Get type distribution
    const typeStats = await Leave.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalLeaves: 0,
      pendingLeaves: 0,
      approvedLeaves: 0,
      rejectedLeaves: 0,
      personalCount: 0,
      medicalCount: 0,
      emergencyCount: 0,
      homeCount: 0,
      otherCount: 0,
      totalDays: 0
    };

    const approvalRate = result.totalLeaves > 0 
      ? Math.round((result.approvedLeaves / result.totalLeaves) * 100) 
      : 0;
    
    const avgDuration = result.totalLeaves > 0 
      ? Math.round(result.totalDays / result.totalLeaves) 
      : 0;

    res.status(200).json({
      success: true,
      overview: {
        totalLeaves: result.totalLeaves,
        pendingLeaves: result.pendingLeaves,
        approvedLeaves: result.approvedLeaves,
        rejectedLeaves: result.rejectedLeaves
      },
      leaveTypes: {
        personal: result.personalCount,
        medical: result.medicalCount,
        emergency: result.emergencyCount,
        home: result.homeCount,
        other: result.otherCount
      },
      distribution: {
        byType: typeStats
      },
      insights: {
        approvalRate,
        avgDuration
      }
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
  createLeave,
  getLeaves,
  getLeaveStats,
  updateLeave,
  deleteLeave
};