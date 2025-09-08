/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, BookOpen, Calendar, Shield, Edit, Save, X, Lock, Eye, EyeOff, UserCheck } from 'lucide-react';
import { profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    isValid: boolean;
  }>({
    score: 0,
    feedback: [],
    isValid: false
  });
  const [passwordErrors, setPasswordErrors] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  // Keyboard shortcuts for password modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPasswordModal) {
        if (e.key === 'Enter' && !passwordLoading) {
          e.preventDefault();
          handlePasswordChange();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handlePasswordModalClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPasswordModal, passwordLoading, passwordData, passwordStrength]);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      setProfile(response.data.data);
      setEditData(response.data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!editData.name?.trim()) {
        toast.error('Name is required');
        return;
      }
      if (!editData.email?.trim()) {
        toast.error('Email is required');
        return;
      }
      if (!editData.phone?.trim()) {
        toast.error('Phone is required');
        return;
      }

      // Clean up data before sending
      const cleanData = {
        name: editData.name?.trim(),
        email: editData.email?.trim(),
        phone: editData.phone?.trim(),
        address: editData.address?.trim() || '',
        guardianName: editData.guardianName?.trim() || '',
        guardianPhone: editData.guardianPhone?.trim() || '',
        course: editData.course?.trim() || '',
        year: editData.year || ''
      };

      const response = await profileAPI.updateProfile(cleanData);
      setProfile(response.data.data);
      setEditData(response.data.data);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.errors) {
        toast.error(error.response.data.errors.join(', '));
      } else {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setEditing(false);
  };

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    if (password.length >= 12) {
      score += 1;
    }

    return {
      score,
      feedback,
      isValid: score >= 4 && password.length >= 8
    };
  };

  // Handle password input changes
  const handlePasswordInputChange = (field: string, value: string) => {
    const newData = { ...passwordData, [field]: value };
    setPasswordData(newData);

    if (field === 'newPassword') {
      setPasswordStrength(checkPasswordStrength(value));
    }

    // Clear errors when user starts typing
    if (passwordErrors[field as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordChange = async () => {
    // Reset errors
    setPasswordErrors({ current: '', new: '', confirm: '' });

    // Validate all fields
    let hasErrors = false;
    const errors = { current: '', new: '', confirm: '' };

    if (!passwordData.currentPassword.trim()) {
      errors.current = 'Current password is required';
      hasErrors = true;
    }

    if (!passwordData.newPassword.trim()) {
      errors.new = 'New password is required';
      hasErrors = true;
    } else if (!passwordStrength.isValid) {
      errors.new = 'Password does not meet security requirements';
      hasErrors = true;
    } else if (passwordData.newPassword === passwordData.currentPassword) {
      errors.new = 'New password must be different from current password';
      hasErrors = true;
    }

    if (!passwordData.confirmPassword.trim()) {
      errors.confirm = 'Please confirm your new password';
      hasErrors = true;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirm = 'Passwords do not match';
      hasErrors = true;
    }

    if (hasErrors) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      await profileAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      handlePasswordModalClose();
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.response?.data?.message?.includes('incorrect')) {
        setPasswordErrors(prev => ({ ...prev, current: 'Current password is incorrect' }));
      } else {
        toast.error(error.response?.data?.message || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle modal close
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords({ current: false, new: false, confirm: false });
    setPasswordStrength({ score: 0, feedback: [], isValid: false });
    setPasswordErrors({ current: '', new: '', confirm: '' });
  };

  // Get password strength info
  const getPasswordStrengthInfo = () => {
    if (passwordStrength.score === 0) return { color: 'bg-gray-200', text: '', textColor: 'text-gray-500', width: '0%' };
    if (passwordStrength.score <= 2) return { color: 'bg-red-500', text: 'Weak', textColor: 'text-red-600', width: '25%' };
    if (passwordStrength.score <= 4) return { color: 'bg-yellow-500', text: 'Fair', textColor: 'text-yellow-600', width: '50%' };
    if (passwordStrength.score <= 5) return { color: 'bg-green-500', text: 'Good', textColor: 'text-green-600', width: '75%' };
    return { color: 'bg-green-600', text: 'Strong', textColor: 'text-green-700', width: '100%' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your personal information and account settings</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Lock className="h-4 w-4" />
            <span>Change Password</span>
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600 dark:text-blue-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-blue-100 dark:text-blue-200 capitalize">{profile.role}</p>
            {profile.role === 'student' && profile.studentId && (
              <p className="text-blue-100 dark:text-blue-200 text-sm">ID: {profile.studentId}</p>
            )}
            {profile.role === 'warden' && profile.wardenId && (
              <p className="text-blue-100 dark:text-blue-200 text-sm">ID: {profile.wardenId}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <p className="text-sm text-gray-600">Your personal details and contact information</p>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              {editing ? (
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  className="input-field"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{profile.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="input-field"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{profile.email}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                  className="input-field"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-digit phone number"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{profile.phone || 'Not provided'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-900 dark:text-white capitalize">{profile.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific Information */}
        <div className="space-y-6">
          {profile.role === 'student' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Student Information</h3>
                <p className="text-sm text-gray-600">Academic details and course information</p>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-900 dark:text-white">{profile.studentId || 'Not assigned'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.course || ''}
                      onChange={(e) => setEditData({...editData, course: e.target.value})}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">{profile.course || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                  {editing ? (
                    <select
                      value={editData.year || ''}
                      onChange={(e) => setEditData({...editData, year: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">{profile.year || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Block</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-900 dark:text-white">{profile.preferredBlock || 'Not selected'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  {editing ? (
                    <textarea
                      value={editData.address || ''}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      rows={3}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-1" />
                      <span className="text-gray-900 dark:text-white">{profile.address || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {profile.role === 'warden' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Warden Information</h3>
                <p className="text-sm text-gray-600">Administrative details and assigned blocks</p>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warden ID</label>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-900 dark:text-white">{profile.wardenId || 'Not assigned'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Blocks</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-900 dark:text-white">
                      {profile.assignedBlocks?.length > 0 
                        ? profile.assignedBlocks.join(', ') 
                        : profile.assignedBlock || 'Not assigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {profile.role === 'student' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Guardian Information</h3>
                <p className="text-sm text-gray-600">Emergency contact and guardian details</p>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.guardianName || ''}
                      onChange={(e) => setEditData({...editData, guardianName: e.target.value})}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">{profile.guardianName || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editData.guardianPhone || ''}
                      onChange={(e) => setEditData({...editData, guardianPhone: e.target.value})}
                      className="input-field"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="10-digit guardian phone"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">{profile.guardianPhone || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg modal-md modal-height-constrained flex flex-col modal-container animate-in">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Current Password Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Current Password</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                    className={`input-field pr-12 ${
                      passwordErrors.current ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Enter your current password"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={passwordLoading}
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                    {passwordErrors.current && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                        <span>{passwordErrors.current}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* New Password Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">New Password</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                    className={`input-field pr-12 ${
                      passwordErrors.new 
                        ? 'border-red-300 bg-red-50' 
                        : passwordData.newPassword && passwordStrength.isValid
                        ? 'border-green-300 bg-green-50'
                        : ''
                    }`}
                    placeholder="Create a strong password"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={passwordLoading}
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {passwordData.newPassword && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Password Strength</span>
                      <span className={`text-xs font-bold ${getPasswordStrengthInfo().textColor}`}>
                        {getPasswordStrengthInfo().text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${getPasswordStrengthInfo().color}`}
                        style={{ width: getPasswordStrengthInfo().width }}
                      ></div>
                    </div>
                    
                    {/* Requirements */}
                    {passwordStrength.feedback.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Password must include:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {passwordStrength.feedback.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                    {passwordErrors.new && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                        <span>{passwordErrors.new}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Confirm Password Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Confirm New Password</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                    className={`input-field pr-16 ${
                      passwordErrors.confirm 
                        ? 'border-red-300 bg-red-50' 
                        : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword
                        ? 'border-green-300 bg-green-50'
                        : ''
                    }`}
                    placeholder="Confirm your new password"
                    disabled={passwordLoading}
                  />
                  
                  {/* Match indicator */}
                  {passwordData.confirmPassword && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      {passwordData.newPassword === passwordData.confirmPassword ? (
                        <UserCheck className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={passwordLoading}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                
                {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && !passwordErrors.confirm && (
                  <p className="text-sm text-green-600 flex items-center space-x-1">
                    <UserCheck className="h-4 w-4" />
                    <span>Passwords match perfectly!</span>
                  </p>
                )}
                
                    {passwordErrors.confirm && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                        <span>{passwordErrors.confirm}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Security Tips Section */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Security Tips</span>
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li className="flex items-start space-x-2">
                    <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Use a unique password you don't use elsewhere</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Mix uppercase, lowercase, numbers, and symbols</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Avoid personal information like names or dates</span>
                  </li>
                  </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handlePasswordModalClose}
                className="btn-secondary"
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                className={`btn-primary flex items-center space-x-2 ${
                  passwordLoading || !passwordStrength.isValid || !passwordData.currentPassword || !passwordData.confirmPassword
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                disabled={passwordLoading || !passwordStrength.isValid || !passwordData.currentPassword || !passwordData.confirmPassword}
              >
                {passwordLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-gray-300 border-t-transparent"></div>
                )}
                <span>{passwordLoading ? 'Changing...' : 'Change Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;