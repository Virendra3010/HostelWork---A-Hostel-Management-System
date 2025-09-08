const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'wardens', 'specific_blocks'],
    default: 'all'
  },
  targetBlocks: [{
    type: String
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Index for efficient queries
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ targetAudience: 1, isActive: 1 });
announcementSchema.index({ targetBlocks: 1, isActive: 1 });
announcementSchema.index({ expiresAt: 1 }, { sparse: true });
announcementSchema.index({ author: 1, createdAt: -1 });
announcementSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Announcement', announcementSchema);