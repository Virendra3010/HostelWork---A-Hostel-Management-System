/* eslint-disable @typescript-eslint/no-redeclare */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsAPI } from '../services/api';
import { Settings as SettingsIcon, Save, RotateCcw, Download, Shield, Bell, Clock, Users, Building, DollarSign, Calendar, AlertTriangle, Palette } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

interface Settings {
  _id?: string;
  hostelName: string;
  hostelAddress: string;
  contactEmail: string;
  contactPhone: string;
  feeSettings: {
    monthlyFee: number;
    securityDeposit: number;
    lateFeePercentage: number;
    feeGracePeriodDays: number;
  };
  roomSettings: {
    defaultCapacity: number;
    availableBlocks: string[];
    roomTypes: Array<{
      name: string;
      capacity: number;
      fee: number;
    }>;
  };
  notificationSettings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    notificationRetentionDays: number;
  };
  systemSettings: {
    maintenanceMode: boolean;
    allowSelfRegistration: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
  };
  academicSettings: {
    currentSemester: string;
    semesterStartDate: string;
    semesterEndDate: string;
    vacationPeriods: Array<{
      name: string;
      startDate: string;
      endDate: string;
    }>;
  };
  complaintSettings: {
    autoAssignToWarden: boolean;
    escalationDays: number;
    allowAnonymousComplaints: boolean;
  };
  lastUpdatedBy?: {
    name: string;
    email: string;
  };
  updatedAt?: string;
}

