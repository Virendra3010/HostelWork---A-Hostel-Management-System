/* eslint-disable @typescript-eslint/no-unused-vars */
// Utility functions for room status and display

export interface RoomStatusInfo {
  status: 'Available' | 'Partially Available' | 'Occupied';
  colorClass: string;
  bgClass: string;
}

export const getRoomStatus = (occupants: any[], capacity: number): RoomStatusInfo => {
  const occupantCount = occupants?.length || 0;
  
  if (occupantCount === 0) {
    return {
      status: 'Available',
      colorClass: 'text-green-800',
      bgClass: 'bg-green-100'
    };
  } else if (occupantCount < capacity) {
    return {
      status: 'Partially Available',
      colorClass: 'text-yellow-800',
      bgClass: 'bg-yellow-100'
    };
  } else {
    return {
      status: 'Occupied',
      colorClass: 'text-red-800',
      bgClass: 'bg-red-100'
    };
  }
};

export const getRoomStatusBadge = (occupants: any[], capacity: number): string => {
  const { status, colorClass, bgClass } = getRoomStatus(occupants, capacity);
  return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bgClass} ${colorClass}`;
};