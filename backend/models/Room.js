const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    enum: ['A', 'B', 'C', 'D']
  },
  floor: {
    type: Number,
    required: [true, 'Floor is required'],
    min: 1,
    max: 10
  },
  capacity: {
    type: Number,
    required: [true, 'Room capacity is required'],
    min: 1,
    max: 4
  },
  occupants: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinDate: {
      type: Date,
      default: Date.now
    }
  }],
  roomType: {
    type: String,
    enum: ['single', 'double', 'triple', 'quad'],
    required: true
  },
  amenities: [{
    type: String,
    enum: ['AC', 'WiFi', 'Attached Bathroom', 'Balcony', 'Study Table', 'Wardrobe', 'Fan', 'Geyser']
  }],
  monthlyRent: {
    type: Number,
    required: [true, 'Monthly rent is required']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  maintenanceStatus: {
    type: String,
    enum: ['good', 'needs_repair', 'under_maintenance'],
    default: 'good'
  }
}, {
  timestamps: true
});

roomSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.occupants.length;
});

// Pre-save hook to automatically update availability
roomSchema.pre('save', function(next) {
  this.isAvailable = this.occupants.length < this.capacity;
  next();
});

module.exports = mongoose.model('Room', roomSchema);