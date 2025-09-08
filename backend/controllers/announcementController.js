const Announcement = require('../models/Announcement');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// Allowed sort fields to prevent NoSQL injection
const ALLOWED_SORT_FIELDS = ['createdAt', 'priority', 'title', 'updatedAt', 'expiresAt'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALLOWED_AUDIENCES = ['all', 'students', 'wardens', 'specific_blocks'];

// Get announcement statistics
const getAnnouncementStats = async (req, res) => {
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

    // Get query parameters for filtering
    const params = validateQueryParams(req.query);
    let filter = buildFilter(params, user);
    filter = applyRoleFilter(filter, user);

    const stats = await Announcement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isActive', true] },
                    {
                      $or: [
                        { $not: { $ifNull: ['$expiresAt', false] } },
                        { $gt: ['$expiresAt', new Date()] }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          expired: {
            $sum: {
              $cond: [
                { $and: [{ $ifNull: ['$expiresAt', false] }, { $lte: ['$expiresAt', new Date()] }] },
                1,
                0
              ]
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              isActive: '$isActive'
            }
          },
          byAudience: {
            $push: '$targetAudience'
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      expired: 0,
      byPriority: [],
      byAudience: []
    };

    // Process priority breakdown
    const priorityStats = result.byPriority.reduce((acc, item) => {
      if (!acc[item.priority]) acc[item.priority] = 0;
      acc[item.priority]++;
      return acc;
    }, {});

    // Process audience breakdown
    const audienceStats = result.byAudience.reduce((acc, audience) => {
      if (!acc[audience]) acc[audience] = 0;
      acc[audience]++;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      statistics: {
        overview: {
          total: result.total,
          active: result.active,
          expired: result.expired,
          inactive: result.total - result.active - result.expired
        },
        byPriority: priorityStats,
        byAudience: audienceStats
      }
    });
  } catch (error) {
    console.error('getAnnouncementStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement statistics'
    });
  }
};

// Helper function to validate and sanitize query parameters
const validateQueryParams = (query) => {
  const {
    page = 1,
    limit = 12,
    active = 'true',
    priority,
    search,
    targetAudience,
    targetBlocks,
    author,
    dateFrom,
    dateTo,
    expired,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  // Validate pagination
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 12));

  // Validate sort field
  const validSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

  // Validate priority
  const validPriority = priority && ALLOWED_PRIORITIES.includes(priority) ? priority : null;

  // Validate target audience
  const validTargetAudience = targetAudience && ALLOWED_AUDIENCES.includes(targetAudience) ? targetAudience : null;

  // Validate target blocks
  const validTargetBlocks = targetBlocks ? 
    targetBlocks.split(',').filter(block => ['A', 'B', 'C', 'D'].includes(block.trim())) : null;

  // Sanitize search term
  const validSearch = search ? search.toString().trim().slice(0, 100) : null;

  // Validate date filters
  const validDateFrom = dateFrom ? new Date(dateFrom) : null;
  const validDateTo = dateTo ? new Date(dateTo) : null;

  return {
    page: validPage,
    limit: validLimit,
    active,
    priority: validPriority,
    search: validSearch,
    targetAudience: validTargetAudience,
    targetBlocks: validTargetBlocks,
    author: author || null,
    dateFrom: validDateFrom && !isNaN(validDateFrom) ? validDateFrom : null,
    dateTo: validDateTo && !isNaN(validDateTo) ? validDateTo : null,
    expired: expired || null,
    sortBy: validSortBy,
    sortOrder: validSortOrder
  };
};

