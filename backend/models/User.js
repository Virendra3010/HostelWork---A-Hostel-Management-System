const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: function() {
      return this.isNew;
    },
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'warden', 'student'],
    default: 'student'
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Phone number must be exactly 10 digits'
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Student specific fields
  studentId: {
    type: String,
    sparse: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: null
  },
  guardianName: {
    type: String,
    trim: true
  },
  guardianPhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{10}$/.test(v);
      },
      message: 'Guardian phone number must be exactly 10 digits'
    }
  },
  address: {
    type: String,
    trim: true
  },
  preferredBlock: {
    type: String,
    enum: ['A', 'B', 'C', 'D']
  },
  // Warden specific fields
  wardenId: {
    type: String,
    sparse: true
  },
  assignedBlock: {
    type: String,
    enum: ['A', 'B', 'C', 'D']
  },
  assignedBlocks: [{
    type: String,
    enum: ['A', 'B', 'C', 'D']
  }],
  // Password reset fields
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);