const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Complaint = require('../models/Complaint');
const Leave = require('../models/Leave');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const stats = {};

    if (req.user.role === 'admin') {
      // Admin dashboard stats
      stats.totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      stats.totalWardens = await User.countDocuments({ role: 'warden', isActive: true });
      stats.totalRooms = await Room.countDocuments();
      stats.occupiedRooms = await Room.countDocuments({ isAvailable: false });
      stats.availableRooms = await Room.countDocuments({ isAvailable: true });
      stats.occupancyRate = Math.round((stats.occupiedRooms / stats.totalRooms) * 100);
      
      const currentYear = new Date().getFullYear();
      
      // Revenue tracking
      const totalRevenueData = await Fee.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]);
      stats.totalRevenue = totalRevenueData[0]?.total || 0;
      
      // Pending fees
      stats.pendingFees = await Fee.countDocuments({ status: { $in: ['pending', 'partial'] } });
      stats.totalDue = await Fee.aggregate([
        { $match: { status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } }
      ]);
      stats.totalDue = stats.totalDue[0]?.total || 0;
      
      // Complaints
      stats.pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
      stats.totalComplaints = await Complaint.countDocuments();
      stats.resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
      stats.inProgressComplaints = await Complaint.countDocuments({ status: 'in_progress' });
      
      // Leaves
      stats.pendingLeaves = await Leave.countDocuments({ status: 'pending' });
      stats.approvedLeaves = await Leave.countDocuments({ status: 'approved' });
      stats.totalLeaves = await Leave.countDocuments();
      
      // Block-wise occupancy
      stats.blockOccupancy = await Room.aggregate([
        {
          $group: {
            _id: '$block',
            totalRooms: { $sum: 1 },
            occupiedRooms: { $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] } },
            availableRooms: { $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] } }
          }
        },
        {
          $project: {
            block: '$_id',
            totalRooms: 1,
            occupiedRooms: 1,
            availableRooms: 1,
            occupancyRate: {
              $multiply: [
                { $divide: ['$occupiedRooms', '$totalRooms'] },
                100
              ]
            }
          }
        },
        { $sort: { block: 1 } }
      ]);
      
      // Recent activities
      const recentComplaints = await Complaint.find()
        .populate('student', 'name studentId')
        .populate('room', 'roomNumber block')
        .sort({ createdAt: -1 })
        .limit(5);
        
      const recentLeaves = await Leave.find()
        .populate('student', 'name studentId')
        .sort({ createdAt: -1 })
        .limit(5);
        
      const recentRegistrations = await User.find({ role: 'student' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name studentId createdAt');
        
      stats.recentActivities = {
        complaints: recentComplaints,
        leaves: recentLeaves,
        registrations: recentRegistrations
      };
      
      // Fee collection trends
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      stats.feeCollectionTrend = await Fee.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalCollected: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      
      // Maintenance status
      stats.maintenanceStats = await Room.aggregate([
        {
          $group: {
            _id: '$maintenanceStatus',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Top complaint categories
      stats.complaintCategories = await Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
    } else if (req.user.role === 'student') {
      // Student dashboard stats
      const studentRoom = await Room.findOne({ 'occupants.student': req.user.id });
      stats.roomInfo = studentRoom;
      
      // Find warden for student's block
      if (studentRoom) {
        const warden = await User.findOne({
          role: 'warden',
          assignedBlocks: { $in: [studentRoom.block] },
          isActive: true
        }).select('name email phone wardenId');
        stats.wardenInfo = warden;
      }
      
      stats.pendingFees = await Fee.countDocuments({ 
        student: req.user.id, 
        status: { $in: ['pending', 'partial'] } 
      });
      
      stats.myComplaints = await Complaint.countDocuments({ student: req.user.id });
      stats.pendingComplaints = await Complaint.countDocuments({ 
        student: req.user.id, 
        status: 'pending' 
      });
      
      // Recent activities for student
      const recentComplaints = await Complaint.find({ student: req.user.id })
        .populate('student', 'name studentId')
        .populate('room', 'roomNumber block')
        .sort({ createdAt: -1 })
        .limit(5);
        
      const recentLeaves = await Leave.find({ student: req.user.id })
        .populate('student', 'name studentId')
        .sort({ createdAt: -1 })
        .limit(5);
        
      stats.recentActivities = {
        complaints: recentComplaints,
        leaves: recentLeaves
      };
      
    } else if (req.user.role === 'warden') {
      // Warden dashboard stats
      const warden = await User.findById(req.user.id);
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        console.log('Warden assigned blocks:', warden.assignedBlocks);
        
        const assignedRooms = await Room.find({ 
          block: { $in: warden.assignedBlocks } 
        }).populate('occupants.student', 'name studentId');
        
        console.log('Found rooms in assigned blocks:', assignedRooms.length);
        
        stats.assignedRooms = assignedRooms.length;
        stats.occupiedRooms = assignedRooms.filter(room => !room.isAvailable).length;
        
        // Get students by preferredBlock (whether allocated to room or not)
        const blockStudents = await User.find({
          role: 'student',
          preferredBlock: { $in: warden.assignedBlocks },
          isActive: true
        }).select('name studentId preferredBlock');
        
        // Add room info for allocated students
        const blockStudentsWithRooms = [];
        for (const student of blockStudents) {
          const studentRoom = await Room.findOne({
            'occupants.student': student._id
          });
          
          blockStudentsWithRooms.push({
            name: student.name,
            studentId: student.studentId,
            roomNumber: studentRoom ? studentRoom.roomNumber : 'Not Allocated',
            block: student.preferredBlock,
            isAllocated: !!studentRoom
          });
        }
        
        stats.totalStudents = blockStudents.length;
        stats.blockStudents = blockStudentsWithRooms;
        
        const roomIds = assignedRooms.map(room => room._id);
        stats.complaints = await Complaint.countDocuments({ 
          room: { $in: roomIds } 
        });
        stats.pendingComplaints = await Complaint.countDocuments({ 
          room: { $in: roomIds }, 
          status: 'pending' 
        });
      } else {
        console.log('Warden has no assigned blocks or warden not found');
        stats.assignedRooms = 0;
        stats.occupiedRooms = 0;
        stats.totalStudents = 0;
        stats.blockStudents = [];
        stats.complaints = 0;
        stats.pendingComplaints = 0;
      }
    }

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

// Get chart data for dashboard
const getChartData = async (req, res) => {
  try {
    const chartData = {};
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (req.user.role === 'admin') {
      // Occupancy percentage by block
      const occupancyData = await Room.aggregate([
        {
          $group: {
            _id: '$block',
            totalRooms: { $sum: 1 },
            occupiedRooms: {
              $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            block: '$_id',
            totalRooms: 1,
            occupiedRooms: 1,
            occupancyRate: {
              $multiply: [
                { $divide: ['$occupiedRooms', '$totalRooms'] },
                100
              ]
            }
          }
        },
        { $sort: { block: 1 } }
      ]);
      chartData.occupancy = occupancyData;

      // Fee collection timeline (last 6 months)
      const feeTimeline = await Fee.aggregate([
        {
          $match: {
            year: currentYear,
            status: 'paid'
          }
        },
        {
          $group: {
            _id: '$month',
            totalCollected: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      chartData.feeTimeline = feeTimeline;

      // Complaints by status
      const complaintsData = await Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      chartData.complaints = complaintsData;

    } else if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      const assignedBlocks = warden?.assignedBlocks || [];

      if (assignedBlocks.length > 0) {
        // Occupancy for warden's blocks only
        const occupancyData = await Room.aggregate([
          { $match: { block: { $in: assignedBlocks } } },
          {
            $group: {
              _id: '$block',
              totalRooms: { $sum: 1 },
              occupiedRooms: {
                $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] }
              }
            }
          },
          {
            $project: {
              block: '$_id',
              totalRooms: 1,
              occupiedRooms: 1,
              occupancyRate: {
                $multiply: [
                  { $divide: ['$occupiedRooms', '$totalRooms'] },
                  100
                ]
              }
            }
          },
          { $sort: { block: 1 } }
        ]);
        chartData.occupancy = occupancyData;

        // Get room IDs for warden's blocks
        const wardenRooms = await Room.find({ block: { $in: assignedBlocks } }).select('_id');
        const roomIds = wardenRooms.map(room => room._id);

        // Complaints for warden's blocks
        const complaintsData = await Complaint.aggregate([
          { $match: { room: { $in: roomIds } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);
        chartData.complaints = complaintsData;
      }
    }

    res.status(200).json({
      success: true,
      chartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get warden-specific dashboard stats
const getWardenStats = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);
    const stats = {};

    if (!warden || warden.role !== 'warden') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Warden role required.'
      });
    }

    const assignedBlocks = warden.assignedBlocks || [];
    stats.assignedBlocks = assignedBlocks;

    if (assignedBlocks.length > 0) {
      // Get all rooms in assigned blocks
      const assignedRooms = await Room.find({ 
        block: { $in: assignedBlocks } 
      }).populate('occupants.student', 'name studentId');

      stats.totalRoomsInBlocks = assignedRooms.length;
      stats.occupiedRoomsInBlocks = assignedRooms.filter(room => !room.isAvailable).length;
      stats.availableRoomsInBlocks = assignedRooms.filter(room => room.isAvailable).length;
      stats.occupancyRate = Math.round((stats.occupiedRoomsInBlocks / stats.totalRoomsInBlocks) * 100);

      // Get students in assigned blocks
      const blockStudents = await User.find({
        role: 'student',
        preferredBlock: { $in: assignedBlocks },
        isActive: true
      });
      stats.studentsInBlocks = blockStudents.length;

      // Get room IDs for complaints and leaves
      const roomIds = assignedRooms.map(room => room._id);

      // Complaint statistics
      stats.pendingComplaints = await Complaint.countDocuments({ 
        room: { $in: roomIds }, 
        status: 'pending' 
      });
      stats.resolvedComplaints = await Complaint.countDocuments({ 
        room: { $in: roomIds }, 
        status: 'resolved' 
      });
      stats.totalComplaints = await Complaint.countDocuments({ 
        room: { $in: roomIds } 
      });

      // Leave statistics
      const studentIds = blockStudents.map(student => student._id);
      stats.pendingLeaves = await Leave.countDocuments({ 
        student: { $in: studentIds }, 
        status: 'pending' 
      });
      stats.approvedLeaves = await Leave.countDocuments({ 
        student: { $in: studentIds }, 
        status: 'approved' 
      });
      stats.totalLeaves = await Leave.countDocuments({ 
        student: { $in: studentIds } 
      });

      // Maintenance requests (complaints with maintenance category)
      stats.maintenanceRequests = await Complaint.countDocuments({ 
        room: { $in: roomIds }, 
        category: 'maintenance',
        status: { $in: ['pending', 'in_progress'] }
      });

      // Recent activities for warden
      const recentComplaints = await Complaint.find({ 
        room: { $in: roomIds } 
      })
      .populate('student', 'name')
      .populate('room', 'roomNumber')
      .sort({ createdAt: -1 })
      .limit(5);

      const recentLeaves = await Leave.find({ 
        student: { $in: studentIds } 
      })
      .populate('student', 'name')
      .populate('room', 'roomNumber')
      .sort({ createdAt: -1 })
      .limit(5);

      stats.recentComplaints = recentComplaints;
      stats.recentLeaves = recentLeaves;
      
      // Also provide in recentActivities format for consistency
      stats.recentActivities = {
        complaints: recentComplaints,
        leaves: recentLeaves
      };

    } else {
      // No assigned blocks
      stats.totalRoomsInBlocks = 0;
      stats.occupiedRoomsInBlocks = 0;
      stats.availableRoomsInBlocks = 0;
      stats.studentsInBlocks = 0;
      stats.pendingComplaints = 0;
      stats.resolvedComplaints = 0;
      stats.pendingLeaves = 0;
      stats.approvedLeaves = 0;
      stats.maintenanceRequests = 0;
      stats.occupancyRate = 0;
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching warden stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = { getDashboardStats, getChartData, getWardenStats };