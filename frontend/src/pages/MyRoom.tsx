import React, { useState, useEffect } from 'react';
import { roomAPI } from '../services/api';
import { Room } from '../types';
import { Building, Users, Wifi, Car, Bath, Table } from 'lucide-react';
import toast from 'react-hot-toast';

const MyRoom: React.FC = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRoom();
  }, []);

  const fetchMyRoom = async () => {
    try {
      const response = await roomAPI.getMyRoom();
      setRoom(response.data.room);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch room information');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4" />;
      case 'attached bathroom':
        return <Bath className="h-4 w-4" />;
      case 'study table':
        return <Table className="h-4 w-4" />;
      case 'balcony':
        return <Car className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <Building className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Room Allocated</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You haven't been allocated a room yet. Please contact the administration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Room</h1>
        <p className="text-gray-600 dark:text-gray-400">Your current room allocation and details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Details */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-primary-100 dark:bg-primary-600 rounded-full">
              <Building className="h-6 w-6 text-primary-600 dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Room {room.roomNumber}</h2>
              <p className="text-gray-600 dark:text-gray-400">Block {room.block} • Floor {room.floor}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Type</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{room.roomType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{room.capacity} persons</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">₹{room.monthlyRent}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  room.maintenanceStatus === 'good' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                  room.maintenanceStatus === 'needs_repair' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {room.maintenanceStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    <span className="text-gray-600 dark:text-gray-300">{getAmenityIcon(amenity)}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Roommates */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-600 rounded-full">
              <Users className="h-6 w-6 text-blue-600 dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roommates</h2>
              <p className="text-gray-600 dark:text-gray-400">{room.occupants.length} of {room.capacity} occupied</p>
            </div>
          </div>

          <div className="space-y-4">
            {room.occupants.map((occupant, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 dark:text-white font-medium">
                    {occupant.student.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{occupant.student.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{occupant.student.email}</p>
                  {occupant.student.studentId && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">ID: {occupant.student.studentId}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Joined</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(occupant.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}

            {room.occupants.length < room.capacity && (
              <div className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {room.capacity - room.occupants.length} spot(s) available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Rules */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Room Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Do's</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Keep the room clean and tidy</li>
              <li>• Respect your roommates' privacy</li>
              <li>• Report maintenance issues promptly</li>
              <li>• Follow hostel timings</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Don'ts</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• No smoking in the room</li>
              <li>• No loud music after 10 PM</li>
              <li>• No unauthorized guests overnight</li>
              <li>• Don't damage hostel property</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRoom;