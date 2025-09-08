import React from 'react';
import { ArrowLeft, Users, Camera, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Demo: React.FC = () => {
  const demoFeatures = [
    {
      title: "Student Dashboard",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
      description: "Students can view their room details, submit complaints, and track fees"
    },
    {
      title: "Room Management", 
      image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop",
      description: "Wardens can manage room assignments and view detailed room information"
    },
    {
      title: "Photo Gallery",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop", 
      description: "Upload and manage photos for rooms and user profiles"
    },
    {
      title: "Analytics Dashboard",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
      description: "Comprehensive analytics and reporting for administrators"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-purple-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            See HostelWork in Action
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            Explore our comprehensive hostel management system with interactive demos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors">
              Watch Video Demo
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors">
              Try Interactive Demo
            </button>
          </div>
        </div>
      </section>

      {/* Demo Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Key Features Demo
            </h2>
            <p className="text-xl text-gray-600">
              Experience the power of modern hostel management
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {demoFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                      View Demo
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Stats */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Trusted by Hostels Worldwide
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Users className="w-12 h-12 mb-4" />
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-primary-200">Active Students</div>
            </div>
            <div className="flex flex-col items-center">
              <Camera className="w-12 h-12 mb-4" />
              <div className="text-3xl font-bold mb-2">1000+</div>
              <div className="text-primary-200">Photos Uploaded</div>
            </div>
            <div className="flex flex-col items-center">
              <Shield className="w-12 h-12 mb-4" />
              <div className="text-3xl font-bold mb-2">99.9%</div>
              <div className="text-primary-200">Uptime</div>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-12 h-12 mb-4" />
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-primary-200">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of hostels already using HostelWork
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
              Start Free Trial
            </Link>
            <Link to="/contact" className="border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white font-semibold py-3 px-8 rounded-lg transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Demo;