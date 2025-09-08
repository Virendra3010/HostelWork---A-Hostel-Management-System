const Complaint = require('../models/Complaint');
const Room = require('../models/Room');
const NotificationService = require('../services/notificationService');
const { paginate, buildSearchQuery } = require('../utils/pagination');

// Create complaint
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    // Find student's room
    const room = await Room.findOne({
      'occupants.student': req.user.id
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'You must be allocated a room to file a complaint'
      });
    }

    const complaint = await Complaint.create({
      student: req.user.id,
      room: room._id,
      title,
      description,
      category,
      priority: priority || 'medium'
    });

    await complaint.populate('student', 'name email studentId');
    await complaint.populate('room', 'roomNumber block floor');

    // Send notifications (exclude current user)
    await NotificationService.notifyComplaintCreated(complaint, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully',
      complaint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get complaints with pagination and filtering
const getComplaints = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      search,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Add search functionality
    if (search) {
      const searchQuery = buildSearchQuery(search, ['title', 'description']);
      filter = { ...filter, ...searchQuery };
    }

    // Students can only see their own complaints
    if (req.user.role === 'student') {
      filter.student = req.user.id;
    }

    // Wardens can see complaints from their assigned blocks
    if (req.user.role === 'warden') {
      const User = require('../models/User');
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

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await paginate(Complaint, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [
        { path: 'student', select: 'name email studentId' },
        { path: 'room', select: 'roomNumber block floor' },
        { path: 'assignedTo', select: 'name email' },
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

// Update complaint status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, adminRemarks, assignedTo, title, description, category, priority } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('room', 'roomNumber block floor');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Students can only update their own pending complaints
    if (req.user.role === 'student') {
      if (complaint.student.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own complaints'
        });
      }
      
      if (complaint.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You can only update complaints that are still pending'
        });
      }
      
      // Students can only update complaint details, not status
      complaint.title = title || complaint.title;
      complaint.description = description || complaint.description;
      complaint.category = category || complaint.category;
      complaint.priority = priority || complaint.priority;
    } else {
      // Admin/Warden can update status and remarks
      const changes = {};
      
      if (status && status !== complaint.status) {
        complaint.status = status;
        changes.status = status;
      }
      
      if (adminRemarks) {
        complaint.adminRemarks = adminRemarks;
        complaint.remarksBy = req.user.id;
        complaint.remarksRole = req.user.role;
        changes.adminRemarks = adminRemarks;
      }
      
      complaint.assignedTo = assignedTo || complaint.assignedTo;
      
      if (status === 'resolved') {
        complaint.resolvedDate = new Date();
        // Send notification to student
        await NotificationService.notifyComplaintResolved(complaint);
      } else if (Object.keys(changes).length > 0) {
        // Send notification for other updates
        await NotificationService.notifyComplaintUpdated(complaint, req.user, changes);
      }
    }

    await complaint.save();

    await complaint.populate('student', 'name email studentId');
    await complaint.populate('room', 'roomNumber block floor');
    await complaint.populate('assignedTo', 'name email');
    await complaint.populate('remarksBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete complaint
const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Students can only delete their own pending complaints
    if (req.user.role === 'student') {
      if (complaint.student.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own complaints'
        });
      }
      
      if (complaint.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You can only delete complaints that are still pending'
        });
      }
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get complaint statistics (totals without pagination)
const getComplaintStats = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      search
    } = req.query;
    
    let filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (search) {
      const searchQuery = buildSearchQuery(search, ['title', 'description']);
      filter = { ...filter, ...searchQuery };
    }

    // Students can only see their own complaints
    if (req.user.role === 'student') {
      const mongoose = require('mongoose');
      filter.student = new mongoose.Types.ObjectId(req.user.id);
    }

    // Wardens can see complaints from their assigned blocks
    if (req.user.role === 'warden') {
      const User = require('../models/User');
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
            totalComplaints: 0,
            pendingComplaints: 0,
            inProgressComplaints: 0,
            resolvedComplaints: 0,
            rejectedComplaints: 0
          },
          priority: { urgent: 0, high: 0, medium: 0, low: 0 },
          distribution: { byCategory: [] },
          insights: { resolutionRate: 0 }
        });
      }
    }

    // Calculate statistics using aggregation
    const stats = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          rejectedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          urgentCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
          },
          highCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
          },
          mediumCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] }
          },
          lowCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalComplaints: 0,
      pendingComplaints: 0,
      inProgressComplaints: 0,
      resolvedComplaints: 0,
      rejectedComplaints: 0,
      urgentCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0
    };

    const resolutionRate = result.totalComplaints > 0 
      ? Math.round((result.resolvedComplaints / result.totalComplaints) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      overview: {
        totalComplaints: result.totalComplaints,
        pendingComplaints: result.pendingComplaints,
        inProgressComplaints: result.inProgressComplaints,
        resolvedComplaints: result.resolvedComplaints,
        rejectedComplaints: result.rejectedComplaints
      },
      priority: {
        urgent: result.urgentCount,
        high: result.highCount,
        medium: result.mediumCount,
        low: result.lowCount
      },
      distribution: {
        byCategory: categoryStats
      },
      insights: {
        resolutionRate
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
  createComplaint,
  getComplaints,
  getComplaintStats,
  updateComplaintStatus,
  deleteComplaint
};