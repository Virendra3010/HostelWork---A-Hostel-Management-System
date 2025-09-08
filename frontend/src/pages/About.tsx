import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, MapPin, Users, Shield, Clock, Wifi, Edit, Save, X } from 'lucide-react';
import { hostelInfoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const About: React.FC = () => {
  const { user } = useAuth();
  const [hostelInfo, setHostelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchHostelInfo();
  }, []);

  const fetchHostelInfo = async () => {
    try {
      const response = await hostelInfoAPI.getHostelInfo();
      setHostelInfo(response.data.data);
      setEditData(response.data.data);
    } catch (error) {
      console.error('Error fetching hostel info:', error);
      toast.error('Failed to load hostel information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await hostelInfoAPI.updateHostelInfo(editData);
      setHostelInfo(editData);
      setEditing(false);
      toast.success('Hostel information updated successfully');
    } catch (error) {
      console.error('Error updating hostel info:', error);
      toast.error('Failed to update hostel information');
    }
  };

  const handleCancel = () => {
    setEditData(hostelInfo);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (!hostelInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load hostel information</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Edit Controls */}
      {user?.role === 'admin' && (
        <div className="flex justify-end">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Info</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center items-center mb-4">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {editing ? (
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData({...editData, name: e.target.value})}
              className="text-center bg-transparent border-b-2 border-primary-300 dark:border-primary-600 focus:border-primary-600 dark:focus:border-primary-400 outline-none text-gray-900 dark:text-white"
            />
          ) : (
            hostelInfo.name
          )}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {editing ? (
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({...editData, description: e.target.value})}
              className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:border-primary-600 dark:focus:border-primary-400 outline-none resize-none text-gray-900 dark:text-white"
              rows={2}
            />
          ) : (
            hostelInfo.description
          )}
        </p>
      </div>

      {/* Hostel Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Hostel Information</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Building2 className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{hostelInfo.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{hostelInfo.description}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Address</h3>
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Street"
                      value={editData.address?.street || ''}
                      onChange={(e) => setEditData({...editData, address: {...editData.address, street: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Area"
                      value={editData.address?.area || ''}
                      onChange={(e) => setEditData({...editData, address: {...editData.address, area: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {hostelInfo.address?.street}<br />
                    {hostelInfo.address?.area}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Capacity</h3>
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Total Students"
                      value={editData.capacity?.totalStudents || ''}
                      onChange={(e) => setEditData({...editData, capacity: {...editData.capacity, totalStudents: parseInt(e.target.value)}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{hostelInfo.capacity?.totalStudents}+ students across {hostelInfo.capacity?.totalBlocks} blocks ({hostelInfo.capacity?.blockNames?.join(', ')})</p>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Established</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">2020 - Modern facilities with latest amenities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Phone Numbers</h3>
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Main Phone"
                      value={editData.contact?.mainPhone || ''}
                      onChange={(e) => setEditData({...editData, contact: {...editData.contact, mainPhone: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Emergency Phone"
                      value={editData.contact?.emergencyPhone || ''}
                      onChange={(e) => setEditData({...editData, contact: {...editData.contact, emergencyPhone: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Main Office: {hostelInfo.contact?.mainPhone}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Emergency: {hostelInfo.contact?.emergencyPhone}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Email</h3>
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Main Email"
                      value={editData.contact?.email || ''}
                      onChange={(e) => setEditData({...editData, contact: {...editData.contact, email: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={editData.contact?.adminEmail || ''}
                      onChange={(e) => setEditData({...editData, contact: {...editData.contact, adminEmail: e.target.value}})}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{hostelInfo.contact?.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{hostelInfo.contact?.adminEmail}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Security</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">24/7 security with CCTV surveillance</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Biometric access control</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Office Hours</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Saturday: 9:00 AM - 2:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Facilities & Amenities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">High-Speed WiFi</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">24/7 high-speed internet connectivity in all rooms and common areas</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Modern Rooms</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Single, double, triple, and quad occupancy rooms with attached bathrooms</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">24/7 Security</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Round-the-clock security with CCTV monitoring and access control</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Common Areas</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Study halls, recreation rooms, and common kitchens for student use</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">24/7 Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Round-the-clock maintenance and support services</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Prime Location</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Located near educational institutions with easy transportation access</p>
          </div>
        </div>
      </div>

      {/* Admin Information */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg border border-primary-200 dark:border-primary-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Administration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Hostel Administrator</h3>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={editData.administration?.adminName || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, adminName: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={editData.administration?.adminEmail || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, adminEmail: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Admin Phone"
                  value={editData.administration?.adminPhone || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, adminPhone: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{hostelInfo.administration?.adminName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Email: {hostelInfo.administration?.adminEmail}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Phone: {hostelInfo.administration?.adminPhone}</p>
              </>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Assistant Administrator</h3>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Assistant Name"
                  value={editData.administration?.assistantName || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, assistantName: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="email"
                  placeholder="Assistant Email"
                  value={editData.administration?.assistantEmail || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, assistantEmail: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Assistant Phone"
                  value={editData.administration?.assistantPhone || ''}
                  onChange={(e) => setEditData({...editData, administration: {...editData.administration, assistantPhone: e.target.value}})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{hostelInfo.administration?.assistantName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Email: {hostelInfo.administration?.assistantEmail}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Phone: {hostelInfo.administration?.assistantPhone}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Important Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">General Rules</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li>• Maintain cleanliness in rooms and common areas</li>
              <li>• Respect quiet hours (10 PM - 6 AM)</li>
              <li>• No smoking or alcohol consumption</li>
              <li>• Visitors allowed only during designated hours</li>
              <li>• Report maintenance issues promptly</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Safety Guidelines</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li>• Always carry your ID card</li>
              <li>• Do not share room keys or access cards</li>
              <li>• Report suspicious activities immediately</li>
              <li>• Follow fire safety protocols</li>
              <li>• Keep emergency contact numbers handy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;