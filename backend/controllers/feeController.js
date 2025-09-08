const Fee = require('../models/Fee');
const Room = require('../models/Room');
const User = require('../models/User');
const { paginate, buildSearchQuery } = require('../utils/pagination');
const NotificationService = require('../services/notificationService');

// Fee calculation constants
const FEE_CONSTANTS = {
  BASE_MESS_FEE: 3000,
  BASE_ELECTRICITY: 500,
  BASE_MAINTENANCE: 200,
  SEMESTER_MONTHS: 6,
  YEARLY_MONTHS: 12
};

// Generate semester/yearly fees for students
const generateFees = async (req, res) => {
  try {
    const { feeType, semester, year, type, selectedRooms, selectedStudents } = req.body;
    
    // Validate required fields
    if (!feeType || !year) {
      return res.status(400).json({
        success: false,
        message: 'Fee type and year are required'
      });
    }
    
    if (feeType === 'semester' && !semester) {
      return res.status(400).json({
        success: false,
        message: 'Semester is required for semester fees'
      });
    }
    
    // Validate year range
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Year must be between 2020 and ' + (currentYear + 5)
      });
    }

    // Get all rooms with occupants (both available and unavailable rooms can have occupants)
    const rooms = await Room.find({ 
      $or: [
        { 'occupants.0': { $exists: true } },
        { isAvailable: false }
      ]
    }).populate('occupants.student');
    
    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No occupied rooms found. Please allocate students to rooms first.'
      });
    }

    const fees = [];

    for (const room of rooms) {
      if (room.occupants && room.occupants.length > 0) {
        for (const occupant of room.occupants) {
          if (occupant.student) {
            // Check if fee already exists
            const query = {
              student: occupant.student._id,
              feeType,
              year
            };
            if (feeType === 'semester') {
              query.semester = semester;
            }
            const existingFee = await Fee.findOne(query);

            if (!existingFee) {
              // Calculate fees based on type
              const baseRoomRent = room.monthlyRent;
              const multiplier = feeType === 'semester' ? FEE_CONSTANTS.SEMESTER_MONTHS : FEE_CONSTANTS.YEARLY_MONTHS;
              
              const roomRent = baseRoomRent * multiplier;
              const messFee = FEE_CONSTANTS.BASE_MESS_FEE * multiplier;
              const electricityBill = FEE_CONSTANTS.BASE_ELECTRICITY * multiplier;
              const maintenanceFee = FEE_CONSTANTS.BASE_MAINTENANCE * multiplier;
              const totalAmount = roomRent + messFee + electricityBill + maintenanceFee;
              
              const feeData = {
                student: occupant.student._id,
                room: room._id,
                feeType,
                year: parseInt(year),
                roomRent,
                messFee,
                electricityBill,
                maintenanceFee,
                totalAmount,
                paidAmount: 0,
                dueAmount: totalAmount,
                status: 'pending',
                dueDate: new Date(year, feeType === 'yearly' ? 11 : (semester === 'Fall' ? 11 : semester === 'Spring' ? 4 : 7), 15)
              };
              
              if (feeType === 'semester') {
                feeData.semester = semester;
              }
              
              const fee = new Fee(feeData);

              fees.push(fee);
            }
          }
        }
      }
    }

    if (fees.length > 0) {
      await Fee.insertMany(fees);
      const periodText = feeType === 'semester' ? `${semester} Semester ${year}` : `Academic Year ${year}`;
      
      // Send notifications to students and wardens
      const adminUser = await User.findById(req.user.id);
      await NotificationService.notifyFeeGenerated(fees, feeType, semester, year, adminUser);
      
      res.status(201).json({
        success: true,
        message: `Generated ${fees.length} fee records for ${periodText}`,
        count: fees.length
      });
    } else {
      const periodText = feeType === 'semester' ? `${semester} Semester ${year}` : `Academic Year ${year}`;
      res.status(200).json({
        success: true,
        message: `No new fees to generate for ${periodText}. All fees already exist.`,
        count: 0
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get fees with pagination and filtering
const getFees = async (req, res) => {
  try {
    const {
      status,
      feeType,
      semester,
      year,
      search,
      minAmount,
      maxAmount,
      dueDateFrom,
      dueDateTo,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter = {};

    // Students can only see their own fees
    if (req.user.role === 'student') {
      filter.student = req.user.id;
    }

    // Wardens can only see fees for students in their assigned blocks
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
    if (feeType) filter.feeType = feeType;
    if (semester) filter.semester = semester;
    if (year) filter.year = parseInt(year);
    
    // Amount range filtering
    if (minAmount || maxAmount) {
      filter.totalAmount = {};
      if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
    }
    
    // Due date range filtering
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    // Add search functionality
    if (search) {
      const searchQuery = buildSearchQuery(search, ['transactionId', 'paymentMethod']);
      filter = { ...filter, ...searchQuery };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await paginate(Fee, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [
        { path: 'student', select: 'name email studentId' },
        { path: 'room', select: 'roomNumber block floor' }
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

// Get eligible rooms for fee generation
const getEligibleRooms = async (req, res) => {
  try {
    const { feeType, semester, year } = req.query;
    
    if (!feeType || !year) {
      return res.status(400).json({
        success: false,
        message: 'Fee type and year are required'
      });
    }
    
    if (feeType === 'semester' && !semester) {
      return res.status(400).json({
        success: false,
        message: 'Semester is required for semester fees'
      });
    }

    // Get all rooms with occupants
    const rooms = await Room.find({
      $or: [
        { isAvailable: false },
        { 'occupants.0': { $exists: true } }
      ]
    }).populate('occupants.student', 'name email studentId');

    const eligibleRooms = [];

    for (const room of rooms) {
      if (room.occupants && room.occupants.length > 0) {
        // Check if any student in this room doesn't have fees for this period
        let hasEligibleStudents = false;
        
        for (const occupant of room.occupants) {
          if (occupant.student) {
            const query = {
              student: occupant.student._id,
              feeType,
              year: parseInt(year)
            };
            if (feeType === 'semester') {
              query.semester = semester;
            }
            
            const existingFee = await Fee.findOne(query);
            if (!existingFee) {
              hasEligibleStudents = true;
              break;
            }
          }
        }
        
        if (hasEligibleStudents) {
          eligibleRooms.push({
            _id: room._id,
            roomNumber: room.roomNumber,
            block: room.block,
            occupants: room.occupants
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      rooms: eligibleRooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete fee
const deleteFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id).populate('student', 'name email studentId').populate('room', 'roomNumber block');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    // Only allow deletion if fee is not paid or partially paid
    if (fee.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete fee record with payments. Please refund payments first.'
      });
    }

    await Fee.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Fee record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Pay fee
const payFee = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod, transactionId } = req.body;

    const fee = await Fee.findById(feeId);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    // Check if student is paying their own fee
    if (req.user.role === 'student' && fee.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay your own fees'
      });
    }

    const paymentAmount = parseFloat(amount);
    
    // Validate payment amount
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount. Amount must be a positive number.'
      });
    }
    
    // Check for overpayment
    if (paymentAmount > fee.dueAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) cannot exceed due amount (₹${fee.dueAmount})`
      });
    }
    
    fee.paidAmount += paymentAmount;
    fee.dueAmount = fee.totalAmount - fee.paidAmount;

    if (fee.dueAmount <= 0) {
      fee.status = 'paid';
      fee.paidDate = new Date();
    } else if (fee.paidAmount > 0) {
      fee.status = 'partial';
    }

    fee.paymentMethod = paymentMethod;
    fee.transactionId = transactionId;

    await fee.save();

    // Send notification to student if admin/warden recorded the payment
    if (req.user.role !== 'student') {
      const adminUser = await User.findById(req.user.id);
      const student = await User.findById(fee.student);
      const periodText = fee.feeType === 'semester' ? `${fee.semester} Semester ${fee.year}` : `Academic Year ${fee.year}`;
      const statusText = fee.status === 'paid' ? 'fully paid' : 'partially paid';
      
      await NotificationService.createNotification(
        fee.student,
        'fee_payment',
        'Payment Recorded',
        `${adminUser.role === 'admin' ? 'Admin' : 'Warden'} ${adminUser.name} has recorded a payment of ₹${paymentAmount} for your ${periodText} fees. Your fee is now ${statusText}.`,
        { 
          feeId: fee._id,
          paymentAmount,
          recordedBy: adminUser._id,
          period: periodText,
          newStatus: fee.status
        },
        'high'
      );
      
      // Notify wardens in the student's block
      const room = await Room.findById(fee.room);
      if (room) {
        const wardens = await User.find({ 
          role: 'warden',
          $or: [
            { assignedBlocks: room.block },
            { assignedBlock: room.block }
          ],
          isActive: true 
        });
        
        if (wardens.length > 0) {
          await NotificationService.createBulkNotifications(
            wardens.map(w => w._id),
            'fee_payment',
            'Payment Recorded in Your Block',
            `${adminUser.role === 'admin' ? 'Admin' : 'Warden'} ${adminUser.name} recorded a payment of ₹${paymentAmount} for ${student.name} in Block ${room.block}. Fee is now ${statusText}.`,
            { 
              feeId: fee._id,
              studentId: fee.student,
              studentName: student.name,
              paymentAmount,
              recordedBy: adminUser._id,
              period: periodText,
              block: room.block,
              newStatus: fee.status
            },
            'medium',
            adminUser._id
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      fee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get fee statistics (totals without pagination)
const getFeeStats = async (req, res) => {
  try {
    const {
      status,
      feeType,
      semester,
      year,
      search,
      minAmount,
      maxAmount,
      dueDateFrom,
      dueDateTo
    } = req.query;
    
    let filter = {};

    // Students can only see their own fees
    if (req.user.role === 'student') {
      const mongoose = require('mongoose');
      filter.student = new mongoose.Types.ObjectId(req.user.id);
    }

    // Wardens can only see fees for students in their assigned blocks
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
          stats: {
            totalDue: 0,
            totalPaid: 0,
            pendingFees: 0,
            totalRecords: 0
          }
        });
      }
    }

    // Apply same filters as getFees
    if (status) filter.status = status;
    if (feeType) filter.feeType = feeType;
    if (semester) filter.semester = semester;
    if (year) filter.year = parseInt(year);
    
    if (minAmount || maxAmount) {
      filter.totalAmount = {};
      if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
    }
    
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    if (search) {
      const searchQuery = buildSearchQuery(search, ['transactionId', 'paymentMethod']);
      filter = { ...filter, ...searchQuery };
    }

    // Calculate statistics using aggregation
    const stats = await Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$dueAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalRecords: { $sum: 1 },
          pendingFees: {
            $sum: {
              $cond: [{ $ne: ['$status', 'paid'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalDue: 0,
      totalPaid: 0,
      pendingFees: 0,
      totalRecords: 0
    };

    // Remove the _id field
    delete result._id;

    res.status(200).json({
      success: true,
      stats: result
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
  generateFees,
  getFees,
  getFeeStats,
  payFee,
  deleteFee,
  getEligibleRooms
};
