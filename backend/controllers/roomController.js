const Room = require('../models/Room');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { paginate, buildSearchQuery } = require('../utils/pagination');

// Get all rooms with pagination and filtering
const getRooms = async (req, res) => {
  try {
    const { 
      block, 
      floor, 
      available, 
      roomType, 
      maintenanceStatus,
      search,
      page = 1, 
      limit = 12, 
      sortBy = 'roomNumber', 
      sortOrder = 'asc' 
    } = req.query;
    
    let filter = {};
    let useAggregation = false;

    if (block) filter.block = block;
    if (floor) filter.floor = parseInt(floor);
    if (roomType) filter.roomType = roomType;
    if (maintenanceStatus) filter.maintenanceStatus = maintenanceStatus;
    
    // Handle availability/occupancy filtering
    if (available === 'available' || available === 'true' || available === true) {
      // Available rooms: has space for more occupants
      useAggregation = true;
    } else if (available === 'full' || available === 'partial') {
      useAggregation = true;
    } else if (available === 'false' || available === false) {
      filter.isAvailable = false;
    }

    // Add search functionality
    if (search) {
      const searchQuery = buildSearchQuery(search.trim(), ['roomNumber', 'block']);
      filter = { ...filter, ...searchQuery };
    }

    // Role-based access control
    if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      let wardenBlocks = [];
      
      // Handle both assignedBlocks (array) and assignedBlock (string) for backward compatibility
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        wardenBlocks = warden.assignedBlocks;
      } else if (warden && warden.assignedBlock) {
        wardenBlocks = [warden.assignedBlock];
      }
      
      if (wardenBlocks.length > 0) {
        // If block filter is specified, ensure it's within warden's blocks
        if (filter.block && !wardenBlocks.includes(filter.block)) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: limit }
          });
        }
        
        // Apply warden block restriction
        if (!filter.block) {
          filter.block = { $in: wardenBlocks };
        }
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: limit }
        });
      }
    } else if (req.user.role === 'student') {
      // Students can only see rooms in their preferred block
      const student = await User.findById(req.user.id);
      if (student && student.preferredBlock) {
        filter.block = student.preferredBlock;
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

    let result;
    
    if (useAggregation) {
      // Use aggregation for occupancy filtering
      let occupancyCondition;
      
      if (available === 'available' || available === 'true') {
        // Available: has space for more occupants
        occupancyCondition = { $lt: [{ $size: '$occupants' }, '$capacity'] };
      } else if (available === 'partial') {
        // Partially occupied: has some occupants but not full
        occupancyCondition = {
          $and: [
            { $gt: [{ $size: '$occupants' }, 0] },
            { $lt: [{ $size: '$occupants' }, '$capacity'] }
          ]
        };
      } else if (available === 'full') {
        // Fully occupied: occupants equal to capacity
        occupancyCondition = { $eq: [{ $size: '$occupants' }, '$capacity'] };
      } else {
        // Default: no specific condition
        occupancyCondition = { $gte: [{ $size: '$occupants' }, 0] };
      }
      
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            occupantCount: { $size: '$occupants' },
            matchesFilter: occupancyCondition
          }
        },
        { $match: { matchesFilter: true } },
        { $sort: sortOptions },
        {
          $lookup: {
            from: 'users',
            localField: 'occupants.student',
            foreignField: '_id',
            as: 'occupantDetails'
          }
        },
        {
          $addFields: {
            occupants: {
              $map: {
                input: '$occupants',
                as: 'occupant',
                in: {
                  student: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$occupantDetails',
                          cond: { $eq: ['$$this._id', '$$occupant.student'] }
                        }
                      },
                      0
                    ]
                  },
                  joinDate: '$$occupant.joinDate'
                }
              }
            }
          }
        },
        { $project: { occupantDetails: 0, matchesFilter: 0, occupantCount: 0 } }
      ];
      
      const totalItems = await Room.aggregate([...pipeline, { $count: 'total' }]);
      const total = totalItems.length > 0 ? totalItems[0].total : 0;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const data = await Room.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);
      
      result = {
        data,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } else {
      result = await paginate(Room, filter, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sortOptions,
        populate: [{ path: 'occupants.student', select: 'name email studentId' }]
      });
    }

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

