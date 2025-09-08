const HostelInfo = require('../models/HostelInfo');
const NotificationService = require('../services/notificationService');

// Get hostel information
const getHostelInfo = async (req, res) => {
  try {
    const hostelInfo = await HostelInfo.getInstance();
    
    res.status(200).json({
      success: true,
      data: hostelInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update hostel information (admin only)
const updateHostelInfo = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update hostel information'
      });
    }

    const hostelInfo = await HostelInfo.getInstance();
    
    // Update the hostel info with provided data
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key])) {
        // Handle nested objects
        hostelInfo[key] = { ...hostelInfo[key], ...req.body[key] };
      } else {
        hostelInfo[key] = req.body[key];
      }
    });

    await hostelInfo.save();

    // Send notifications to all users about the update
    await NotificationService.notifyHostelInfoUpdated(req.user);

    res.status(200).json({
      success: true,
      message: 'Hostel information updated successfully',
      data: hostelInfo
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
  getHostelInfo,
  updateHostelInfo
};