interface SystemStats {
  users?: {
    total: number;
    students: number;
    wardens: number;
    admins: number;
  };
  rooms: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: string;
  };
  blocks?: {
    total: number;
  };
  complaints: {
    total: number;
    pending: number;
    resolved: number;
  };
  leaves: {
    total: number;
    pending: number;
    processed: number;
  };
  notifications: {
    total: number;
    unread: number;
    read: number;
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { confirm, ConfirmComponent } = useConfirm();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
    if (user?.role !== 'student') {
      fetchStats();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await settingsAPI.getSystemStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!settings || user?.role !== 'admin') return;
    
    setSaving(true);
    try {
      await settingsAPI.updateSettings(settings);
      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (user?.role !== 'admin') return;
    
    const confirmed = await confirm({
      title: 'Reset Settings',
      message: 'Are you sure you want to reset all settings to default? This action cannot be undone.',
      confirmText: 'Reset',
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }
    
    setSaving(true);
    try {
      await settingsAPI.resetSettings();
      toast.success('Settings reset to default');
      fetchSettings();
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      const response = await settingsAPI.backupData();
      const blob = new Blob([JSON.stringify(response.data.backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hostel-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;
    
    const keys = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load settings</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon, roles: ['admin', 'warden', 'student'] },
    { id: 'appearance', name: 'Appearance', icon: Palette, roles: ['admin', 'warden', 'student'] },
    { id: 'fees', name: 'Fees', icon: DollarSign, roles: ['admin', 'warden', 'student'] },
    { id: 'rooms', name: 'Rooms', icon: Building, roles: ['admin', 'warden', 'student'] },
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: ['admin', 'warden'] },
    { id: 'system', name: 'System', icon: Shield, roles: ['admin', 'warden'] },
    { id: 'academic', name: 'Academic', icon: Calendar, roles: ['admin', 'warden', 'student'] },
    { id: 'complaints', name: 'Complaints', icon: AlertTriangle, roles: ['admin', 'warden', 'student'] },
    { id: 'stats', name: 'Statistics', icon: Users, roles: ['admin', 'warden'] },
  ].filter(tab => tab.roles.includes(user?.role || ''));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user?.role === 'admin' ? 'Manage system configuration and preferences' :
             user?.role === 'warden' ? 'View system configuration and preferences' :
             'View hostel information, fees, and policies'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackup}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Backup</span>
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Student Info Card */}
      {user?.role === 'student' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Student Settings Information</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Here you can view important hostel information including fees, academic calendar, available blocks, and complaint policies. 
                All information is read-only for your reference.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">General Information</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Basic hostel information and contact details</p>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hostel Name
                  </label>
                  <input
                    type="text"
                    value={settings.hostelName}
                    onChange={(e) => updateSettings('hostelName', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => updateSettings('contactEmail', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.contactPhone}
                    onChange={(e) => updateSettings('contactPhone', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={settings.hostelAddress}
                  onChange={(e) => updateSettings('hostelAddress', e.target.value)}
                  disabled={user?.role !== 'admin'}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === 'appearance' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Appearance Preferences</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Customize the visual appearance of the application</p>
            </div>
            <div className="card-body space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Theme Settings</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Theme</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose your preferred color theme for the interface</p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Settings */}
        {activeTab === 'fees' && (user?.role === 'admin' || user?.role === 'warden' || user?.role === 'student') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Fee Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Manage fee structure and payment settings' : 
                 user?.role === 'student' ? 'View current fee structure and payment information' : 
                 'View fee structure and payment settings (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.feeSettings.monthlyFee}
                    onChange={(e) => updateSettings('feeSettings.monthlyFee', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.feeSettings.securityDeposit}
                    onChange={(e) => updateSettings('feeSettings.securityDeposit', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Late Fee Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={settings.feeSettings.lateFeePercentage}
                    onChange={(e) => updateSettings('feeSettings.lateFeePercentage', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.feeSettings.feeGracePeriodDays}
                    onChange={(e) => updateSettings('feeSettings.feeGracePeriodDays', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Room Settings */}
        {activeTab === 'rooms' && (user?.role === 'admin' || user?.role === 'warden' || user?.role === 'student') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Room Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Manage room types and availability' : 
                 user?.role === 'student' ? 'View available blocks and room information' : 
                 'View room types and availability (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              {user?.role !== 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Room Capacity
                  </label>
                  <select
                    value={settings.roomSettings.defaultCapacity}
                    onChange={(e) => updateSettings('roomSettings.defaultCapacity', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  >
                    <option value={1}>Single (1 person)</option>
                    <option value={2}>Double (2 persons)</option>
                    <option value={3}>Triple (3 persons)</option>
                    <option value={4}>Quad (4 persons)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Available Blocks
                </label>
                <input
                  type="text"
                  value={settings.roomSettings.availableBlocks.join(', ')}
                  onChange={(e) => updateSettings('roomSettings.availableBlocks', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="A, B, C, D"
                  disabled={user?.role !== 'admin'}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {user?.role === 'student' ? 'These are the available hostel blocks' : 'Separate blocks with commas'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (user?.role === 'admin' || user?.role === 'warden') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Notification Preferences</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Configure notification delivery and retention' : 'View notification delivery and retention settings (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.emailNotifications}
                    onChange={(e) => updateSettings('notificationSettings.emailNotifications', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SMS Notifications</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.smsNotifications}
                    onChange={(e) => updateSettings('notificationSettings.smsNotifications', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send browser push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.pushNotifications}
                    onChange={(e) => updateSettings('notificationSettings.pushNotifications', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notification Retention (Days)
                </label>
                <input
                  type="number"
                  value={settings.notificationSettings.notificationRetentionDays}
                  onChange={(e) => updateSettings('notificationSettings.notificationRetentionDays', parseInt(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">How long to keep notifications before auto-deletion</p>
              </div>
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (user?.role === 'admin' || user?.role === 'warden') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">System Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Security and system behavior settings' : 'View security and system behavior settings (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Mode</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Temporarily disable system access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.systemSettings.maintenanceMode}
                    onChange={(e) => updateSettings('systemSettings.maintenanceMode', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Self Registration</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Let users register themselves</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.systemSettings.allowSelfRegistration}
                    onChange={(e) => updateSettings('systemSettings.allowSelfRegistration', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.systemSettings.sessionTimeoutMinutes}
                    onChange={(e) => updateSettings('systemSettings.sessionTimeoutMinutes', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.systemSettings.maxLoginAttempts}
                    onChange={(e) => updateSettings('systemSettings.maxLoginAttempts', parseInt(e.target.value))}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Academic Settings */}
        {activeTab === 'academic' && ['admin', 'warden', 'student'].includes(user?.role || '') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Academic Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Semester and academic calendar settings' : 
                 user?.role === 'student' ? 'View current semester and academic calendar information' : 
                 'Semester and academic calendar settings (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Semester
                  </label>
                  <input
                    type="text"
                    value={settings.academicSettings.currentSemester}
                    onChange={(e) => updateSettings('academicSettings.currentSemester', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semester Start Date
                  </label>
                  <input
                    type="date"
                    value={settings.academicSettings.semesterStartDate?.split('T')[0] || ''}
                    onChange={(e) => updateSettings('academicSettings.semesterStartDate', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semester End Date
                  </label>
                  <input
                    type="date"
                    value={settings.academicSettings.semesterEndDate?.split('T')[0] || ''}
                    onChange={(e) => updateSettings('academicSettings.semesterEndDate', e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complaint Settings */}
        {activeTab === 'complaints' && ['admin', 'warden', 'student'].includes(user?.role || '') && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium dark:text-white">Complaint Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.role === 'admin' ? 'Configure complaint handling and escalation' : 
                 user?.role === 'student' ? 'View complaint policies and escalation procedures' : 
                 'Configure complaint handling and escalation (read-only)'}
              </p>
            </div>
            <div className="card-body space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-assign to Warden</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically assign complaints to block wardens</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.complaintSettings.autoAssignToWarden}
                    onChange={(e) => updateSettings('complaintSettings.autoAssignToWarden', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Anonymous Complaints</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Allow students to file complaints anonymously</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.complaintSettings.allowAnonymousComplaints}
                    onChange={(e) => updateSettings('complaintSettings.allowAnonymousComplaints', e.target.checked)}
                    disabled={user?.role !== 'admin'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Escalation Period (Days)
                </label>
                <input
                  type="number"
                  value={settings.complaintSettings.escalationDays}
                  onChange={(e) => updateSettings('complaintSettings.escalationDays', parseInt(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Days before unresolved complaints are escalated</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && ['admin', 'warden'].includes(user?.role || '') && stats && (
          <div className="space-y-6">
            {/* User Statistics */}
            {stats.users && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium dark:text-white">User Statistics</h3>
                </div>
                <div className="card-body">
                  {user?.role === 'admin' ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.users.total}</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">Total Users</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.users.students}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Students</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.users.wardens}</div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">Wardens</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.users.admins}</div>
                        <div className="text-sm text-orange-600 dark:text-orange-400">Admins</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.users.students}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Students in My Blocks</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Room Statistics */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium dark:text-white">Room Statistics</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.rooms.total}</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Rooms</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rooms.occupied}</div>
                    <div className="text-sm text-red-600 dark:text-red-400">Occupied</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.rooms.available}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">Available</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.rooms.occupancyRate}%</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">Occupancy Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium dark:text-white">Complaints</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total</span>
                      <span className="font-medium dark:text-white">{stats.complaints.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Pending</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.complaints.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Resolved</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{stats.complaints.resolved}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium dark:text-white">Leave Requests</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total</span>
                      <span className="font-medium dark:text-white">{stats.leaves.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Pending</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.leaves.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Processed</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{stats.leaves.processed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Updated Info */}
      {settings.lastUpdatedBy && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Last updated by <span className="font-medium dark:text-white">{settings.lastUpdatedBy.name}</span> on{' '}
            {new Date(settings.updatedAt || '').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
      
      <ConfirmComponent />
    </div>
  );
};

export default Settings;