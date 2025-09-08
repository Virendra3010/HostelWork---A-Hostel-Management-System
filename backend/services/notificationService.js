const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  static async createNotification(recipientId, type, title, message, data = {}, priority = 'medium') {
    try {
      if (!recipientId || !type || !title || !message) {
        return null;
      }
      
      const recipient = await User.findById(recipientId).select('role');
      if (!recipient) return null;

      const notification = new Notification({
        recipient: recipientId,
        recipientRole: recipient.role,
        type,
        title,
        message,
        data,
        priority,
        isRead: false
      });

      await notification.save();
      return notification;
    } catch (error) {
      return null;
    }
  }

  static async createBulkNotifications(recipients, type, title, message, data = {}, priority = 'medium', excludeUserId = null) {
    try {
      // Filter out the excluded user ID
      const filteredRecipients = excludeUserId 
        ? recipients.filter(id => id.toString() !== excludeUserId.toString())
        : recipients;
      
      if (filteredRecipients.length === 0) {
        return [];
      }
      
      const users = await User.find({ _id: { $in: filteredRecipients } });
      
      const notifications = users.map(user => ({
        recipient: user._id,
        recipientRole: user.role,
        type,
        title,
        message,
        data,
        priority
      }));

      const result = await Notification.insertMany(notifications);
      return result;
    } catch (error) {

      return [];
    }
  }

  static async createRoleNotifications(roles, type, title, message, data = {}, priority = 'medium') {
    try {
      const users = await User.find({ role: { $in: roles }, isActive: true });
      const recipients = users.map(user => user._id);
      
      return await this.createBulkNotifications(recipients, type, title, message, data, priority);
    } catch (error) {

      return [];
    }
  }

  static async notifyComplaintCreated(complaint, excludeUserId = null) {
    // Notify admins (excluding current user if admin)
    const admins = await User.find({ role: 'admin', isActive: true });
    const adminIds = admins.map(a => a._id);
    
    if (adminIds.length > 0) {
      await this.createBulkNotifications(
        adminIds,
        'complaint_new',
        'New Complaint Filed',
        `${complaint.student.name} filed a complaint: ${complaint.title}`,
        { complaintId: complaint._id },
        'high',
        excludeUserId
      );
    }

    const wardens = await User.find({ 
      role: 'warden', 
      assignedBlocks: complaint.room.block,
      isActive: true 
    });
    
    if (wardens.length > 0) {
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        'complaint_new',
        'New Complaint in Your Block',
        `${complaint.student.name} filed a complaint: ${complaint.title}`,
        { complaintId: complaint._id },
        'high',
        excludeUserId
      );
    }
  }

  static async notifyComplaintResolved(complaint) {
    await this.createNotification(
      complaint.student._id,
      'complaint_resolved',
      'Complaint Resolved',
      `Your complaint "${complaint.title}" has been resolved.`,
      { complaintId: complaint._id },
      'medium'
    );
  }

  static async notifyComplaintUpdated(complaint, updatedBy, changes) {
    const updaterRole = updatedBy.role === 'admin' ? 'Admin' : 'Warden';
    
    // Notify the student
    let studentTitle = `Complaint Updated by ${updaterRole}`;
    let studentMessage = `Your complaint "${complaint.title}" has been updated by ${updaterRole} ${updatedBy.name}.`;
    
    if (changes.status) {
      const statusText = changes.status.replace('_', ' ');
      studentMessage += ` Status changed to: ${statusText}.`;
    }
    
    if (changes.adminRemarks) {
      studentMessage += ` New remarks have been added.`;
    }
    
    await this.createNotification(
      complaint.student._id,
      'complaint_updated',
      studentTitle,
      studentMessage,
      { 
        complaintId: complaint._id,
        updatedBy: updatedBy._id,
        updaterRole: updatedBy.role,
        changes
      },
      'medium'
    );

    // Notify other stakeholders based on who updated
    if (updatedBy.role === 'admin') {
      // Admin updated - notify wardens in the block
      const wardens = await User.find({ 
        role: 'warden',
        $or: [
          { assignedBlocks: complaint.room.block },
          { assignedBlock: complaint.room.block }
        ],
        isActive: true 
      });
      
      if (wardens.length > 0) {
        let wardenMessage = `Admin ${updatedBy.name} updated complaint "${complaint.title}" in Block ${complaint.room.block}.`;
        if (changes.status) {
          wardenMessage += ` Status: ${changes.status.replace('_', ' ')}.`;
        }
        if (changes.adminRemarks) {
          wardenMessage += ` New remarks added.`;
        }
        
        await this.createBulkNotifications(
          wardens.map(w => w._id),
          'complaint_updated',
          'Complaint Updated by Admin',
          wardenMessage,
          { 
            complaintId: complaint._id,
            updatedBy: updatedBy._id,
            updaterRole: updatedBy.role,
            block: complaint.room.block,
            changes
          },
          'low',
          updatedBy._id
        );
      }
    } else if (updatedBy.role === 'warden') {
      // Warden updated - notify admins
      const admins = await User.find({ role: 'admin', isActive: true });
      
      if (admins.length > 0) {
        let adminMessage = `Warden ${updatedBy.name} updated complaint "${complaint.title}" in Block ${complaint.room.block}.`;
        if (changes.status) {
          adminMessage += ` Status: ${changes.status.replace('_', ' ')}.`;
        }
        if (changes.adminRemarks) {
          adminMessage += ` New remarks added.`;
        }
        
        await this.createBulkNotifications(
          admins.map(a => a._id),
          'complaint_updated',
          'Complaint Updated by Warden',
          adminMessage,
          { 
            complaintId: complaint._id,
            updatedBy: updatedBy._id,
            updaterRole: updatedBy.role,
            block: complaint.room.block,
            changes
          },
          'low',
          updatedBy._id
        );
      }
    }
  }

  static async notifyRoomAllocated(room, student) {
    await this.createNotification(
      student._id,
      'room_allocated',
      'Room Allocated',
      `You have been allocated Room ${room.roomNumber} in Block ${room.block}.`,
      { roomId: room._id },
      'high'
    );
  }

  static async notifyLeaveRequest(leave) {
    const wardens = await User.find({ 
      role: 'warden', 
      assignedBlocks: leave.room.block,
      isActive: true 
    });

    const admins = await User.find({ role: 'admin', isActive: true });
    const recipients = [...wardens.map(w => w._id), ...admins.map(a => a._id)];

    await this.createBulkNotifications(
      recipients,
      'leave_request',
      'New Leave Request',
      `${leave.student.name} requested leave`,
      { leaveId: leave._id },
      'medium'
    );
  }

  static async notifyLeaveStatusUpdate(leave, status) {
    await this.createNotification(
      leave.student._id,
      `leave_${status}`,
      `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your leave request has been ${status}.`,
      { leaveId: leave._id },
      'medium'
    );
  }

  static async notifyLeaveUpdated(leave, updatedBy, changes) {
    const updaterRole = updatedBy.role === 'admin' ? 'Admin' : 'Warden';
    
    // Notify the student
    let studentTitle = `Leave Request Updated by ${updaterRole}`;
    let studentMessage = `Your leave request has been updated by ${updaterRole} ${updatedBy.name}.`;
    
    if (changes.status) {
      const statusText = changes.status.charAt(0).toUpperCase() + changes.status.slice(1);
      studentMessage += ` Status changed to: ${statusText}.`;
    }
    
    if (changes.adminRemarks) {
      studentMessage += ` New remarks have been added.`;
    }
    
    await this.createNotification(
      leave.student._id,
      'leave_updated',
      studentTitle,
      studentMessage,
      { 
        leaveId: leave._id,
        updatedBy: updatedBy._id,
        updaterRole: updatedBy.role,
        changes
      },
      'medium'
    );

    // Notify other stakeholders based on who updated
    if (updatedBy.role === 'admin') {
      // Admin updated - notify wardens in the block
      const wardens = await User.find({ 
        role: 'warden',
        $or: [
          { assignedBlocks: leave.room.block },
          { assignedBlock: leave.room.block }
        ],
        isActive: true 
      });
      
      if (wardens.length > 0) {
        let wardenMessage = `Admin ${updatedBy.name} updated leave request for ${leave.student.name} in Block ${leave.room.block}.`;
        if (changes.status) {
          wardenMessage += ` Status: ${changes.status}.`;
        }
        if (changes.adminRemarks) {
          wardenMessage += ` New remarks added.`;
        }
        
        await this.createBulkNotifications(
          wardens.map(w => w._id),
          'leave_updated',
          'Leave Request Updated by Admin',
          wardenMessage,
          { 
            leaveId: leave._id,
            updatedBy: updatedBy._id,
            updaterRole: updatedBy.role,
            block: leave.room.block,
            changes
          },
          'low',
          updatedBy._id
        );
      }
    } else if (updatedBy.role === 'warden') {
      // Warden updated - notify admins
      const admins = await User.find({ role: 'admin', isActive: true });
      
      if (admins.length > 0) {
        let adminMessage = `Warden ${updatedBy.name} updated leave request for ${leave.student.name} in Block ${leave.room.block}.`;
        if (changes.status) {
          adminMessage += ` Status: ${changes.status}.`;
        }
        if (changes.adminRemarks) {
          adminMessage += ` New remarks added.`;
        }
        
        await this.createBulkNotifications(
          admins.map(a => a._id),
          'leave_updated',
          'Leave Request Updated by Warden',
          adminMessage,
          { 
            leaveId: leave._id,
            updatedBy: updatedBy._id,
            updaterRole: updatedBy.role,
            block: leave.room.block,
            changes
          },
          'low',
          updatedBy._id
        );
      }
    }
  }

  static async notifyStudentAssigned(student, excludeUserId = null) {
    if (!student.preferredBlock) return;

    const wardens = await User.find({ 
      role: 'warden',
      $or: [
        { assignedBlocks: student.preferredBlock },
        { assignedBlock: student.preferredBlock }
      ],
      isActive: true 
    });
    
    if (wardens.length > 0) {
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        'student_assigned',
        'New Student Assigned to Your Block',
        `${student.name} (${student.studentId}) has been assigned to Block ${student.preferredBlock}.`,
        { studentId: student._id, block: student.preferredBlock },
        'medium',
        excludeUserId
      );
    }
  }

  static async notifyStudentDeleted(student, excludeUserId = null) {
    if (!student.preferredBlock) return;

    const wardens = await User.find({ 
      role: 'warden',
      $or: [
        { assignedBlocks: student.preferredBlock },
        { assignedBlock: student.preferredBlock }
      ],
      isActive: true 
    });
    
    if (wardens.length > 0) {
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        'student_deleted',
        'Student Removed from Your Block',
        `${student.name} (${student.studentId}) has been removed from Block ${student.preferredBlock}.`,
        { studentId: student._id, block: student.preferredBlock },
        'medium',
        excludeUserId
      );
    }
  }

  static async notifyStudentStatusChange(student, isActivated, excludeUserId = null) {
    // Notify the student about their status change
    const studentType = isActivated ? 'account_activated' : 'account_deactivated';
    const studentTitle = isActivated ? 'Account Activated' : 'Account Deactivated';
    const studentMessage = `Your student account has been ${isActivated ? 'activated' : 'deactivated'} by the administrator.${isActivated ? ' You can now access all hostel services.' : ' Please contact administration if you have any questions.'}`;
    
    await this.createNotification(
      student._id,
      studentType,
      studentTitle,
      studentMessage,
      { studentId: student._id, isActive: isActivated },
      'high'
    );

    // Notify wardens in the student's block
    if (!student.preferredBlock) return;

    const wardens = await User.find({ 
      role: 'warden',
      $or: [
        { assignedBlocks: student.preferredBlock },
        { assignedBlock: student.preferredBlock }
      ],
      isActive: true 
    });
    
    if (wardens.length > 0) {
      const type = isActivated ? 'student_activated' : 'student_deactivated';
      const title = isActivated ? 'Student Activated in Your Block' : 'Student Deactivated in Your Block';
      const message = `${student.name} (${student.studentId}) has been ${isActivated ? 'activated' : 'deactivated'} in Block ${student.preferredBlock}.`;
      
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        type,
        title,
        message,
        { studentId: student._id, block: student.preferredBlock, isActive: isActivated },
        'medium',
        excludeUserId
      );
    }
  }

  static async notifyWardenUpdated(warden, changes) {
    const changesList = [];
    if (changes.assignedBlocks) changesList.push('assigned blocks');
    if (changes.name) changesList.push('name');
    if (changes.email) changesList.push('email');
    if (changes.phone) changesList.push('phone');
    if (changes.wardenId) changesList.push('warden ID');
    
    if (changesList.length === 0) return;
    
    const changesText = changesList.join(', ');
    
    await this.createNotification(
      warden._id,
      'warden_updated',
      'Your Profile Has Been Updated',
      `Your ${changesText} ${changesList.length > 1 ? 'have' : 'has'} been updated by the administrator.`,
      { wardenId: warden._id, changes },
      'medium'
    );
  }

  static async notifyWardenStatusChange(warden, isActivated) {
    const type = isActivated ? 'warden_activated' : 'warden_deactivated';
    const title = isActivated ? 'Account Activated' : 'Account Deactivated';
    const message = `Your warden account has been ${isActivated ? 'activated' : 'deactivated'} by the administrator.`;
    
    await this.createNotification(
      warden._id,
      type,
      title,
      message,
      { wardenId: warden._id, isActive: isActivated },
      'high'
    );
  }

  static async notifyStudentUpdated(student, changes, excludeUserId = null) {
    // Notify the student about their profile update
    const changesList = [];
    if (changes.name) changesList.push('name');
    if (changes.email) changesList.push('email');
    if (changes.phone) changesList.push('phone');
    if (changes.course) changesList.push('course');
    if (changes.year) changesList.push('year');
    if (changes.guardianName) changesList.push('guardian name');
    if (changes.guardianPhone) changesList.push('guardian phone');
    if (changes.address) changesList.push('address');
    if (changes.preferredBlock) changesList.push('preferred block');
    
    if (changesList.length > 0) {
      const changesText = changesList.join(', ');
      
      // Notify the student
      await this.createNotification(
        student._id,
        'profile_updated',
        'Your Profile Has Been Updated',
        `Your ${changesText} ${changesList.length > 1 ? 'have' : 'has'} been updated by the administrator.`,
        { studentId: student._id, changes },
        'medium'
      );
    }

    // Notify wardens in the student's block
    if (!student.preferredBlock) return;

    const wardens = await User.find({ 
      role: 'warden',
      $or: [
        { assignedBlocks: student.preferredBlock },
        { assignedBlock: student.preferredBlock }
      ],
      isActive: true 
    });
    
    if (wardens.length > 0 && changesList.length > 0) {
      const changesText = changesList.join(', ');
      
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        'student_updated',
        'Student Information Updated',
        `${student.name} (${student.studentId}) in Block ${student.preferredBlock} has updated their ${changesText}.`,
        { studentId: student._id, block: student.preferredBlock, changes },
        'low',
        excludeUserId
      );
    }
  }

  static async notifyWardenCreated(warden) {
    // Notify all other wardens about new warden (including inactive ones)
    const otherWardens = await User.find({ 
      role: 'warden', 
      _id: { $ne: warden._id }
    });
    
    if (otherWardens.length > 0) {
      const blocks = warden.assignedBlocks && warden.assignedBlocks.length > 0 
        ? warden.assignedBlocks.join(', ') 
        : warden.assignedBlock || 'No specific blocks';
      
      await this.createBulkNotifications(
        otherWardens.map(w => w._id),
        'warden_added',
        'New Warden Added',
        `${warden.name} has been added as a new warden for blocks: ${blocks}.`,
        { wardenId: warden._id, assignedBlocks: warden.assignedBlocks },
        'medium'
      );
    }
  }

  static async notifyWardenDeleted(warden) {
    try {
      // Notify all other wardens about warden deletion (including inactive ones)
      const otherWardens = await User.find({ 
        role: 'warden', 
        _id: { $ne: warden._id }
      });
      
      if (otherWardens.length > 0) {
        const blocks = warden.assignedBlocks && warden.assignedBlocks.length > 0 
          ? warden.assignedBlocks.join(', ') 
          : warden.assignedBlock || 'No specific blocks';
        
        await this.createBulkNotifications(
          otherWardens.map(w => w._id),
          'warden_removed',
          'Warden Removed',
          `${warden.name} has been removed from warden duties for ${blocks}.`,
          { wardenName: warden.name, assignedBlocks: warden.assignedBlocks },
          'high'
        );
      }
    } catch (error) {

    }
  }

  // Enhanced room management notifications for wardens
  static async notifyWardenRoomManagement(wardens, operation, room, adminUser) {
    try {

      
      if (wardens.length === 0) return;
      
      let title, message, type, priority;
      
      switch (operation) {
        case 'created':
          type = 'room_updated';
          title = 'New Room Added to Your Block';
          message = `Admin ${adminUser.name} has added a new room ${room.roomNumber} to Block ${room.block}. The room has ${room.capacity} capacity and monthly rent of ₹${room.monthlyRent}.`;
          priority = 'medium';
          break;
        case 'updated':
          type = 'room_updated';
          title = 'Room Updated in Your Block';
          message = `Admin ${adminUser.name} has updated room ${room.roomNumber} in Block ${room.block}. Please review the changes.`;
          priority = 'low';
          break;
        case 'deleted':
          type = 'room_deleted';
          title = 'Room Deleted from Your Block';
          message = `Admin ${adminUser.name} has deleted room ${room.roomNumber} from Block ${room.block}. This room is no longer available.`;
          priority = 'medium';
          break;
        default:
          return;
      }
      
      await this.createBulkNotifications(
        wardens.map(w => w._id),
        type,
        title,
        message,
        { 
          roomId: room._id || null,
          roomNumber: room.roomNumber,
          block: room.block,
          operation,
          adminId: adminUser._id,
          adminName: adminUser.name
        },
        priority,
        adminUser._id
      );
      

    } catch (error) {

    }
  }

  static async notifyHostelInfoUpdated(adminUser) {
    try {
      // Notify all wardens and students about hostel info update
      const users = await User.find({ 
        role: { $in: ['warden', 'student'] },
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });
      
      if (users.length > 0) {
        await this.createBulkNotifications(
          users.map(u => u._id),
          'hostel_info_updated',
          'Hostel Information Updated',
          `Admin ${adminUser.name} has updated the hostel information. Check the About section for the latest details.`,
          { 
            updatedBy: adminUser._id,
            updatedByName: adminUser.name
          },
          'medium',
          adminUser._id
        );
      }
      

    } catch (error) {

    }
  }

  static async notifyFeeGenerated(fees, feeType, semester, year, adminUser) {
    try {
      const Room = require('../models/Room');
      const periodText = feeType === 'semester' ? `${semester} Semester ${year}` : `Academic Year ${year}`;
      
      const studentIds = [];
      const wardenIds = new Set();
      
      for (const fee of fees) {
        studentIds.push(fee.student);
        
        // Find wardens for the student's block
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
          wardens.forEach(warden => wardenIds.add(warden._id.toString()));
        }
      }
      
      // Notify students about fee generation
      if (studentIds.length > 0) {
        await this.createBulkNotifications(
          studentIds,
          'fee_generated',
          'New Fee Generated',
          `Your fees for ${periodText} have been generated. Please check your fee details and make payment before the due date.`,
          { feeType, semester, year, period: periodText, generatedBy: adminUser._id },
          'high'
        );
      }
      
      // Notify wardens about fee generation in their blocks
      if (wardenIds.size > 0) {
        await this.createBulkNotifications(
          Array.from(wardenIds),
          'fee_generated',
          'Fees Generated for Your Block',
          `Admin ${adminUser.name} has generated fees for ${periodText} in your assigned blocks. ${fees.length} fee records were created.`,
          { feeType, semester, year, period: periodText, count: fees.length, generatedBy: adminUser._id },
          'medium',
          adminUser._id
        );
      }
      
    } catch (error) {
      console.error('Error sending fee generation notifications:', error);
    }
  }
}

module.exports = NotificationService;