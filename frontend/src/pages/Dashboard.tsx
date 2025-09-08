/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';
import { getRoomStatus } from '../utils/roomUtils';
import { 
  Users, Building, AlertCircle, CreditCard, TrendingUp, 
  IndianRupee, CheckCircle, Clock, UserCheck, Home,
  BarChart3, PieChart, Activity, Calendar, Bell
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

const Dashboard: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({});
  const [chartData, setChartData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === 'warden') {
          const [statsResponse, chartResponse] = await Promise.all([
            dashboardAPI.getWardenStats(),
            dashboardAPI.getChartData()
          ]);
          setStats(statsResponse.data.stats);
          setChartData(chartResponse.data.chartData);
        } else {
          const [statsResponse, chartResponse] = await Promise.all([
            dashboardAPI.getStats(),
            dashboardAPI.getChartData()
          ]);
          setStats(statsResponse.data.stats);
          setChartData(chartResponse.data.chartData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty stats to prevent crashes
        setStats({});
        setChartData({});
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{ 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string;
    trend?: { value: number; isPositive: boolean };
    subtitle?: string;
  }> = ({ title, value, icon, color, trend, subtitle }) => {
    const getColorClasses = (color: string) => {
      const colorMap: { [key: string]: { bg: string; darkBg: string } } = {
        'bg-blue-50': { bg: 'bg-blue-50', darkBg: 'dark:bg-blue-500/10' },
        'bg-green-50': { bg: 'bg-green-50', darkBg: 'dark:bg-green-500/10' },
        'bg-purple-50': { bg: 'bg-purple-50', darkBg: 'dark:bg-purple-500/10' },
        'bg-red-50': { bg: 'bg-red-50', darkBg: 'dark:bg-red-500/10' },
        'bg-orange-50': { bg: 'bg-orange-50', darkBg: 'dark:bg-orange-500/10' },
        'bg-yellow-50': { bg: 'bg-yellow-50', darkBg: 'dark:bg-yellow-500/10' },
      };
      return colorMap[color] || { bg: 'bg-blue-50', darkBg: 'dark:bg-blue-500/10' };
    };
    
    const colorClasses = getColorClasses(color);
    
    return (
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 hover:shadow-lg dark:hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-3 rounded-xl ${colorClasses.bg} ${colorClasses.darkBg} ring-1 ring-gray-200/50 dark:ring-gray-600/30`}>
              {icon}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium px-2 py-1 rounded-full ${
              trend.isPositive 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' 
                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
            }`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${
                trend.isPositive ? '' : 'rotate-180'
              }`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const complaintStatusData = stats.complaintCategories?.map((category, index) => ({
    name: category._id,
    value: category.count,
    color: COLORS[index % COLORS.length]
  })) || [];

  const blockOccupancyData = stats.blockOccupancy?.map(block => ({
    name: `Block ${block.block}`,
    occupied: block.occupiedRooms,
    available: block.availableRooms,
    total: block.totalRooms,
    occupancyRate: block.occupancyRate
  })) || [];

  return (
    <div className="min-h-screen space-y-6 pb-8 bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-xl p-6 text-white shadow-lg dark:shadow-2xl dark:shadow-blue-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-blue-100 dark:text-blue-200">
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium">System Online</span>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <>
          {/* Navigation Tabs */}
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/50 p-1 shadow-sm">
            <div className="flex space-x-1">
              {[
                { id: 'overview', label: 'Overview', icon: Home },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'activities', label: 'Activities', icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeView === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview Tab */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Students"
                  value={stats.totalStudents || 0}
                  icon={<Users className="h-6 w-6 text-blue-600" />}
                  color="bg-blue-50"
                  subtitle="Active registrations"
                />
                <StatCard
                  title="Occupancy Rate"
                  value={`${stats.occupancyRate || 0}%`}
                  icon={<Home className="h-6 w-6 text-green-600" />}
                  color="bg-green-50"
                  subtitle={`${stats.occupiedRooms}/${stats.totalRooms} rooms`}
                />
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(stats.totalRevenue || 0)}
                  icon={<IndianRupee className="h-6 w-6 text-purple-600" />}
                  color="bg-purple-50"
                  subtitle="All time collection"
                />
                <StatCard
                  title="Pending Issues"
                  value={stats.pendingComplaints || 0}
                  icon={<AlertCircle className="h-6 w-6 text-red-600" />}
                  color="bg-red-50"
                  subtitle="Requires attention"
                />
              </div>

              {/* Block Occupancy */}
              <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Block Occupancy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {stats.blockOccupancy?.map((block) => (
                    <div key={block.block} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-600/30">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Block {block.block}</h4>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${block.occupancyRate}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {block.occupiedRooms}/{block.totalRooms} rooms ({Math.round(block.occupancyRate)}%)
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => navigate('/users')}
                    className="group flex flex-col items-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-500/20 dark:hover:to-blue-600/20 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-blue-200/50 dark:border-blue-500/20"
                  >
                    <Users className="h-7 w-7 text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">Add Student</span>
                  </button>
                  <button 
                    onClick={() => navigate('/rooms')}
                    className="group flex flex-col items-center p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-500/10 dark:to-green-600/10 rounded-xl hover:from-green-100 hover:to-green-200 dark:hover:from-green-500/20 dark:hover:to-green-600/20 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-green-200/50 dark:border-green-500/20"
                  >
                    <Building className="h-7 w-7 text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-green-900 dark:text-green-300">Manage Rooms</span>
                  </button>
                  <button 
                    onClick={() => navigate('/fees')}
                    className="group flex flex-col items-center p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-600/10 rounded-xl hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-500/20 dark:hover:to-purple-600/20 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-purple-200/50 dark:border-purple-500/20"
                  >
                    <CreditCard className="h-7 w-7 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">Generate Fees</span>
                  </button>
                  <button 
                    onClick={() => navigate('/announcements')}
                    className="group flex flex-col items-center p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-600/10 rounded-xl hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-orange-200/50 dark:border-orange-500/20"
                  >
                    <Bell className="h-7 w-7 text-orange-600 dark:text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-orange-900 dark:text-orange-300">Send Notice</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {user?.role === 'admin' && (
        <>
          {/* Analytics Tab */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Block Occupancy Chart */}
                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Block Occupancy
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={blockOccupancyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="occupied" fill="#3B82F6" name="Occupied" />
                        <Bar dataKey="available" fill="#10B981" name="Available" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Complaint Categories Chart */}
                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                    Complaint Categories
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={complaintStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        >
                          {complaintStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  System Health
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.maintenanceStats?.map((status) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'good': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
                        case 'needs_repair': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
                        case 'under_maintenance': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
                        default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
                      }
                    };
                    
                    return (
                      <div key={status._id} className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{status.count}</p>
                        <p className={`text-sm px-3 py-1 rounded-full inline-block capitalize ${
                          getStatusColor(status._id)
                        }`}>
                          {status._id.replace('_', ' ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeView === 'activities' && (
            <div className="space-y-6">
              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-green-100 dark:bg-green-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{stats.resolvedComplaints || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Resolved</p>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-yellow-100 dark:bg-yellow-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{stats.inProgressComplaints || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">In Progress</p>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-blue-100 dark:bg-blue-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{stats.approvedLeaves || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Approved Leaves</p>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-orange-100 dark:bg-orange-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{stats.pendingLeaves || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pending Leaves</p>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-red-100 dark:bg-red-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(stats.totalDue || 0)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pending Fees</p>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                    Recent Complaints
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const complaints = stats.recentActivities?.complaints || [];
                      
                      if (complaints.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No recent complaints</p>
                          </div>
                        );
                      }
                      
                      return complaints.slice(0, 5).map((complaint) => (
                        <div key={complaint._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              complaint.status === 'pending' ? 'bg-yellow-500' :
                              complaint.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{complaint.title || 'Complaint'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {complaint.student?.name || 'Student'} • Room {complaint.room?.roomNumber || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            complaint.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                            complaint.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                          }`}>
                            {complaint.status || 'pending'}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Recent Leave Requests
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const leaves = stats.recentActivities?.leaves || [];
                      
                      if (leaves.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No recent leave requests</p>
                          </div>
                        );
                      }
                      
                      return leaves.slice(0, 5).map((leave) => (
                        <div key={leave._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              leave.status === 'pending' ? 'bg-yellow-500' :
                              leave.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{leave.student?.name || 'Student'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {leave.leaveType || 'Leave'} • {leave.startDate ? formatDate(leave.startDate) : 'Recently'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            leave.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                            leave.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                            'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                          }`}>
                            {leave.status || 'pending'}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}


        </>
      )}

      {user?.role === 'warden' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Rooms"
              value={stats.totalRoomsInBlocks || 0}
              icon={<Building className="h-6 w-6 text-blue-600" />}
              color="bg-blue-50"
              subtitle="Total rooms assigned"
            />
            <StatCard
              title="My Students"
              value={stats.studentsInBlocks || 0}
              icon={<Users className="h-6 w-6 text-green-600" />}
              color="bg-green-50"
              subtitle="Students in my blocks"
            />
            <StatCard
              title="Pending Issues"
              value={stats.pendingComplaints || 0}
              icon={<AlertCircle className="h-6 w-6 text-red-600" />}
              color="bg-red-50"
              subtitle="Requires attention"
            />
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate || 0}%`}
              icon={<Home className="h-6 w-6 text-purple-600" />}
              color="bg-purple-50"
              subtitle={`${stats.occupiedRoomsInBlocks || 0}/${stats.totalRoomsInBlocks || 0} rooms`}
            />
          </div>

          {/* My Blocks */}
          {stats.assignedBlocks && stats.assignedBlocks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Blocks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stats.assignedBlocks.map((blockName) => {
                  const occupancyRate = stats.occupancyRate || 0;
                  const totalRooms = Math.floor((stats.totalRoomsInBlocks || 0) / (stats.assignedBlocks?.length || 1));
                  const occupiedRooms = Math.floor((stats.occupiedRoomsInBlocks || 0) / (stats.assignedBlocks?.length || 1));
                  const availableRooms = totalRooms - occupiedRooms;
                  
                  return (
                    <div key={blockName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Block {blockName}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          occupancyRate > 90 ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                          occupancyRate > 70 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        }`}>
                          {Math.round(occupancyRate)}% Full
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Rooms:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{occupiedRooms}/{totalRooms}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              occupancyRate > 90 ? 'bg-red-500' :
                              occupancyRate > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Students:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{Math.floor((stats.studentsInBlocks || 0) / (stats.assignedBlocks?.length || 1))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.resolvedComplaints || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{(stats.totalComplaints || 0) - (stats.resolvedComplaints || 0) || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <UserCheck className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.approvedLeaves || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved Leaves</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <Calendar className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pendingLeaves || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Leaves</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <Building className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.availableRoomsInBlocks || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Rooms</p>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Complaints</h3>
              <div className="space-y-3">
                {(() => {
                  const complaints = stats.recentComplaints || stats.recentActivities?.complaints || [];
                  
                  if (complaints.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent complaints</p>
                      </div>
                    );
                  }
                  
                  return complaints.slice(0, 5).map((complaint) => (
                    <div key={complaint._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          complaint.status === 'pending' ? 'bg-yellow-500' :
                          complaint.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{complaint.title || 'Complaint'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {complaint.student?.name || 'Student'} • Room {complaint.room?.roomNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        complaint.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                        complaint.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                        'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                      }`}>
                        {complaint.status || 'pending'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Leave Requests</h3>
              <div className="space-y-3">
                {(() => {
                  const leaves = stats.recentLeaves || stats.recentActivities?.leaves || [];
                  
                  if (leaves.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent leave requests</p>
                      </div>
                    );
                  }
                  
                  return leaves.slice(0, 5).map((leave) => (
                    <div key={leave._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          leave.status === 'pending' ? 'bg-yellow-500' :
                          leave.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{leave.student?.name || 'Student'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {leave.leaveType || 'Leave'} • {leave.startDate ? formatDate(leave.startDate) : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        leave.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                        leave.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                        'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      }`}>
                        {leave.status || 'pending'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/users')}
                className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">View Students</span>
              </button>
              <button 
                onClick={() => navigate('/rooms')}
                className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Building className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                <span className="text-sm font-medium text-green-900 dark:text-green-300">Manage Rooms</span>
              </button>
              <button 
                onClick={() => navigate('/complaints')}
                className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">View Complaints</span>
              </button>
              <button 
                onClick={() => navigate('/announcements')}
                className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Send Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Fees"
              value={stats.pendingFees || 0}
              icon={<CreditCard className="h-6 w-6 text-red-600" />}
              color="bg-red-50"
              subtitle="Pending payments"
            />
            <StatCard
              title="My Complaints"
              value={stats.myComplaints || 0}
              icon={<AlertCircle className="h-6 w-6 text-orange-600" />}
              color="bg-orange-50"
              subtitle="Total complaints"
            />
            <StatCard
              title="Pending Issues"
              value={stats.pendingComplaints || 0}
              icon={<Clock className="h-6 w-6 text-yellow-600" />}
              color="bg-yellow-50"
              subtitle="Awaiting resolution"
            />
            <StatCard
              title="Room Status"
              value={stats.roomInfo ? 'Allocated' : 'Not Allocated'}
              icon={<Home className="h-6 w-6 text-green-600" />}
              color="bg-green-50"
              subtitle={stats.roomInfo ? `Room ${stats.roomInfo.roomNumber}` : 'Contact admin'}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Home className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Room Information
              </h3>
              {stats.roomInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Room Number:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.roomInfo.roomNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Block:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.roomInfo.block}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Floor:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.roomInfo.floor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-semibold capitalize text-gray-900 dark:text-white">{stats.roomInfo.roomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Rent:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(stats.roomInfo.monthlyRent)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Amenities:</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.roomInfo.amenities?.map((amenity, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No room allocated</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Contact admin for room allocation</p>
                </div>
              )}
            </div>
            
            {/* Warden Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Warden Information
              </h3>
              {stats.wardenInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.wardenInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.wardenInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.wardenInfo.phone}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => window.open(`mailto:${stats.wardenInfo?.email}`, '_blank')}
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Contact Warden
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No warden assigned</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Warden will be assigned soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.max((stats.myComplaints || 0) - (stats.pendingComplaints || 0), 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Resolved Issues</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pendingComplaints || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Issues</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <CreditCard className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pendingFees || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Fees</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 text-center">
              <Bell className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Announcements</p>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Recent Complaints</h3>
              <div className="space-y-3">
                {(() => {
                  const complaints = stats.recentActivities?.complaints || [];
                  const myComplaints = complaints.filter(complaint => {
                    // Check if this complaint belongs to the current user
                    return complaint.student?._id === user?._id || 
                           complaint.student?.name === user?.name ||
                           (complaint.student && user && complaint.student._id?.toString() === user._id?.toString());
                  }).slice(0, 5);
                  
                  if (myComplaints.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent complaints</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All issues resolved</p>
                      </div>
                    );
                  }
                  
                  return myComplaints.map((complaint) => (
                    <div key={complaint._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          complaint.status === 'pending' ? 'bg-yellow-500' :
                          complaint.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{complaint.title || 'Complaint'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Room {complaint.room?.roomNumber || 'N/A'} • {complaint.createdAt ? formatDate(complaint.createdAt) : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        complaint.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                        complaint.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                        'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                      }`}>
                        {complaint.status || 'pending'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Leave Requests</h3>
              <div className="space-y-3">
                {(() => {
                  const leaves = stats.recentActivities?.leaves || [];
                  const myLeaves = leaves.filter(leave => {
                    // Check if this leave belongs to the current user
                    return leave.student?._id === user?._id || 
                           leave.student?.name === user?.name ||
                           (leave.student && user && leave.student._id?.toString() === user._id?.toString());
                  }).slice(0, 5);
                  
                  if (myLeaves.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent leave requests</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No pending requests</p>
                      </div>
                    );
                  }
                  
                  return myLeaves.map((leave) => (
                    <div key={leave._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          leave.status === 'pending' ? 'bg-yellow-500' :
                          leave.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{leave.leaveType || 'Leave Request'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {leave.startDate ? formatDate(leave.startDate) : 'Start'} - {leave.endDate ? formatDate(leave.endDate) : 'End'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        leave.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                        leave.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                        'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      }`}>
                        {leave.status || 'pending'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/complaints')}
                className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">File Complaint</span>
              </button>
              <button 
                onClick={() => navigate('/leaves')}
                className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                <span className="text-sm font-medium text-green-900 dark:text-green-300">Apply Leave</span>
              </button>
              <button 
                onClick={() => navigate('/fees')}
                className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Pay Fees</span>
              </button>
              <button 
                onClick={() => navigate('/announcements')}
                className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">View Notices</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Dashboard;