// Get single room
const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('occupants.student', 'name email studentId');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Role-based access control for single room view
    if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      let wardenBlocks = [];
      
      // Handle both assignedBlocks (array) and assignedBlock (string) for backward compatibility
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        wardenBlocks = warden.assignedBlocks;
      } else if (warden && warden.assignedBlock) {
        wardenBlocks = [warden.assignedBlock];
      }
      
      if (!wardenBlocks.includes(room.block)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - room not in your assigned blocks'
        });
      }
    } else if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      if (!student.preferredBlock || student.preferredBlock !== room.block) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - room not in your preferred block'
        });
      }
    }

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create room
const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);

    // Notify wardens and students assigned to this block
    try {
      const adminUser = await User.findById(req.user.id).select('name _id');
      
      // Notify wardens
      const wardens = await User.find({ 
        role: 'warden',
        $or: [
          { assignedBlocks: room.block },
          { assignedBlock: room.block }
        ],
        isActive: true 
      });
      
      if (wardens.length > 0) {
        await NotificationService.notifyWardenRoomManagement(wardens, 'created', room, adminUser);
      }
      
      // Notify students in this block
      const students = await User.find({ 
        role: 'student',
        preferredBlock: room.block,
        isActive: true 
      });
      
      if (students.length > 0) {
        await NotificationService.createBulkNotifications(
          students.map(s => s._id),
          'room_added',
          'New Room Available in Your Block',
          `A new room ${room.roomNumber} has been added to Block ${room.block}. Capacity: ${room.capacity}, Rent: ₹${room.monthlyRent}/month.`,
          { roomId: room._id, roomNumber: room.roomNumber, block: room.block },
          'medium',
          req.user.id
        );
      }
    } catch (notificationError) {

    }

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Notify wardens, occupants, and all students in the block
    try {
      const adminUser = await User.findById(req.user.id).select('name _id');
      
      // Notify wardens
      const wardens = await User.find({ 
        role: 'warden',
        $or: [
          { assignedBlocks: room.block },
          { assignedBlock: room.block }
        ],
        isActive: true 
      });
      
      if (wardens.length > 0) {
        await NotificationService.notifyWardenRoomManagement(wardens, 'updated', room, adminUser);
      }

      // Notify students occupying this room
      if (room.occupants && room.occupants.length > 0) {
        const studentIds = room.occupants.map(occupant => occupant.student);
        await NotificationService.createBulkNotifications(
          studentIds,
          'room_updated',
          'Your Room Has Been Updated',
          `Your room ${room.roomNumber} in Block ${room.block} has been updated by administration.`,
          { roomId: room._id, roomNumber: room.roomNumber, block: room.block },
          'high',
          req.user.id
        );
      }
      
      // Notify all students in this block about room update
      const allStudents = await User.find({ 
        role: 'student',
        preferredBlock: room.block,
        isActive: true 
      });
      
      if (allStudents.length > 0) {
        const occupantIds = room.occupants ? room.occupants.map(o => o.student.toString()) : [];
        const nonOccupantStudents = allStudents.filter(s => !occupantIds.includes(s._id.toString()));
        
        if (nonOccupantStudents.length > 0) {
          await NotificationService.createBulkNotifications(
            nonOccupantStudents.map(s => s._id),
            'room_updated',
            'Room Updated in Your Block',
            `Room ${room.roomNumber} in Block ${room.block} has been updated. Check the latest details if you're interested.`,
            { roomId: room._id, roomNumber: room.roomNumber, block: room.block },
            'low',
            req.user.id
          );
        }
      }
    } catch (notificationError) {

    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      room
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.occupants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with occupants'
      });
    }

    // Notify wardens and students in this block before deletion
    try {
      const adminUser = await User.findById(req.user.id).select('name _id');
      
      // Notify wardens
      const wardens = await User.find({ 
        role: 'warden',
        $or: [
          { assignedBlocks: room.block },
          { assignedBlock: room.block }
        ],
        isActive: true 
      });
      
      if (wardens.length > 0) {
        await NotificationService.notifyWardenRoomManagement(wardens, 'deleted', room, adminUser);
      }
      
      // Notify all students in this block about room deletion
      const students = await User.find({ 
        role: 'student',
        preferredBlock: room.block,
        isActive: true 
      });
      
      if (students.length > 0) {
        await NotificationService.createBulkNotifications(
          students.map(s => s._id),
          'room_deleted',
          'Room Removed from Your Block',
          `Room ${room.roomNumber} has been removed from Block ${room.block} and is no longer available.`,
          { roomNumber: room.roomNumber, block: room.block },
          'medium',
          req.user.id
        );
      }
    } catch (notificationError) {

    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Allocate room to student
const allocateRoom = async (req, res) => {
  try {
    // Only wardens can allocate rooms
    if (req.user.role !== 'warden') {
      return res.status(403).json({
        success: false,
        message: 'Only wardens can allocate rooms to students'
      });
    }

    const { roomId, studentId } = req.body;

    const room = await Room.findById(roomId);
    const student = await User.findById(studentId);

    if (!room || !student) {
      return res.status(404).json({
        success: false,
        message: 'Room or student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Only students can be allocated rooms'
      });
    }

    // Validate that room block matches student's preferred block
    if (!student.preferredBlock) {
      return res.status(400).json({
        success: false,
        message: 'Student has no preferred block assigned'
      });
    }

    if (room.block !== student.preferredBlock) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign room from Block ${room.block} to student from Block ${student.preferredBlock}. Room and student must be in the same block.`
      });
    }

    // Warden can only allocate rooms in their assigned blocks
    const warden = await User.findById(req.user.id);
    let wardenBlocks = [];
    
    // Handle both assignedBlocks (array) and assignedBlock (string) for backward compatibility
    if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
      wardenBlocks = warden.assignedBlocks;
    } else if (warden && warden.assignedBlock) {
      wardenBlocks = [warden.assignedBlock];
    }
    
    if (!wardenBlocks.includes(room.block)) {
      return res.status(403).json({
        success: false,
        message: 'You can only allocate rooms in your assigned blocks'
      });
    }
    
    // Check if student belongs to warden's block
    if (!student.preferredBlock || !wardenBlocks.includes(student.preferredBlock)) {
      return res.status(403).json({
        success: false,
        message: 'You can only allocate rooms to students in your assigned blocks'
      });
    }

    // Additional check: ensure room block matches student's preferred block
    if (room.block !== student.preferredBlock) {
      return res.status(400).json({
        success: false,
        message: `Room is in Block ${room.block} but student prefers Block ${student.preferredBlock}. Cannot assign room from different block.`
      });
    }

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Room is at full capacity'
      });
    }

    // Check if student already has a room
    const existingAllocation = await Room.findOne({
      'occupants.student': studentId
    });

    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a room allocated'
      });
    }

    // Get existing occupants before adding new student
    const existingOccupantIds = room.occupants.map(occupant => occupant.student);

    room.occupants.push({
      student: studentId,
      joinDate: new Date()
    });

    if (room.occupants.length >= room.capacity) {
      room.isAvailable = false;
    }

    await room.save();

    // Handle notifications with error handling
    try {
      // Notify the student about room allocation
      await NotificationService.notifyRoomAllocated(room, student);

      // Notify existing occupants about new roommate
      if (existingOccupantIds.length > 0) {
        await NotificationService.createBulkNotifications(
          existingOccupantIds,
          'room_allocated',
          'New Roommate Assigned',
          `${student.name} has been assigned as your new roommate in Room ${room.roomNumber}.`,
          { roomId: room._id, newRoommateId: student._id, newRoommateName: student.name },
          'medium',
          req.user.id
        );
      }

      // Notify wardens assigned to this block about student assignment
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
          'student_assigned',
          'Student Assigned to Room',
          `Student ${student.name} has been assigned to Room ${room.roomNumber} in Block ${room.block}.`,
          { roomId: room._id, studentId: student._id },
          'medium',
          req.user.id
        );
      }

      // Notify admin about room allocation
      const admins = await User.find({ role: 'admin', isActive: true });
      if (admins.length > 0) {
        await NotificationService.createBulkNotifications(
          admins.map(a => a._id),
          'room_allocated',
          'Room Allocated',
          `Room ${room.roomNumber} in Block ${room.block} has been allocated to student ${student.name} by warden.`,
          { roomId: room._id, studentId: student._id },
          'low',
          req.user.id
        );
      }
    } catch (notificationError) {

      // Don't fail room allocation if notifications fail
    }

    res.status(200).json({
      success: true,
      message: 'Room allocated successfully',
      room
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Deallocate room
const deallocateRoom = async (req, res) => {
  try {
    // Only wardens can deallocate rooms
    if (req.user.role !== 'warden') {
      return res.status(403).json({
        success: false,
        message: 'Only wardens can deallocate rooms from students'
      });
    }

    const { roomId, studentId } = req.body;

    const room = await Room.findById(roomId);
    const student = await User.findById(studentId);

    if (!room || !student) {
      return res.status(404).json({
        success: false,
        message: 'Room or student not found'
      });
    }

    // Warden can only deallocate rooms in their assigned blocks
    const warden = await User.findById(req.user.id);
    let wardenBlocks = [];
    
    // Handle both assignedBlocks (array) and assignedBlock (string) for backward compatibility
    if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
      wardenBlocks = warden.assignedBlocks;
    } else if (warden && warden.assignedBlock) {
      wardenBlocks = [warden.assignedBlock];
    }
    
    if (!wardenBlocks.includes(room.block)) {
      return res.status(403).json({
        success: false,
        message: 'You can only deallocate rooms in your assigned blocks'
      });
    }

    // Check if student is actually in this room
    const occupantExists = room.occupants.some(
      occupant => occupant.student.toString() === studentId
    );

    if (!occupantExists) {
      return res.status(400).json({
        success: false,
        message: 'Student is not allocated to this room'
      });
    }

    // Get other occupants before removing the student
    const otherOccupantIds = room.occupants
      .filter(occupant => occupant.student.toString() !== studentId)
      .map(occupant => occupant.student);

    room.occupants = room.occupants.filter(
      occupant => occupant.student.toString() !== studentId
    );

    // Update availability based on current occupancy
    room.isAvailable = room.occupants.length < room.capacity;
    await room.save();

    // Handle notifications with error handling
    try {
      // Notify the student about room deallocation
      await NotificationService.createNotification(
        studentId,
        'room_deallocated',
        'Room Deallocated',
        `You have been deallocated from Room ${room.roomNumber} in Block ${room.block}.`,
        { roomId: room._id },
        'high'
      );

      // Notify remaining occupants about roommate leaving
      if (otherOccupantIds.length > 0) {
        await NotificationService.createBulkNotifications(
          otherOccupantIds,
          'room_deallocated',
          'Roommate Moved Out',
          `${student.name} has been deallocated from your room ${room.roomNumber} and is no longer your roommate.`,
          { roomId: room._id, formerRoommateId: student._id, formerRoommateName: student.name },
          'medium',
          req.user.id
        );
      }

      // Notify wardens assigned to this block about student removal
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
          'student_removed',
          'Student Removed from Room',
          `Student ${student.name} has been removed from Room ${room.roomNumber} in Block ${room.block}.`,
          { roomId: room._id, studentId: student._id },
          'medium',
          req.user.id
        );
      }

      // Notify admin about room deallocation
      const admins = await User.find({ role: 'admin', isActive: true });
      if (admins.length > 0) {
        await NotificationService.createBulkNotifications(
          admins.map(a => a._id),
          'room_deallocated',
          'Room Deallocated',
          `Room ${room.roomNumber} in Block ${room.block} has been deallocated from student ${student.name} by warden.`,
          { roomId: room._id, studentId: student._id },
          'low',
          req.user.id
        );
      }
    } catch (notificationError) {

      // Don't fail room deallocation if notifications fail
    }

    res.status(200).json({
      success: true,
      message: 'Room deallocated successfully',
      room
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get student's room
const getMyRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      'occupants.student': req.user.id
    }).populate('occupants.student', 'name email studentId');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'No room allocated'
      });
    }

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get unallocated students for wardens
const getUnallocatedStudents = async (req, res) => {
  try {
    let students;
    
    if (req.user.role === 'admin') {
      // Admin can see all unallocated students
      students = await User.find({
        role: 'student',
        isActive: true
      }).select('name studentId preferredBlock');
    } else if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id);
      
      // Handle both assignedBlocks (array) and assignedBlock (string) for backward compatibility
      let wardenBlocks = [];
      if (warden && warden.assignedBlocks && warden.assignedBlocks.length > 0) {
        wardenBlocks = warden.assignedBlocks;
      } else if (warden && warden.assignedBlock) {
        wardenBlocks = [warden.assignedBlock];
      }
      
      if (wardenBlocks.length === 0) {
        return res.status(200).json({
          success: true,
          students: []
        });
      }

      // Get students in warden's assigned blocks
      students = await User.find({
        role: 'student',
        preferredBlock: { $in: wardenBlocks },
        isActive: true
      }).select('name studentId preferredBlock');
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all allocated student IDs
    const allocatedStudentIds = new Set();
    const allRooms = await Room.find({});
    
    allRooms.forEach(room => {
      room.occupants.forEach(occupant => {
        allocatedStudentIds.add(occupant.student.toString());
      });
    });

    // Filter out students who already have rooms
    const unallocatedStudents = students.filter(student => 
      !allocatedStudentIds.has(student._id.toString())
    );

    res.status(200).json({
      success: true,
      students: unallocatedStudents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get room statistics
const getRoomStats = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build base filter for user role
    let baseFilter = {};
    if (user.role === 'warden') {
      let wardenBlocks = [];
      if (user.assignedBlocks && user.assignedBlocks.length > 0) {
        wardenBlocks = user.assignedBlocks;
      } else if (user.assignedBlock) {
        wardenBlocks = [user.assignedBlock];
      }
      if (wardenBlocks.length > 0) {
        baseFilter.block = { $in: wardenBlocks };
      }
    } else if (user.role === 'student') {
      if (user.preferredBlock) {
        baseFilter.block = user.preferredBlock;
      }
    }

    const stats = await Room.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          available: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isAvailable', true] }, { $lt: [{ $size: '$occupants' }, '$capacity'] }] },
                1,
                0
              ]
            }
          },
          occupied: {
            $sum: {
              $cond: [
                { $gt: [{ $size: '$occupants' }, 0] },
                1,
                0
              ]
            }
          },
          fullyOccupied: {
            $sum: {
              $cond: [
                { $eq: [{ $size: '$occupants' }, '$capacity'] },
                1,
                0
              ]
            }
          },
          byBlock: { $push: '$block' },
          byType: { $push: '$roomType' },
          byMaintenance: { $push: '$maintenanceStatus' },
          totalCapacity: { $sum: '$capacity' },
          totalOccupants: { $sum: { $size: '$occupants' } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, available: 0, occupied: 0, fullyOccupied: 0,
      byBlock: [], byType: [], byMaintenance: [],
      totalCapacity: 0, totalOccupants: 0
    };

    // Process breakdowns
    const blockStats = result.byBlock.reduce((acc, block) => {
      acc[block] = (acc[block] || 0) + 1;
      return acc;
    }, {});

    const typeStats = result.byType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const maintenanceStats = result.byMaintenance.reduce((acc, status) => {
      acc[status || 'good'] = (acc[status || 'good'] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      statistics: {
        overview: {
          total: result.total,
          available: result.available,
          occupied: result.occupied,
          fullyOccupied: result.fullyOccupied,
          vacant: result.total - result.occupied,
          occupancyRate: result.totalCapacity > 0 ? Math.round((result.totalOccupants / result.totalCapacity) * 100) : 0
        },
        byBlock: blockStats,
        byType: typeStats,
        byMaintenance: maintenanceStats,
        capacity: {
          total: result.totalCapacity,
          occupied: result.totalOccupants,
          available: result.totalCapacity - result.totalOccupants
        }
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch room statistics'
    });
  }
};

// Get available blocks
const getAvailableBlocks = async (req, res) => {
  try {
    const blocks = await Room.distinct('block');
    res.status(200).json({
      success: true,
      blocks: blocks.sort()
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
  getRooms,
  getRoomStats,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateRoom,
  deallocateRoom,
  getMyRoom,
  getUnallocatedStudents,
  getAvailableBlocks
};