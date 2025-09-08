const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Hostel Information
  hostelName: {
    type: String,
    default: 'University Hostel'
  },
  hostelAddress: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    default: 'admin@hostel.edu'
  },
  contactPhone: {
    type: String,
    default: ''
  },
  
  // Fee Settings
  feeSettings: {
    monthlyFee: {
      type: Number,
      default: 5000
    },
    securityDeposit: {
      type: Number,
      default: 10000
    },
    lateFeePercentage: {
      type: Number,
      default: 5
    },
    feeGracePeriodDays: {
      type: Number,
      default: 7
    }
  },
  
  // Room Settings
  roomSettings: {
    defaultCapacity: {
      type: Number,
      default: 2
    },
    availableBlocks: [{
      type: String
    }],
    roomTypes: [{
      name: String,
      capacity: Number,
      fee: Number
    }]
  },
  
  // Notification Settings
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    notificationRetentionDays: {
      type: Number,
      default: 30
    }
  },
  
  // System Settings
  systemSettings: {
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    allowSelfRegistration: {
      type: Boolean,
      default: false
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 60
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    }
  },
  
  // Academic Settings
  academicSettings: {
    currentSemester: {
      type: String,
      default: 'Fall 2024'
    },
    semesterStartDate: {
      type: Date
    },
    semesterEndDate: {
      type: Date
    },
    vacationPeriods: [{
      name: String,
      startDate: Date,
      endDate: Date
    }]
  },
  
  // Complaint Settings
  complaintSettings: {
    autoAssignToWarden: {
      type: Boolean,
      default: true
    },
    escalationDays: {
      type: Number,
      default: 3
    },
    allowAnonymousComplaints: {
      type: Boolean,
      default: false
    }
  },
  
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);