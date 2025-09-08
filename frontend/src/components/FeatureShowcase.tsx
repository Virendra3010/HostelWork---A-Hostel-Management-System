import React from 'react';
import { Users, Shield, Clock, Star, CheckCircle, MapPin, BarChart3, Bell } from 'lucide-react';

const FeatureShowcase: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: "Student Management",
      description: "Complete student profiles, room assignments, and academic tracking in one place",
      color: "blue"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Bank-grade security with role-based access control and data encryption",
      color: "green"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Instant notifications for payments, complaints, and important announcements",
      color: "purple"
    },
    {
      icon: Star,
      title: "Easy to Use",
      description: "Intuitive interface designed for wardens, students, and administrators",
      color: "yellow"
    },
    {
      icon: CheckCircle,
      title: "Fee Management",
      description: "Automated fee calculation, payment tracking, and receipt generation",
      color: "indigo"
    },
    {
      icon: MapPin,
      title: "Room Allocation",
      description: "Smart room assignment with preferences and availability tracking",
      color: "red"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive insights and reports for better decision making",
      color: "teal"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Automated alerts for important events and deadline reminders",
      color: "orange"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; hover: string } } = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50 dark:hover:bg-gray-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-50 dark:hover:bg-gray-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50 dark:hover:bg-gray-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', hover: 'hover:bg-yellow-50 dark:hover:bg-gray-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:bg-indigo-50 dark:hover:bg-gray-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50 dark:hover:bg-gray-600' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'hover:bg-teal-50 dark:hover:bg-gray-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:bg-orange-50 dark:hover:bg-gray-600' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-4 transition-colors duration-300">
            ✨ Powerful Features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
            Everything You Need to Manage Your Hostel
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
            From student admissions to fee collection, our platform handles all aspects of hostel management with modern tools and intuitive design.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const colors = getColorClasses(feature.color);
            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-2 group border border-gray-100 dark:border-gray-600 ${colors.hover}`}
              >
                <div className={`w-12 h-12 ${colors.bg} dark:${colors.bg.replace('bg-', 'bg-').replace('-100', '-900/20')} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}>
                  <feature.icon className={`w-6 h-6 ${colors.text} dark:${colors.text.replace('text-', 'text-').replace('-600', '-400')} transition-colors duration-300`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>


      </div>
    </section>
  );
};

export default FeatureShowcase;