// Helper function to build filter object
const buildFilter = (params, user) => {
  let filter = {};
  let andConditions = [];

  // Filter by active status
  if (params.active === 'true') {
    filter.isActive = true;
    andConditions.push({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  } else if (params.active === 'false') {
    filter.isActive = false;
  }

  // Expired filter
  if (params.expired === 'true') {
    filter.expiresAt = { $lte: new Date() };
  } else if (params.expired === 'false') {
    andConditions.push({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  }

  // Priority filtering
  if (params.priority) filter.priority = params.priority;

  // Target audience filtering
  if (params.targetAudience) filter.targetAudience = params.targetAudience;

  // Target blocks filtering
  if (params.targetBlocks && params.targetBlocks.length > 0) {
    filter.targetBlocks = { $in: params.targetBlocks };
  }

  // Author filtering
  if (params.author) {
    filter.author = params.author;
  }

  // Date range filtering
  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = params.dateFrom;
    if (params.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  // Search functionality with safe regex
  if (params.search) {
    const escapedSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    andConditions.push({
      $or: [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { content: { $regex: escapedSearch, $options: 'i' } }
      ]
    });
  }

  // Combine all conditions
  if (andConditions.length > 0) {
    if (Object.keys(filter).length > 0) {
      return { $and: [filter, ...andConditions] };
    } else {
      return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
    }
  }

  return filter;
};

// Helper function to apply role-based filtering
const applyRoleFilter = (filter, user) => {
  if (user.role === 'student') {
    const roleFilter = [
      { targetAudience: 'all' },
      { targetAudience: 'students' }
    ];
    if (user.preferredBlock) {
      roleFilter.push({
        targetAudience: 'specific_blocks',
        targetBlocks: { $in: [user.preferredBlock] }
      });
    }
    const baseFilter = { ...filter };
    return { $and: [baseFilter, { $or: roleFilter }] };
  } else if (user.role === 'warden') {
    const roleFilter = [
      { targetAudience: 'all' },
      { targetAudience: 'wardens' }
    ];
    if (user.assignedBlocks && user.assignedBlocks.length > 0) {
      roleFilter.push({
        targetAudience: 'specific_blocks',
        targetBlocks: { $in: user.assignedBlocks }
      });
    }
    const baseFilter = { ...filter };
    return { $and: [baseFilter, { $or: roleFilter }] };
  }
  return filter;
};

// Get announcements for current user
const getAnnouncements = async (req, res) => {
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

    const params = validateQueryParams(req.query);
    let filter = buildFilter(params, user);
    filter = applyRoleFilter(filter, user);

    const sortOptions = {};
    sortOptions[params.sortBy] = params.sortOrder === 'desc' ? -1 : 1;

    const skip = (params.page - 1) * params.limit;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('author', 'name role')
        .sort(sortOptions)
        .limit(params.limit)
        .skip(skip),
      Announcement.countDocuments(filter)
    ]);

    const pagination = {
      currentPage: params.page,
      totalPages: Math.ceil(total / params.limit),
      totalItems: total,
      itemsPerPage: params.limit,
      hasNext: params.page < Math.ceil(total / params.limit),
      hasPrev: params.page > 1
    };

    res.status(200).json({
      success: true,
      announcements,
      pagination
    });
  } catch (error) {
    console.error('getAnnouncements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// Get all announcements (admin/warden only)
const getAllAnnouncements = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const params = validateQueryParams(req.query);
    let filter = buildFilter(params, req.user);

    // Wardens can only see announcements they created or that target their blocks
    if (req.user.role === 'warden') {
      const user = await User.findById(req.user.id);
      const wardenFilter = [
        { author: req.user.id },
        { targetAudience: 'all' },
        { targetAudience: 'wardens' }
      ];
      if (user?.assignedBlocks?.length > 0) {
        wardenFilter.push({
          targetAudience: 'specific_blocks',
          targetBlocks: { $in: user.assignedBlocks }
        });
      }
      const baseFilter = { ...filter };
      filter = { $and: [baseFilter, { $or: wardenFilter }] };
    }

    const sortOptions = {};
    sortOptions[params.sortBy] = params.sortOrder === 'desc' ? -1 : 1;

    const skip = (params.page - 1) * params.limit;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('author', 'name role')
        .sort(sortOptions)
        .limit(params.limit)
        .skip(skip),
      Announcement.countDocuments(filter)
    ]);

    const pagination = {
      currentPage: params.page,
      totalPages: Math.ceil(total / params.limit),
      totalItems: total,
      itemsPerPage: params.limit,
      hasNext: params.page < Math.ceil(total / params.limit),
      hasPrev: params.page > 1
    };

    res.status(200).json({
      success: true,
      announcements,
      pagination
    });
  } catch (error) {
    console.error('getAllAnnouncements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// Create announcement
const createAnnouncement = async (req, res) => {
  try {
    if (!['admin', 'warden'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and wardens can create announcements'
      });
    }

    // Validate input
    const { title, content, targetAudience, targetBlocks, priority, expiresAt } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (!ALLOWED_AUDIENCES.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target audience'
      });
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority'
      });
    }

    const announcementData = {
      title: title.trim(),
      content: content.trim(),
      targetAudience,
      priority,
      author: req.user.id
    };

    if (targetAudience === 'specific_blocks' && Array.isArray(targetBlocks)) {
      announcementData.targetBlocks = targetBlocks.filter(block => 
        ['A', 'B', 'C', 'D'].includes(block)
      );
    }

    if (expiresAt) {
      const expireDate = new Date(expiresAt);
      if (expireDate > new Date()) {
        announcementData.expiresAt = expireDate;
      }
    }

    const announcement = await Announcement.create(announcementData);
    await announcement.populate('author', 'name role');

    // Send notifications
    try {
      await notifyAnnouncementCreated(announcement, req.user.id);
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('createAnnouncement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
};

// Update announcement
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && announcement.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own announcements'
      });
    }

    // Validate input
    const { title, content, targetAudience, targetBlocks, priority, expiresAt } = req.body;
    const updateData = {};

    if (title?.trim()) updateData.title = title.trim();
    if (content?.trim()) updateData.content = content.trim();
    if (ALLOWED_AUDIENCES.includes(targetAudience)) updateData.targetAudience = targetAudience;
    if (ALLOWED_PRIORITIES.includes(priority)) updateData.priority = priority;

    if (targetAudience === 'specific_blocks' && Array.isArray(targetBlocks)) {
      updateData.targetBlocks = targetBlocks.filter(block => 
        ['A', 'B', 'C', 'D'].includes(block)
      );
    }

    if (expiresAt) {
      const expireDate = new Date(expiresAt);
      if (expireDate > new Date()) {
        updateData.expiresAt = expireDate;
      }
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name role');

    // Send notifications
    try {
      await notifyAnnouncementUpdated(updatedAnnouncement, req.user.id);
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error('updateAnnouncement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement'
    });
  }
};

