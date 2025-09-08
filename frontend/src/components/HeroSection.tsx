import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
// import { Link } from 'react-router-dom';
import Logo from './Logo';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-full text-sm font-medium border border-white/20 shadow-lg">
                🎉 New: Advanced Analytics Dashboard
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Modern Hostel
                <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 dark:from-yellow-300 dark:to-orange-300 bg-clip-text text-transparent">
                  Management
                </span>
                Made Simple
              </h1>
              <p className="text-xl text-gray-200 dark:text-gray-300 leading-relaxed max-w-2xl">
                Streamline your hostel operations with our comprehensive management system. 
                Handle admissions, room assignments, fees, complaints, and more with ease.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => {
                  const event = new CustomEvent('openLoginModal');
                  window.dispatchEvent(event);
                }}
                className="group bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-gray-900 font-semibold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center hover:shadow-2xl hover:scale-105 shadow-lg"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group border-2 border-white/40 hover:border-white/60 text-white hover:bg-white/20 font-semibold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center backdrop-blur-md shadow-lg hover:shadow-xl">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-8 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm text-gray-300 dark:text-gray-400">Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">50+</div>
                <div className="text-sm text-gray-300 dark:text-gray-400">Hostels</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">99.9%</div>
                <div className="text-sm text-gray-300 dark:text-gray-400">Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-transform duration-300">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Logo size="sm" showText={false} />
                  <span className="font-semibold text-gray-900 dark:text-white">HostelWork Dashboard</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">247</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">23</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Available Rooms</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹45K</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pending Fees</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">12</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">New Complaints</div>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <div className="w-6 h-6 bg-primary-600 dark:bg-primary-400 rounded-sm"></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Analytics Chart</p>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;