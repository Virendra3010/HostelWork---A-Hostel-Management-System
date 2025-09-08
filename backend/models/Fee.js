const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
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
  feeType: {
    type: String,
    enum: ['semester', 'yearly'],
    required: true
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    required: function() {
      return this.feeType === 'semester';
    }
  },
  year: {
    type: Number,
    required: true
  },
  roomRent: {
    type: Number,
    required: true
  },
  messFee: {
    type: Number,
    default: 3000
  },
  electricityBill: {
    type: Number,
    default: 500
  },
  maintenanceFee: {
    type: Number,
    default: 200
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'card', 'upi', 'cheque']
  },
  transactionId: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate fees for same student, feeType, semester/year
feeSchema.index({ student: 1, feeType: 1, semester: 1, year: 1 }, { 
  unique: true, 
  partialFilterExpression: { feeType: 'semester' } 
});
feeSchema.index({ student: 1, feeType: 1, year: 1 }, { 
  unique: true, 
  partialFilterExpression: { feeType: 'yearly' } 
});

module.exports = mongoose.model('Fee', feeSchema);