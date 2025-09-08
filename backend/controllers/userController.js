const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Complaint = require('../models/Complaint');
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { sendWelcomeEmail } = require('../services/emailService');
const mongoose = require('mongoose');
const { paginate, buildSearchQuery } = require('../utils/pagination');

// Get users by role
const getUsers = async (req, res) => {
  try {
    const { 
      role, 
      search, 
      status, 
      block, 
      course, 
      year,
      hasRoom,
      page = 1, 
      limit = 12, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    let filter = {};
    
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';
    if (course) filter.course = { $regex: course, $options: 'i' };
    if (year && !isNaN(parseInt(year))) filter.year = parseInt(year);

    // Role-based filtering first (most important)
    if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      let wardenBlocks = [];
      
      // Check both assignedBlock (single) and assignedBlocks (array) for backward compatibility
      if (warden && warden.assignedBlock) {
        wardenBlocks.push(warden.assignedBlock);
      }
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        wardenBlocks = [...wardenBlocks, ...warden.assignedBlocks];
      }
      
      // Remove duplicates
      wardenBlocks = [...new Set(wardenBlocks)];
      
      if (wardenBlocks.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: parseInt(limit) }
        });
      }
      
      // Force role to be student
      filter.role = 'student';
      
      // Handle block filter for wardens
      if (block) {
        // If specific block is requested, ensure it's within warden's assigned blocks
        if (!wardenBlocks.includes(block)) {
          // Block not assigned to this warden, return empty result
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: parseInt(limit) }
          });
        }
        // Block is valid, use specific block filter
        filter.preferredBlock = block;
      } else {
        // No specific block filter, show all students from assigned blocks
        filter.preferredBlock = { $in: wardenBlocks };
      }
    } else if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      
      if (student && student.preferredBlock) {
        // Students can see other students in their preferred block
        filter.role = 'student';
        filter.preferredBlock = student.preferredBlock;
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: parseInt(limit) }
        });
      }
    } else {
      // Admin or other roles
      if (block) {
        filter.preferredBlock = block;
      }
    }

    // Handle room status filter (after role-based filtering)
    if (hasRoom && hasRoom !== '') {
      // Get unique student IDs who have rooms
      const roomsWithStudents = await Room.find({
        'occupants.0': { $exists: true }
      }).select('occupants.student');
      
      const studentIdsWithRooms = [...new Set(
        roomsWithStudents.flatMap(room => 
          room.occupants.map(occupant => occupant.student.toString())
        )
      )];
      
      if (hasRoom === 'true') {
        // Students with rooms - need to intersect with existing filters
        if (studentIdsWithRooms.length > 0) {
          if (req.user.role === 'warden') {
            // For wardens, we need to find students who:
            // 1. Are in warden's assigned blocks (already filtered by preferredBlock)
            // 2. Have rooms allocated
            // We'll let MongoDB handle the intersection by adding the room filter
            filter._id = { $in: studentIdsWithRooms };
          } else {
            filter._id = { $in: studentIdsWithRooms };
          }
        } else {
          // No students have rooms
          filter._id = { $in: [] };
        }
      } else if (hasRoom === 'false') {
        // Students without rooms
        if (studentIdsWithRooms.length > 0) {
          if (req.user.role === 'warden') {
            // For wardens, we need to find students who:
            // 1. Are in warden's assigned blocks (already filtered by preferredBlock)
            // 2. Do NOT have rooms allocated
            filter._id = { $nin: studentIdsWithRooms };
          } else {
            filter._id = { $nin: studentIdsWithRooms };
          }
        }
        // If no students have rooms, all students are without rooms (no additional filter needed)
      }
    }

    // Add search functionality (after all other filters)
    if (search && search.trim()) {
      const searchQuery = buildSearchQuery(search.trim(), ['name', 'email', 'studentId', 'phone', 'course', 'guardianName', 'guardianPhone']);
      if (searchQuery.$or || searchQuery.$and) {
        filter = { ...filter, ...searchQuery };
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Use proper pagination for all roles
    const actualLimit = parseInt(limit);
    
    const result = await paginate(User, filter, {
      page: parseInt(page),
      limit: actualLimit,
      sort: sortOptions,
      select: '-password'
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

// Create user (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, studentId, course, year, guardianName, guardianPhone, address, preferredBlock, wardenId, assignedBlock, assignedBlocks } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Set default password if not provided
    const defaultPassword = password || 'student123';

    // Create user data
    const userData = { 
      name, 
      email, 
      password: defaultPassword, 
      role, 
      phone,
      isActive: true
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
      userData.course = course;
      userData.year = year;
      userData.guardianName = guardianName;
      userData.guardianPhone = guardianPhone;
      userData.address = address;
      userData.preferredBlock = preferredBlock;
    } else if (role === 'warden') {
      userData.wardenId = wardenId;
      userData.assignedBlock = assignedBlock;
      const blocks = assignedBlocks || [];
      if (blocks.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'A warden can be assigned to maximum 2 blocks'
        });
      }
      userData.assignedBlocks = blocks;
    }

    const user = await User.create(userData);

    // Notify wardens if student is assigned to a block
    if (role === 'student' && preferredBlock) {
      await NotificationService.notifyStudentAssigned(user, req.user.id);
    }

    // Notify other wardens if creating a new warden
    if (role === 'warden') {
  
      await NotificationService.notifyWardenCreated(user);
    }

    // Create immediate notification with credentials
    try {
      const notification = await NotificationService.createNotification(
        user._id,
        'account_created',
        '🎉 Account Ready - Login Now!',
        `Welcome! Your ${role} account is ready. Email: ${email} | Password: ${defaultPassword} | Login immediately!`,
        { email, password: defaultPassword, role },
        'urgent'
      );
      if (!notification) {
        // Fallback: create notification directly
        await Notification.create({
          recipient: user._id,
          recipientRole: role,
          type: 'account_created',
          title: '🎉 Account Ready - Login Now!',
          message: `Welcome! Your ${role} account is ready. Email: ${email} | Password: ${defaultPassword} | Login immediately!`,
          data: { email, password: defaultPassword, role },
          priority: 'urgent',
          isRead: false
        });
      }
    } catch (error) {
      // Direct creation as fallback
      try {
        await Notification.create({
          recipient: user._id,
          recipientRole: role,
          type: 'account_created',
          title: '🎉 Account Ready - Login Now!',
          message: `Welcome! Your ${role} account is ready. Email: ${email} | Password: ${defaultPassword} | Login immediately!`,
          data: { email, password: defaultPassword, role },
          priority: 'urgent',
          isRead: false
        });
      } catch (fallbackError) {
        // Silent fail
      }
    }
    
    // Send welcome email without waiting
    sendWelcomeEmail(email, user.name, defaultPassword, role)
      .then(() => {

        NotificationService.createNotification(
          user._id,
          'welcome_email_sent',
          'Welcome Email Delivered',
          'Welcome email with detailed instructions sent to your inbox',
          {},
          'medium'
        ).catch(() => {});
      })
      .catch(emailError => {

        NotificationService.createNotification(
          user._id,
          'welcome_email_failed',
          'Email Failed - Use Credentials Above',
          'Email delivery failed. Use the login credentials from your first notification.',
          {},
          'high'
        ).catch(() => {});
      });

    res.status(201).json({
      success: true,
      message: `User created successfully. ${!password ? 'Default password: student123. ' : ''}Welcome email sent to ${email}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive
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

// Get single user
const getUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Check if email is being updated and if it already exists
    if (req.body.email) {
      const existingUser = await User.findOne({ 
        email: req.body.email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Get the original user to check for block changes
    const originalUser = await User.findById(req.params.id);
    
    // Check if student has room allocated and block is being changed
    if (originalUser.role === 'student' && 
        req.body.preferredBlock && 
        originalUser.preferredBlock !== req.body.preferredBlock) {
      
      const studentRoom = await Room.findOne({ 'occupants.student': originalUser._id });
      
      if (studentRoom) {
        return res.status(400).json({
          success: false,
          message: `Cannot change block for student with allocated room. Student is currently assigned to Room ${studentRoom.roomNumber} in Block ${studentRoom.block}. Please deallocate the room first before changing the block.`,
          roomInfo: {
            roomNumber: studentRoom.roomNumber,
            block: studentRoom.block,
            roomType: studentRoom.roomType
          }
        });
      }
    }
    
    // Validate warden block assignment limit
    if (originalUser.role === 'warden' && req.body.assignedBlocks && req.body.assignedBlocks.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'A warden can be assigned to maximum 2 blocks'
      });
    }

    // Remove password from update if it's empty or undefined
    const updateData = { ...req.body };
    if (!updateData.password || updateData.password === '') {
      delete updateData.password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Notify wardens if student's preferred block was changed (only if no room allocated)
    if (user.role === 'student' && 
        req.body.preferredBlock && 
        originalUser.preferredBlock !== req.body.preferredBlock) {
      await NotificationService.notifyStudentAssigned(user, req.user.id);
    }

    // Notify wardens if student's active status was changed
    if (user.role === 'student' && 
        req.body.hasOwnProperty('isActive') && 
        originalUser.isActive !== req.body.isActive) {
      await NotificationService.notifyStudentStatusChange(user, req.body.isActive, req.user.id);
    }

    // Notify student and wardens if student information was updated
    if (user.role === 'student') {
      const changes = {};
      if (req.body.name && originalUser.name !== req.body.name) changes.name = req.body.name;
      if (req.body.email && originalUser.email !== req.body.email) changes.email = req.body.email;
      if (req.body.phone && originalUser.phone !== req.body.phone) changes.phone = req.body.phone;
      if (req.body.course && originalUser.course !== req.body.course) changes.course = req.body.course;
      if (req.body.year && originalUser.year !== req.body.year) changes.year = req.body.year;
      if (req.body.guardianName && originalUser.guardianName !== req.body.guardianName) changes.guardianName = req.body.guardianName;
      if (req.body.guardianPhone && originalUser.guardianPhone !== req.body.guardianPhone) changes.guardianPhone = req.body.guardianPhone;
      if (req.body.address && originalUser.address !== req.body.address) changes.address = req.body.address;
      if (req.body.preferredBlock && originalUser.preferredBlock !== req.body.preferredBlock) changes.preferredBlock = req.body.preferredBlock;
      
      if (Object.keys(changes).length > 0) {
        await NotificationService.notifyStudentUpdated(user, changes, req.user.id);
      }
    }

    // Notify warden if their information was updated
    if (user.role === 'warden') {
      const changes = {};
      if (req.body.assignedBlocks && JSON.stringify(originalUser.assignedBlocks) !== JSON.stringify(req.body.assignedBlocks)) {
        changes.assignedBlocks = req.body.assignedBlocks;
      }
      if (req.body.name && originalUser.name !== req.body.name) {
        changes.name = req.body.name;
      }
      if (req.body.email && originalUser.email !== req.body.email) {
        changes.email = req.body.email;
      }
      if (req.body.phone && originalUser.phone !== req.body.phone) {
        changes.phone = req.body.phone;
      }
      if (req.body.wardenId && originalUser.wardenId !== req.body.wardenId) {
        changes.wardenId = req.body.wardenId;
      }
      
      if (Object.keys(changes).length > 0) {

        await NotificationService.notifyWardenUpdated(user, changes);
      }
      
      // Notify warden if their active status was changed
      if (req.body.hasOwnProperty('isActive') && originalUser.isActive !== req.body.isActive) {

        await NotificationService.notifyWardenStatusChange(user, req.body.isActive);
      }
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if student has room allocated and provide warning
    if (user.role === 'student') {
      const room = await Room.findOne({ 'occupants.student': user._id });
      if (room) {
        // Auto-deallocate room and notify wardens
        room.occupants = room.occupants.filter(
          occupant => occupant.student.toString() !== user._id.toString()
        );
        room.isAvailable = room.occupants.length < room.capacity;
        await room.save();
        
        // Notify wardens about room deallocation due to student deletion
        await NotificationService.notifyWardenRoomManagement(
          room,
          'deallocate',
          req.user,
          `Room automatically deallocated due to student deletion: ${user.name}`
        );
      }
    }

    // Send deletion email and notification BEFORE deleting user
    const { sendAccountDeletionEmail } = require('../services/emailService');
    const userEmail = user.email;
    const userName = user.name;
    const userRole = user.role;
    const userId = user._id;
    
    // Send email immediately
    sendAccountDeletionEmail(userEmail, userName, userRole)
      .catch(() => {});
    
    // Send notification immediately
    NotificationService.createNotification(
      userId,
      'account_deleted',
      'Account Deleted',
      'Your account has been deleted by the administrator. Check your email for details.',
      {},
      'urgent'
    ).catch(() => {});
    
    // Delete user after sending notifications
    await User.findByIdAndDelete(req.params.id);

    // Notify wardens if deleting a student from their block
    if (userRole === 'student' && user.preferredBlock) {
      await NotificationService.notifyStudentDeleted(user, req.user.id);
    }

    // Notify other wardens if deleting a warden
    if (userRole === 'warden') {
  
      await NotificationService.notifyWardenDeleted(user);
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully. Room automatically deallocated if assigned.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all students with enhanced search, filter, and pagination (Admin only)
const getStudents = async (req, res) => {
  try {
    const {
      search,
      status,
      block,
      course,
      year,
      hasRoom,
      guardianName,
      guardianPhone,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let filter = { role: 'student' };

    // Apply filters
    if (status) filter.isActive = status === 'active';
    if (block) filter.preferredBlock = block;
    if (course) filter.course = { $regex: course, $options: 'i' };
    if (year && !isNaN(parseInt(year))) filter.year = parseInt(year);
    if (guardianName) filter.guardianName = { $regex: guardianName, $options: 'i' };
    if (guardianPhone) filter.guardianPhone = { $regex: guardianPhone, $options: 'i' };

    // Add search functionality
    if (search && search.trim()) {
      const searchQuery = buildSearchQuery(search.trim(), [
        'name', 'email', 'studentId', 'phone', 'course', 
        'guardianName', 'guardianPhone', 'address'
      ]);
      // Merge search query with existing filters
      if (searchQuery.$or || searchQuery.$and) {
        filter = { ...filter, ...searchQuery };
      }
    }
    


    // Room allocation filter
    if (hasRoom && hasRoom !== '') {
      if (hasRoom === 'true') {
        // Students with rooms
        const roomsWithStudents = await Room.find({
          'occupants.0': { $exists: true }
        }).select('occupants.student');
        const studentIdsWithRooms = roomsWithStudents.flatMap(room => 
          room.occupants.map(occupant => occupant.student)
        );
        if (studentIdsWithRooms.length > 0) {
          filter._id = { $in: studentIdsWithRooms };
        } else {
          // No students have rooms, return empty result
          filter._id = { $in: [] };
        }
      } else if (hasRoom === 'false') {
        // Students without rooms
        const roomsWithStudents = await Room.find({
          'occupants.0': { $exists: true }
        }).select('occupants.student');
        const studentIdsWithRooms = roomsWithStudents.flatMap(room => 
          room.occupants.map(occupant => occupant.student)
        );
        if (studentIdsWithRooms.length > 0) {
          filter._id = { $nin: studentIdsWithRooms };
        }
        // If no students have rooms, all students are without rooms (no filter needed)
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await paginate(User, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      select: '-password'
    });

    // Enhance student data with room information
    const enhancedStudents = await Promise.all(
      result.data.map(async (student) => {
        const room = await Room.findOne({
          'occupants.student': student._id
        }).select('roomNumber block floor roomType monthlyRent');
        
        return {
          ...student.toObject(),
          roomInfo: room ? {
            roomNumber: room.roomNumber,
            block: room.block,
            floor: room.floor,
            roomType: room.roomType,
            monthlyRent: room.monthlyRent
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enhancedStudents,
      pagination: result.pagination,
      summary: {
        totalStudents: result.pagination.totalItems,
        activeStudents: await User.countDocuments({ role: 'student', isActive: true }),
        inactiveStudents: await User.countDocuments({ role: 'student', isActive: false }),
        studentsWithRooms: await Room.countDocuments({ 'occupants.0': { $exists: true } }),
        studentsWithoutRooms: result.pagination.totalItems - await Room.countDocuments({ 'occupants.0': { $exists: true } })
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

// Get all wardens with search, filter, and pagination (Admin only)
const getWardens = async (req, res) => {
  try {
    const {
      search,
      status,
      assignedBlocks,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let filter = { role: 'warden' };

    // Apply filters
    if (status) filter.isActive = status === 'active';
    if (assignedBlocks) {
      // Handle both array and single block assignment
      filter.$or = [
        { assignedBlocks: { $in: [assignedBlocks] } },
        { assignedBlock: assignedBlocks }
      ];
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchQuery = buildSearchQuery(search.trim(), ['name', 'email', 'wardenId', 'phone']);
      // Merge search query with existing filters
      if (searchQuery.$or || searchQuery.$and) {
        filter = { ...filter, ...searchQuery };
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await paginate(User, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      select: '-password'
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

// Create new warden (Admin only)
const createWarden = async (req, res) => {
  try {
    const { name, email, password, phone, wardenId, assignedBlock, assignedBlocks } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if wardenId exists
    const existingWarden = await User.findOne({ wardenId });
    if (existingWarden) {
      return res.status(400).json({
        success: false,
        message: 'Warden ID already exists'
      });
    }

    // Validate block assignment limit
    const blocks = assignedBlocks || [];
    if (blocks.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'A warden can be assigned to maximum 2 blocks'
      });
    }

    const warden = await User.create({
      name,
      email,
      password,
      phone,
      wardenId,
      assignedBlock,
      assignedBlocks: blocks,
      role: 'warden',
      isActive: true
    });

    // Create immediate notification with credentials
    const defaultPassword = password || 'warden123';
    NotificationService.createNotification(
      warden._id,
      'account_created',
      '🎉 Warden Account Ready - Login Now!',
      `Welcome! Your warden account is ready. Email: ${email} | Password: ${defaultPassword} | Login immediately!`,
      {},
      'urgent'
    ).catch(() => {});
    
    // Send welcome email without waiting
    sendWelcomeEmail(email, warden.name, defaultPassword, 'warden')
      .then(() => {

        NotificationService.createNotification(
          warden._id,
          'welcome_email_sent',
          'Welcome Email Delivered',
          'Welcome email with detailed instructions sent to your inbox',
          {},
          'medium'
        ).catch(() => {});
      })
      .catch(emailError => {

        NotificationService.createNotification(
          warden._id,
          'welcome_email_failed',
          'Email Failed - Use Credentials Above',
          'Email delivery failed. Use the login credentials from your first notification.',
          {},
          'high'
        ).catch(() => {});
      });
    
    // Notify other wardens about new warden
    await NotificationService.notifyWardenCreated(warden);

    res.status(201).json({
      success: true,
      message: 'Warden created successfully',
      data: {
        _id: warden._id,
        name: warden.name,
        email: warden.email,
        phone: warden.phone,
        wardenId: warden.wardenId,
        assignedBlock: warden.assignedBlock,
        assignedBlocks: warden.assignedBlocks,
        isActive: warden.isActive,
        createdAt: warden.createdAt
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

// Update warden (Admin only)
const updateWarden = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warden ID'
      });
    }

    // Check if email is being updated and if it already exists
    if (req.body.email) {
      const existingUser = await User.findOne({ 
        email: req.body.email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if wardenId is being updated and if it already exists
    if (req.body.wardenId) {
      const existingWarden = await User.findOne({ 
        wardenId: req.body.wardenId, 
        _id: { $ne: req.params.id } 
      });
      if (existingWarden) {
        return res.status(400).json({
          success: false,
          message: 'Warden ID already exists'
        });
      }
    }

    // Validate block assignment limit if assignedBlocks is being updated
    if (req.body.assignedBlocks && req.body.assignedBlocks.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'A warden can be assigned to maximum 2 blocks'
      });
    }

    const warden = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'warden' },
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Warden updated successfully',
      data: warden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete warden (Admin only)
const deleteWarden = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warden ID'
      });
    }

    const warden = await User.findOne({ _id: req.params.id, role: 'warden' });

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Send deletion notifications BEFORE deleting warden
    const { sendAccountDeletionEmail } = require('../services/emailService');
    const wardenEmail = warden.email;
    const wardenName = warden.name;
    const wardenId = warden._id;
    
    // Send email immediately
    sendAccountDeletionEmail(wardenEmail, wardenName, 'warden')
      .catch(() => {});
    
    // Send notification immediately
    NotificationService.createNotification(
      wardenId,
      'account_deleted',
      'Warden Account Deleted',
      'Your warden account has been deleted by the administrator.',
      {},
      'urgent'
    ).catch(() => {});
    
    // Notify other wardens about warden deletion
    await NotificationService.notifyWardenDeleted(warden);

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Warden deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Toggle warden status (Admin only)
const toggleWardenStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warden ID'
      });
    }

    const warden = await User.findOne({ _id: req.params.id, role: 'warden' });

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    const newStatus = !warden.isActive;
    warden.isActive = newStatus;
    await warden.save();

    // Notify the warden about status change
    await NotificationService.notifyWardenStatusChange(warden, newStatus);

    res.status(200).json({
      success: true,
      message: `Warden ${warden.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: warden._id,
        name: warden.name,
        email: warden.email,
        phone: warden.phone,
        wardenId: warden.wardenId,
        assignedBlock: warden.assignedBlock,
        assignedBlocks: warden.assignedBlocks,
        isActive: warden.isActive,
        createdAt: warden.createdAt
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

// Get student statistics and analytics (Admin only)
const getStudentStats = async (req, res) => {
  try {
    // Basic student counts
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    const inactiveStudents = await User.countDocuments({ role: 'student', isActive: false });

    // Room allocation stats
    const roomsWithStudents = await Room.find({ 'occupants.0': { $exists: true } });
    const studentsWithRooms = roomsWithStudents.reduce((count, room) => count + room.occupants.length, 0);
    const studentsWithoutRooms = totalStudents - studentsWithRooms;

    // Block-wise distribution
    const blockDistribution = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$preferredBlock', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Course-wise distribution
    const courseDistribution = await User.aggregate([
      { $match: { role: 'student', course: { $exists: true, $ne: '' } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Year-wise distribution
    const yearDistribution = await User.aggregate([
      { $match: { role: 'student', year: { $exists: true, $ne: null } } },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Fee statistics
    const feeStats = await Fee.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          dueAmount: { $sum: '$dueAmount' }
        }
      }
    ]);

    // Complaint statistics
    const complaintStats = await Complaint.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Leave statistics
    const leaveStats = await Leave.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top students by complaints (most active)
    const topComplainers = await Complaint.aggregate([
      {
        $group: {
          _id: '$student',
          complaintCount: { $sum: 1 }
        }
      },
      { $sort: { complaintCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $project: {
          name: '$studentInfo.name',
          studentId: '$studentInfo.studentId',
          complaintCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalStudents,
          activeStudents,
          inactiveStudents,
          studentsWithRooms,
          studentsWithoutRooms,
          recentRegistrations
        },
        distribution: {
          byBlock: blockDistribution,
          byCourse: courseDistribution,
          byYear: yearDistribution
        },
        fees: feeStats,
        complaints: complaintStats,
        leaves: leaveStats,
        insights: {
          topComplainers,
          occupancyRate: totalStudents > 0 ? Math.round((studentsWithRooms / totalStudents) * 100) : 0
        }
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

// Get warden statistics and analytics (Admin only)
const getWardenStats = async (req, res) => {
  try {
    // Basic warden counts
    const totalWardens = await User.countDocuments({ role: 'warden' });
    const activeWardens = await User.countDocuments({ role: 'warden', isActive: true });
    const inactiveWardens = await User.countDocuments({ role: 'warden', isActive: false });

    // Block management stats
    const wardenBlockAssignments = await User.find({ role: 'warden', assignedBlocks: { $exists: true, $ne: [] } }).select('assignedBlocks');
    const allAssignedBlocks = wardenBlockAssignments.flatMap(warden => warden.assignedBlocks || []);
    const uniqueBlocksManaged = [...new Set(allAssignedBlocks)].length;
    
    // Block-wise distribution
    const blockDistribution = await User.aggregate([
      { $match: { role: 'warden', assignedBlocks: { $exists: true, $ne: [] } } },
      { $unwind: '$assignedBlocks' },
      { $group: { _id: '$assignedBlocks', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Average blocks per warden
    const avgBlocksPerWarden = totalWardens > 0 ? (allAssignedBlocks.length / totalWardens).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalWardens,
          activeWardens,
          inactiveWardens,
          blocksManaged: uniqueBlocksManaged
        },
        distribution: {
          byBlock: blockDistribution
        },
        insights: {
          avgBlocksPerWarden: parseFloat(avgBlocksPerWarden)
        }
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

// Bulk operations for students (Admin only)
const bulkStudentOperations = async (req, res) => {
  try {
    const { operation, studentIds, data } = req.body;

    if (!operation || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Operation and studentIds array are required.'
      });
    }

    let result = {};

    switch (operation) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: studentIds }, role: 'student' },
          { isActive: true }
        );
        // Notify wardens about bulk activation
        await NotificationService.createBulkNotifications(
          await User.find({ role: 'warden', isActive: true }).select('_id'),
          'students_activated',
          'Students Bulk Activated',
          `Admin activated ${result.modifiedCount} students`,
          { count: result.modifiedCount, studentIds },
          'medium',
          req.user.id
        );
        break;

      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: studentIds }, role: 'student' },
          { isActive: false }
        );
        // Notify wardens about bulk deactivation
        await NotificationService.createBulkNotifications(
          await User.find({ role: 'warden', isActive: true }).select('_id'),
          'students_deactivated',
          'Students Bulk Deactivated',
          `Admin deactivated ${result.modifiedCount} students`,
          { count: result.modifiedCount, studentIds },
          'high',
          req.user.id
        );
        break;

      case 'updateBlock':
        if (!data.preferredBlock) {
          return res.status(400).json({
            success: false,
            message: 'Preferred block is required for block update operation'
          });
        }
        // Check if any students have rooms allocated
        const studentsWithRooms = await Room.find({
          'occupants.student': { $in: studentIds }
        }).populate('occupants.student', 'name studentId');
        
        if (studentsWithRooms.length > 0) {
          const studentNames = studentsWithRooms.flatMap(room => 
            room.occupants.filter(occ => studentIds.includes(occ.student._id.toString()))
              .map(occ => occ.student.name)
          );
          return res.status(400).json({
            success: false,
            message: `Cannot update block for students with allocated rooms: ${studentNames.join(', ')}`
          });
        }
        
        result = await User.updateMany(
          { _id: { $in: studentIds }, role: 'student' },
          { preferredBlock: data.preferredBlock }
        );
        break;

      case 'delete':
        // Auto-deallocate rooms for students being deleted
        await Room.updateMany(
          { 'occupants.student': { $in: studentIds } },
          { $pull: { occupants: { student: { $in: studentIds } } } }
        );
        // Update room availability
        const roomsToUpdate = await Room.find({ 'occupants.student': { $in: studentIds } });
        for (const room of roomsToUpdate) {
          room.isAvailable = room.occupants.length < room.capacity;
          await room.save();
        }
        
        result = await User.deleteMany({
          _id: { $in: studentIds },
          role: 'student'
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Supported operations: activate, deactivate, updateBlock, delete'
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      result: {
        operation,
        affectedCount: result.modifiedCount || result.deletedCount,
        requestedCount: studentIds.length
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
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getStudents,
  getStudentStats,
  bulkStudentOperations,
  getWardens,
  getWardenStats,
  createWarden,
  updateWarden,
  deleteWarden,
  toggleWardenStatus
};