// Delete announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('author', 'name role');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && announcement.author._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own announcements'
      });
    }

    // Send notifications before deletion to all affected users
    try {
      await notifyAnnouncementDeleted(announcement, req.user.id);
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('deleteAnnouncement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};

// Helper functions for notifications
const getAnnouncementRecipients = async (announcement) => {
  try {
    let recipients = [];

    switch (announcement.targetAudience) {
      case 'all':
        recipients = await User.find({ isActive: true }).select('_id');
        break;
      case 'students':
        recipients = await User.find({ role: 'student', isActive: true }).select('_id');
        break;
      case 'wardens':
        recipients = await User.find({ role: 'warden', isActive: true }).select('_id');
        break;
      case 'specific_blocks':
        recipients = await User.find({
          $or: [
            { role: 'student', preferredBlock: { $in: announcement.targetBlocks }, isActive: true },
            { role: 'warden', assignedBlocks: { $in: announcement.targetBlocks }, isActive: true }
          ]
        }).select('_id');
        break;
    }

    return recipients;
  } catch (error) {
    console.error('Error getting announcement recipients:', error);
    return [];
  }
};

const notifyAnnouncementCreated = async (announcement, excludeUserId = null) => {
  try {
    const recipients = await getAnnouncementRecipients(announcement);
    
    const author = await User.findById(announcement.author);
    if (author?.role === 'warden') {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      
      const existingRecipientIds = recipients.map(r => r._id.toString());
      const newAdminRecipients = adminIds.filter(adminId => 
        !existingRecipientIds.includes(adminId.toString())
      );
      
      recipients.push(...newAdminRecipients.map(id => ({ _id: id })));
    }

    if (recipients.length > 0) {
      await NotificationService.createBulkNotifications(
        recipients.map(r => r._id),
        'announcement_new',
        'New Announcement',
        announcement.title,
        { announcementId: announcement._id },
        announcement.priority,
        excludeUserId
      );
    }
  } catch (error) {
    console.error('Error sending announcement notifications:', error);
  }
};

const notifyAnnouncementUpdated = async (announcement, excludeUserId = null) => {
  try {
    const recipients = await getAnnouncementRecipients(announcement);
    
    const author = await User.findById(announcement.author);
    if (author?.role === 'warden') {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      
      const existingRecipientIds = recipients.map(r => r._id.toString());
      const newAdminRecipients = adminIds.filter(adminId => 
        !existingRecipientIds.includes(adminId.toString())
      );
      
      recipients.push(...newAdminRecipients.map(id => ({ _id: id })));
    }

    if (recipients.length > 0) {
      await NotificationService.createBulkNotifications(
        recipients.map(r => r._id),
        'announcement_updated',
        'Announcement Updated',
        `"${announcement.title}" has been updated`,
        { announcementId: announcement._id },
        'medium',
        excludeUserId
      );
    }
  } catch (error) {
    console.error('Error sending announcement update notifications:', error);
  }
};

const notifyAnnouncementDeleted = async (announcement, deletedByUserId = null) => {
  try {
    const deleterUser = deletedByUserId ? await User.findById(deletedByUserId) : announcement.author;
    
    // Get all users who would have received the original announcement
    const originalRecipients = await getAnnouncementRecipients(announcement);
    
    // Also include admins and wardens for administrative awareness
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const wardens = await User.find({ role: 'warden', isActive: true }).select('_id');
    
    // Combine all recipients and remove duplicates
    const allRecipientIds = new Set([
      ...originalRecipients.map(r => r._id.toString()),
      ...admins.map(a => a._id.toString()),
      ...wardens.map(w => w._id.toString())
    ]);
    
    // Convert back to ObjectIds and exclude the deleter
    const finalRecipients = Array.from(allRecipientIds)
      .filter(id => id !== (deletedByUserId || announcement.author._id.toString()))
      .map(id => ({ _id: id }));
    
    if (finalRecipients.length > 0) {
      const title = 'Announcement Deleted';
      const message = deletedByUserId 
        ? `Admin "${deleterUser?.name || 'Admin'}" deleted the announcement: "${announcement.title}"`
        : `The announcement "${announcement.title}" has been deleted by its author.`;
      
      console.log(`Notifying ${finalRecipients.length} users about announcement deletion: "${announcement.title}"`);
      
      await NotificationService.createBulkNotifications(
        finalRecipients.map(r => r._id),
        'announcement_deleted',
        title,
        message,
        { 
          announcementId: announcement._id,
          announcementTitle: announcement.title,
          deletedBy: deleterUser?._id,
          deletedByName: deleterUser?.name,
          deletedByRole: deleterUser?.role,
          originalAuthor: announcement.author.name,
          originalAuthorRole: announcement.author.role,
          targetAudience: announcement.targetAudience,
          targetBlocks: announcement.targetBlocks,
          deletedAt: new Date()
        },
        'high'
      );
      
      console.log(`✅ Sent announcement deletion notifications to ${finalRecipients.length} users`);
    } else {
      console.log('No recipients found for announcement deletion notification');
    }
  } catch (error) {
    console.error('Error sending announcement deletion notifications:', error);
  }
};

module.exports = {
  getAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats
};