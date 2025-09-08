const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// Register user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, role, phone, studentId, course, year, guardianName, guardianPhone, address } = req.body;

    // Check if admin already exists (only one admin allowed)
    if (role === 'admin') {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin account already exists. Only one admin is allowed.'
        });
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      role: role || 'student',
      phone
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
      userData.course = course;
      userData.year = year;
      userData.guardianName = guardianName;
      userData.guardianPhone = guardianPhone;
      userData.address = address;
    }

    const user = await User.create(userData);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const token = generateToken(user._id);

    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive
    };
    
    // Add role-specific fields
    if (user.role === 'warden') {
      userResponse.assignedBlocks = user.assignedBlocks;
      userResponse.wardenId = user.wardenId;
    } else if (user.role === 'student') {
      userResponse.studentId = user.studentId;
      userResponse.preferredBlock = user.preferredBlock;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, studentId, course, year, guardianName, guardianPhone, address, preferredBlock, wardenId, assignedBlocks } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update common fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Update role-specific fields (excluding IDs and blocks which are admin-only)
    if (user.role === 'student') {
      // studentId and preferredBlock are admin-only, cannot be updated by student
      if (course) user.course = course;
      if (year) user.year = year;
      if (guardianName) user.guardianName = guardianName;
      if (guardianPhone) user.guardianPhone = guardianPhone;
      if (address) user.address = address;
    } else if (user.role === 'warden') {
      // wardenId and assignedBlocks are admin-only, cannot be updated by warden
      // No warden-specific fields that they can update themselves
    }

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Check if admin exists
const checkAdmin = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    res.status(200).json({
      success: true,
      adminExists: !!adminExists
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }


    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }



    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save reset token to user
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();



    // Send email and notifications immediately
    const { createNotification } = require('../services/notificationService');
    
    // Create immediate notification with token
    createNotification(
      user._id,
      'password_reset_requested',
      '🔑 Password Reset Token Ready',
      `Your reset token: ${resetToken} (expires in 10 minutes). Use this token to reset your password immediately.`,
      {},
      'urgent'
    ).catch(() => {});
    
    // Send email without waiting
    sendPasswordResetEmail(user.email, resetToken, user.name)
      .then(result => {
        if (result && result.success) {
          createNotification(
            user._id,
            'password_reset_email_sent',
            'Email Delivered',
            'Password reset email delivered successfully',
            {},
            'medium'
          ).catch(() => {});
        } else {
          createNotification(
            user._id,
            'password_reset_email_failed',
            'Email Failed',
            `Email delivery failed. Use token: ${resetToken}`,
            {},
            'urgent'
          ).catch(() => {});
        }
      })
      .catch(() => {
        createNotification(
          user._id,
          'password_reset_email_failed',
          'Email Failed',
          `Email delivery failed. Use token: ${resetToken}`,
          {},
          'urgent'
        ).catch(() => {});
      });
    
    res.status(200).json({
      success: true,
      message: `Reset token generated. Check notifications for immediate access or email for link.`,
      emailSent: true,
      recipientEmail: user.email,
      resetToken: resetToken
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing your request',
      error: error.message
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Test email functionality
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }


    
    const testToken = crypto.randomBytes(16).toString('hex');
    const emailResult = await sendPasswordResetEmail(email, testToken, 'Test User');
    
    res.status(200).json({
      success: emailResult.success,
      message: emailResult.success ? 'Test email sent successfully' : 'Test email failed',
      emailResult,
      testToken: emailResult.success ? undefined : testToken // Only show token if email failed
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  checkAdmin,
  forgotPassword,
  resetPassword,
  testEmail
};