const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'warden', 'student'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'complaint_new',
      'complaint_resolved',
      'complaint_updated',
      'room_allocated',
      'room_deallocated',
      'room_updated',
      'room_deleted',
      'room_added',
      'fee_due',
      'fee_paid',
      'fee_payment',
      'fee_overdue',
      'fee_generated',
      'leave_request',
      'leave_approved',
      'leave_rejected',
      'leave_updated',
      'student_blocked',
      'student_unblocked',
      'student_assigned',
      'student_removed',
      'student_updated',
      'student_deleted',
      'student_activated',
      'student_deactivated',
      'profile_updated',
      'account_activated',
      'account_deactivated',
      'warden_updated',
      'warden_activated',
      'warden_deactivated',
      'warden_added',
      'warden_removed',
      'notice_new',
      'announcement_new',
      'announcement_updated',
      'announcement_deleted',
      'notification_deleted',
      'hostel_info_updated',
      'system_alert',
      'account_created',
      'welcome_email_sent',
      'welcome_email_failed',
      'password_reset_requested',
      'password_reset_email_sent',
      'password_reset_email_failed',
      'account_deleted'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, recipient: 1 });

module.exports = mongoose.model('Notification', notificationSchema);