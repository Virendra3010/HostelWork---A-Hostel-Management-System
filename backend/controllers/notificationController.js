const Notification = require('../models/Notification');
const User = require('../models/User');

// Get user notifications with enhanced filtering
const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      unreadOnly = 'false',
      type,
      priority,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter = { recipient: req.user.id };
    
    // Apply filters
    if (unreadOnly === 'true') filter.isRead = false;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    
    // Date range filtering
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Add search functionality
    if (search) {
      const { buildSearchQuery } = require('../utils/pagination');
      const searchQuery = buildSearchQuery(search, ['title', 'message']);
      filter = { ...filter, ...searchQuery };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const { paginate } = require('../utils/pagination');
    const result = await paginate(Notification, filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [{ path: 'recipient', select: 'name email' }]
    });

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    }).populate('recipient', 'name email role');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // If admin deletes a notification, notify other relevant users
    if (req.user.role === 'admin') {
      await notifyOthersAboutDeletion(notification, req.user);
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to notify others about notification deletion
const notifyOthersAboutDeletion = async (deletedNotification, deleterUser) => {
  try {
    const NotificationService = require('../services/notificationService');
    
    // Determine who should be notified based on the deleted notification type
    let recipientsToNotify = [];
    let notificationTitle = '';
    let notificationMessage = '';
    
    switch (deletedNotification.type) {
      case 'complaint_new':
      case 'complaint_updated':
      case 'complaint_resolved':
        // Notify wardens if admin deleted complaint notification
        if (deletedNotification.data?.complaintId || deletedNotification.data?.block) {
          const wardens = await User.find({ role: 'warden', isActive: true });
          recipientsToNotify = wardens.map(w => w._id);
          notificationTitle = 'Complaint Notification Removed';
          notificationMessage = `Admin ${deleterUser.name} removed a complaint notification. Please check complaint status directly.`;
        }
        break;
        
      case 'leave_request':
      case 'leave_updated':
      case 'leave_approved':
      case 'leave_rejected':
        // Notify wardens if admin deleted leave notification
        if (deletedNotification.data?.leaveId || deletedNotification.data?.block) {
          const wardens = await User.find({ role: 'warden', isActive: true });
          recipientsToNotify = wardens.map(w => w._id);
          notificationTitle = 'Leave Notification Removed';
          notificationMessage = `Admin ${deleterUser.name} removed a leave notification. Please check leave status directly.`;
        }
        break;
        
      case 'room_allocated':
      case 'room_updated':
      case 'room_deleted':
      case 'room_added':
        // Notify both wardens and students about room-related notification deletion
        let roomWardens = [];
        let roomStudents = [];
        
        if (deletedNotification.data?.block) {
          // Notify wardens in the specific block
          roomWardens = await User.find({ 
            role: 'warden',
            $or: [
              { assignedBlocks: deletedNotification.data.block },
              { assignedBlock: deletedNotification.data.block }
            ],
            isActive: true 
          });
          
          // Notify students in the same block (they need to know about room changes)
          roomStudents = await User.find({
            role: 'student',
            preferredBlock: deletedNotification.data.block,
            isActive: true
          });
          
          recipientsToNotify = [...roomWardens.map(w => w._id), ...roomStudents.map(s => s._id)];
          notificationTitle = 'Room Notification Removed';
          notificationMessage = `Admin ${deleterUser.name} removed a room notification for Block ${deletedNotification.data.block}. Please check room status directly.`;
        } else {
          // If no specific block, notify all wardens and students
          roomWardens = await User.find({ role: 'warden', isActive: true });
          roomStudents = await User.find({ role: 'student', isActive: true });
          recipientsToNotify = [...roomWardens.map(w => w._id), ...roomStudents.map(s => s._id)];
          notificationTitle = 'Room Notification Removed';
          notificationMessage = `Admin ${deleterUser.name} removed a room notification. Please check room status directly.`;
        }
        break;
        
      case 'student_assigned':
      case 'student_updated':
      case 'student_activated':
      case 'student_deactivated':
      case 'student_deleted':
        // Notify both wardens and affected students about student-related notification deletion
        let studentsToNotify = [];
        let wardensToNotify = [];
        
        if (deletedNotification.data?.block) {
          // Notify wardens in the specific block
          wardensToNotify = await User.find({ 
            role: 'warden',
            $or: [
              { assignedBlocks: deletedNotification.data.block },
              { assignedBlock: deletedNotification.data.block }
            ],
            isActive: true 
          });
          
          // Notify students in the same block
          studentsToNotify = await User.find({
            role: 'student',
            preferredBlock: deletedNotification.data.block,
            isActive: true
          });
        } else {
          // If no specific block, notify all wardens and students
          wardensToNotify = await User.find({ role: 'warden', isActive: true });
          studentsToNotify = await User.find({ role: 'student', isActive: true });
        }
        
        recipientsToNotify = [...wardensToNotify.map(w => w._id), ...studentsToNotify.map(s => s._id)];
        notificationTitle = 'Student Notification Removed';
        notificationMessage = deletedNotification.data?.block 
          ? `Admin ${deleterUser.name} removed a student notification for Block ${deletedNotification.data.block}. Please check student status directly.`
          : `Admin ${deleterUser.name} removed a student notification. Please check student status directly.`;
        break;
        
      case 'announcement_new':
      case 'announcement_updated':
      case 'announcement_deleted':
        // Only notify others if the deleted notification was meant for multiple roles
        // If admin deletes their own announcement notification, don't spam others
        if (deletedNotification.recipient.role === 'admin' && deleterUser.role === 'admin') {
          // Admin deleting their own announcement notification - only notify if it was a system-wide announcement
          if (deletedNotification.data?.targetAudience === 'all' || 
              deletedNotification.data?.targetAudience === 'students' ||
              deletedNotification.data?.targetAudience === 'wardens') {
            
            let targetUsers = [];
            if (deletedNotification.data.targetAudience === 'all') {
              const wardens = await User.find({ role: 'warden', isActive: true });
              const students = await User.find({ role: 'student', isActive: true });
              targetUsers = [...wardens.map(w => w._id), ...students.map(s => s._id)];
            } else if (deletedNotification.data.targetAudience === 'students') {
              const students = await User.find({ role: 'student', isActive: true });
              targetUsers = students.map(s => s._id);
            } else if (deletedNotification.data.targetAudience === 'wardens') {
              const wardens = await User.find({ role: 'warden', isActive: true });
              targetUsers = wardens.map(w => w._id);
            }
            
            recipientsToNotify = targetUsers;
            notificationTitle = 'Announcement Notification Removed';
            notificationMessage = `Admin ${deleterUser.name} removed an announcement notification. Please check announcements page for current information.`;
          } else {
            // Skip notification for admin's personal announcement notification deletion
          }
        } else {
          // For other cases, notify relevant users based on the original notification context
          const wardens = await User.find({ role: 'warden', isActive: true });
          const students = await User.find({ role: 'student', isActive: true });
          recipientsToNotify = [...wardens.map(w => w._id), ...students.map(s => s._id)];
          notificationTitle = 'Announcement Notification Removed';
          notificationMessage = `Admin ${deleterUser.name} removed an announcement notification. Please check announcements page for current information.`;
        }
        break;
        
      case 'warden_added':
      case 'warden_removed':
      case 'warden_updated':
      case 'warden_activated':
      case 'warden_deactivated':
        // Notify other wardens about warden-related notification deletion
        const otherWardens = await User.find({ 
          role: 'warden', 
          _id: { $ne: adminUser._id },
          isActive: true 
        });
        recipientsToNotify = otherWardens.map(w => w._id);
        notificationTitle = 'Warden Notification Removed';
        notificationMessage = `Admin ${deleterUser.name} removed a warden-related notification. Please check with administration for updates.`;
        break;
        
      case 'fee_due':
      case 'fee_paid':
      case 'fee_payment':
      case 'fee_overdue':
        // Notify wardens about fee-related notification deletion
        const wardensForFee = await User.find({ role: 'warden', isActive: true });
        recipientsToNotify = wardensForFee.map(w => w._id);
        notificationTitle = 'Fee Notification Removed';
        notificationMessage = `Admin ${deleterUser.name} removed a fee-related notification. Please check fee management for current status.`;
        break;
    }
    
    // Send notifications to relevant users
    if (recipientsToNotify.length > 0) {
      await NotificationService.createBulkNotifications(
        recipientsToNotify,
        'notification_deleted',
        notificationTitle,
        notificationMessage,
        {
          deletedNotificationType: deletedNotification.type,
          deletedBy: deleterUser._id,
          deletedByName: deleterUser.name,
          deletedByRole: deleterUser.role,
          originalData: deletedNotification.data,
          deletedAt: new Date()
        },
        'low',
        deleterUser._id
      );
    }
  } catch (error) {
    console.error('Error notifying others about notification deletion:', error);
  }
};

// Delete all notifications
const deleteAllNotifications = async (req, res) => {
  try {
    // Get notifications before deletion to notify others if needed
    let notificationsToDelete = [];
    if (req.user.role === 'admin') {
      notificationsToDelete = await Notification.find({
        recipient: req.user.id
      }).populate('recipient', 'name email role');
    }

    await Notification.deleteMany({
      recipient: req.user.id
    });

    // Only notify others if admin deleted all notifications (not for warden)
    if (req.user.role === 'admin' && notificationsToDelete.length > 0) {
      await notifyOthersAboutBulkDeletion(notificationsToDelete, req.user);
    }

    res.status(200).json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to notify others about bulk notification deletion
const notifyOthersAboutBulkDeletion = async (deletedNotifications, deleterUser) => {
  try {
    const NotificationService = require('../services/notificationService');
    
    if (!deletedNotifications || deletedNotifications.length === 0) {
      return;
    }

    // Only notify if admin cleared notifications (not warden)
    if (deleterUser.role !== 'admin') {
      return;
    }

    // Get all active wardens and students
    const allUsers = await User.find({ 
      role: { $in: ['warden', 'student'] }, 
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    });
    
    if (allUsers.length > 0) {
      const notificationTypes = [...new Set(deletedNotifications.map(n => n.type))];
      const typesList = notificationTypes.slice(0, 3).join(', ') + (notificationTypes.length > 3 ? '...' : '');
      
      await NotificationService.createBulkNotifications(
        allUsers.map(u => u._id),
        'notification_deleted',
        'Admin Cleared All Notifications',
        `Admin ${deleterUser.name} has cleared all their notifications (${deletedNotifications.length} notifications including: ${typesList}). Please check relevant pages for current status.`,
        {
          deletedCount: deletedNotifications.length,
          deletedTypes: notificationTypes,
          deletedBy: deleterUser._id,
          deletedByName: deleterUser.name,
          deletedByRole: deleterUser.role,
          deletedAt: new Date()
        },
        'low',
        deleterUser._id
      );
    }
  } catch (error) {
    console.error('Error notifying others about bulk notification deletion:', error);
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count
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
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
};