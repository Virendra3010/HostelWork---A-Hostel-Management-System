const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['home', 'medical', 'emergency', 'personal', 'other'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminRemarks: {
    type: String
  },
  remarksBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarksRole: {
    type: String,
    enum: ['admin', 'warden']
  },
  approvedDate: {
    type: Date
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Leave', leaveSchema);