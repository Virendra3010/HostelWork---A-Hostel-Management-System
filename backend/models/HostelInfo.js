const mongoose = require('mongoose');

const hostelInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'University Student Hostel'
  },
  description: {
    type: String,
    default: 'Modern student accommodation facility providing comfortable and secure living environment'
  },
  address: {
    street: { type: String, default: 'University Campus' },
    area: { type: String, default: 'Academic Block' },
    city: { type: String, default: 'City' },
    state: { type: String, default: 'State' },
    pincode: { type: String, default: '000000' }
  },
  contact: {
    mainPhone: { type: String, default: '+91 XXX-XXX-XXXX' },
    emergencyPhone: { type: String, default: '+91 XXX-XXX-XXXX' },
    email: { type: String, default: 'hostel@university.edu' },
    adminEmail: { type: String, default: 'admin@university.edu' }
  },
  capacity: {
    totalStudents: { type: Number, default: 400 },
    totalBlocks: { type: Number, default: 4 },
    blockNames: { type: [String], default: ['A', 'B', 'C', 'D'] }
  },
  facilities: {
    type: [String],
    default: [
      'High-Speed WiFi',
      'Modern Rooms',
      '24/7 Security',
      'Common Areas',
      '24/7 Support',
      'Prime Location'
    ]
  },
  administration: {
    adminName: { type: String, default: 'Hostel Administrator' },
    adminQualification: { type: String, default: 'Contact administration for details' },
    adminEmail: { type: String, default: 'admin@university.edu' },
    adminPhone: { type: String, default: '+91 XXX-XXX-XXXX' },
    assistantName: { type: String, default: 'Assistant Administrator' },
    assistantEmail: { type: String, default: 'support@university.edu' },
    assistantPhone: { type: String, default: '+91 XXX-XXX-XXXX' }
  },
  operationalInfo: {
    established: { type: String, default: '2020' },
    officeHours: {
      weekdays: { type: String, default: 'Monday - Friday: 9:00 AM - 6:00 PM' },
      saturday: { type: String, default: 'Saturday: 9:00 AM - 2:00 PM' },
      sunday: { type: String, default: 'Sunday: Closed' }
    }
  },
  rules: {
    general: {
      type: [String],
      default: [
        'Maintain cleanliness in rooms and common areas',
        'Respect quiet hours (10 PM - 6 AM)',
        'No smoking or alcohol consumption',
        'Visitors allowed only during designated hours',
        'Report maintenance issues promptly'
      ]
    },
    safety: {
      type: [String],
      default: [
        'Always carry your ID card',
        'Do not share room keys or access cards',
        'Report suspicious activities immediately',
        'Follow fire safety protocols',
        'Keep emergency contact numbers handy'
      ]
    }
  }
}, {
  timestamps: true
});

// Ensure only one document exists
hostelInfoSchema.statics.getInstance = async function() {
  let info = await this.findOne();
  if (!info) {
    info = await this.create({});
  }
  return info;
};

module.exports = mongoose.model('HostelInfo', hostelInfoSchema);