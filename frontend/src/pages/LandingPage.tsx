/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { ArrowRight, Shield, Users, Clock, Star, CheckCircle, Phone, Mail, MapPin, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import FeatureShowcase from '../components/FeatureShowcase';
import Logo from '../components/Logo';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ThemeToggle';

const LandingPage: React.FC = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({ isOpen: false, mode: 'login' });
  const [adminExists, setAdminExists] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();

  // Check if admin exists on component mount and after modal closes
  const checkAdminExists = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/check-admin');
      const data = await response.json();
      if (data.success) {
        setAdminExists(data.adminExists);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  React.useEffect(() => {
    checkAdminExists();
  }, []);

  // Handle URL parameter changes for login modal
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    
    if (urlParams.get('login') === 'true') {
      console.log('Opening login modal from logout redirect');
      setAuthModal({ isOpen: true, mode: 'login' });
      // Clean up URL after modal opens
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 200);
    }
  }, [location.search]);
  
  // Scroll spy for active section
  React.useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'gallery', 'stats', 'contact'];
      const scrollPosition = window.scrollY + 100;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // If near bottom of page, highlight contact
      if (scrollPosition + windowHeight >= documentHeight - 50) {
        setActiveSection('contact');
        return;
      }
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Recheck admin status when modal closes
  const handleModalClose = () => {
    setAuthModal({ ...authModal, isOpen: false });
    checkAdminExists();
  };

  // Listen for custom events from HeroSection
  React.useEffect(() => {
    const handleOpenLogin = () => {
      setAuthModal({ isOpen: true, mode: 'login' });
    };
    window.addEventListener('openLoginModal', handleOpenLogin);
    return () => window.removeEventListener('openLoginModal', handleOpenLogin);
  }, []);
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-50 transition-all duration-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="#home" className="hover:scale-105 transition-transform duration-200">
                <Logo size="lg" />
              </a>
            </div>
            <nav className="hidden md:flex items-center space-x-1">
              <a href="#home" className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeSection === 'home'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}>
                Home
              </a>
              <a href="#features" className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeSection === 'features'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}>
                Features
              </a>
              <a href="#gallery" className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeSection === 'gallery'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}>
                Gallery
              </a>
              <a href="#stats" className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeSection === 'stats'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}>
                About
              </a>
              <a href="#contact" className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeSection === 'contact'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}>
                Contact
              </a>
            </nav>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <button 
                onClick={() => setAuthModal({ isOpen: true, mode: 'login' })}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 font-medium rounded-lg transition-all duration-200"
              >
                Login
              </button>
              {!adminExists && (
                <button 
                  onClick={() => setAuthModal({ isOpen: true, mode: 'register' })}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Admin Signup
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div id="home" className="pt-16">
        <HeroSection />
      </div>

      {/* Features Section */}
      <div id="features">
        <FeatureShowcase />
      </div>

      {/* Hostel Gallery */}
      <section id="gallery" className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Modern Hostel Facilities
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 transition-colors duration-300">
              Comfortable living spaces designed for student success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop",
                title: "Modern Rooms",
                description: "Spacious rooms with study areas",
                features: ["Study Desk", "Wi-Fi", "Storage"]
              },
              {
                image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
                title: "Common Areas",
                description: "Comfortable spaces for relaxation",
                features: ["TV Lounge", "Reading Area", "Games"]
              },
              {
                image: "https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=400&h=300&fit=crop",
                title: "Study Halls",
                description: "Quiet spaces for focused learning",
                features: ["Silent Zone", "AC", "24/7 Access"]
              },
              {
                image: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop",
                title: "Dining Area",
                description: "Nutritious meals in clean environment",
                features: ["Healthy Food", "Hygiene", "Variety"]
              },
              {
                image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop",
                title: "Recreation Room",
                description: "Games and entertainment facilities",
                features: ["Indoor Games", "Music", "Events"]
              },
              {
                image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
                title: "Security",
                description: "24/7 security and safety measures",
                features: ["CCTV", "Guards", "Safe Entry"]
              }
            ].map((item, index) => (
              <div key={index} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-200 mb-2">{item.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.features.map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md text-xs font-medium">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-slate-900 transition-colors duration-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join the growing community of satisfied users worldwide
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { number: "500+", label: "Happy Students", icon: "👥", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
              { number: "50+", label: "Hostels Managed", icon: "🏢", bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400" },
              { number: "99.9%", label: "System Uptime", icon: "⚡", bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400" },
              { number: "24/7", label: "Live Support", icon: "🛟", bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" }
            ].map((stat, index) => (
              <div key={index} className="group text-center">
                <div className={`${stat.bg} rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-white/50 dark:border-gray-600 backdrop-blur-sm`}>
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                  <div className={`text-3xl font-bold mb-2 ${stat.text}`}>{stat.number}</div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6 border border-blue-200 dark:border-blue-700">
              🚀 Ready to Transform Your Hostel?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              Start Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Digital Journey
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of hostels worldwide who trust HostelWork to streamline operations and enhance student experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                onClick={() => {
                  const event = new CustomEvent('openLoginModal');
                  window.dispatchEvent(event);
                }}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform inline" />
              </button>
              <button className="group border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold py-3 px-8 rounded-xl transition-all duration-300">
                <Play className="mr-2 w-4 h-4 inline" />
                Watch Demo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { icon: "✅", text: "No credit card required" },
                { icon: "🎯", text: "Free 30-day trial" },
                { icon: "🔄", text: "Cancel anytime" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-center space-x-3 text-gray-600 dark:text-gray-400">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white">
        <div id="contact" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="mb-6">
                <Logo size="lg" />
              </div>
              <p className="text-gray-300 text-lg mb-8 max-w-md">
                Revolutionizing hostel management with cutting-edge technology and intuitive design.
              </p>
              <div className="flex space-x-6">
                {[
                  { icon: Phone, label: "Call us" },
                  { icon: Mail, label: "Email us" },
                  { icon: MapPin, label: "Visit us" }
                ].map((item, index) => (
                  <div key={index} className="group cursor-pointer">
                    <div className="w-12 h-12 bg-gray-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <item.icon className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Product</h4>
                <ul className="space-y-3">
                  {['Features', 'Pricing', 'Demo', 'Updates'].map((item) => (
                    <li key={item}>
                      <Link to={`/${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors duration-200 hover:translate-x-1 transform inline-block">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Support</h4>
                <ul className="space-y-3">
                  {['Help Center', 'Contact', 'Status', 'Community'].map((item) => (
                    <li key={item}>
                      <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors duration-200 hover:translate-x-1 transform inline-block">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Company</h4>
                <ul className="space-y-3">
                  {['About', 'Careers', 'Privacy', 'Terms'].map((item) => (
                    <li key={item}>
                      <Link to={`/${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors duration-200 hover:translate-x-1 transform inline-block">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 mb-4 md:mb-0">
                &copy; 2024 HostelWork. All rights reserved.
              </p>
              <div className="flex items-center space-x-6">
                <span className="text-gray-400 text-sm">Made with ❤️ for hostels worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={handleModalClose}
        initialMode={authModal.mode}
        onAdminCreated={checkAdminExists}
      />
    </div>
  );
};

export default LandingPage;