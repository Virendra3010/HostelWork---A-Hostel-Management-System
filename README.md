# 🏠 Excellence Hostel Management System

<div align="center">

![Hostel Management](https://img.shields.io/badge/Hostel-Management-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.0-06B6D4?style=for-the-badge&logo=tailwindcss)

**A comprehensive, modern hostel management solution built with React, TypeScript, Node.js, and MongoDB**

[🚀 Features](#-features) • [📋 Prerequisites](#-prerequisites) • [⚡ Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🤝 Contributing](#-contributing)

</div>

---

## 📖 Overview

Excellence Hostel Management System is a full-stack web application designed to streamline hostel operations and enhance the living experience for students, wardens, and administrators. The system provides comprehensive tools for room management, complaint handling, fee tracking, leave requests, and much more.

### 🎯 Built For
- **Students**: Easy room booking, complaint submission, fee payments, and leave applications
- **Wardens**: Efficient complaint management, student oversight, and block administration
- **Administrators**: Complete system control, user management, and analytics dashboard

---

## ✨ Features

### 👥 **User Management**
- **Multi-role Authentication** (Admin, Warden, Student)
- **Secure Registration & Login** with JWT tokens
- **Profile Management** with photo uploads
- **Role-based Access Control** (RBAC)
- **10-digit Phone Validation** across all forms

### 🏠 **Room Management**
- **Smart Room Allocation** with capacity tracking
- **Block-wise Organization** (A, B, C, D blocks)
- **Amenity Management** (AC, WiFi, Attached Bathroom, etc.)
- **Occupancy Tracking** with join dates
- **Rent Calculation** based on room type and amenities

### 📝 **Complaint System**
- **Categorized Complaints** (Maintenance, Electrical, Plumbing, etc.)
- **Priority Levels** (Low, Medium, High, Urgent)
- **Status Tracking** (Pending, In Progress, Resolved, Rejected)
- **Warden Assignment** and remarks system
- **Image Upload Support** for complaint evidence

### 💰 **Fee Management**
- **Semester-wise Fee Structure**
- **Multiple Fee Components** (Room Rent, Mess, Electricity, Maintenance)
- **Payment Tracking** with transaction IDs
- **Due Date Management** and overdue notifications
- **Payment History** and receipts

### 🏃 **Leave Management**
- **Leave Types** (Home, Medical, Emergency, Personal)
- **Approval Workflow** with warden authorization
- **Emergency Contact** information
- **Leave History** and status tracking
- **Date Validation** and conflict checking

### 📢 **Announcement System**
- **Targeted Announcements** (All, Students, Wardens, Specific Blocks)
- **Priority Levels** and expiration dates
- **Rich Text Content** support
- **Real-time Notifications**

### 📊 **Dashboard & Analytics**
- **Role-specific Dashboards** with relevant metrics
- **Interactive Charts** using Recharts
- **Real-time Statistics** and KPIs
- **Quick Action Buttons** for common tasks

### 🔧 **System Features**
- **Responsive Design** with dark/light mode
- **Real-time Notifications** system
- **Advanced Search & Filtering**
- **Pagination** (12 items per page)
- **Data Export** capabilities
- **Email Notifications** via Nodemailer

---

## 🛠 Tech Stack

### **Frontend**
- **React 19.1.1** - Modern UI library
- **TypeScript 4.9.5** - Type-safe development
- **TailwindCSS 3.4.0** - Utility-first CSS framework
- **React Router DOM 7.8.2** - Client-side routing
- **Axios 1.11.0** - HTTP client
- **React Hot Toast 2.6.0** - Toast notifications
- **Lucide React 0.541.0** - Beautiful icons
- **Recharts 3.1.2** - Data visualization

### **Backend**
- **Node.js** - JavaScript runtime
- **Express 5.1.0** - Web framework
- **MongoDB 8.17.2** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Nodemailer 7.0.5** - Email service
- **Express Validator** - Input validation

### **Development Tools**
- **CRACO** - Create React App Configuration Override
- **Nodemon** - Development server
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)
- **npm** or **yarn** package manager

---

## ⚡ Quick Start

### 1️⃣ **Clone the Repository**
```bash
git clone https://github.com/your-username/hostel-management-system.git
cd hostel-management-system
```

### 2️⃣ **Backend Setup**
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure your environment variables in .env
# MONGODB_URI=mongodb://localhost:27017/hostel-management
# JWT_SECRET=your-super-secret-jwt-key
# NODE_ENV=development
# PORT=8000
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# Seed the database with sample data
npm run seed

# Start the backend server
npm run dev
```

### 3️⃣ **Frontend Setup**
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm start
```

### 4️⃣ **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/health

---

## 🔐 Default Test Accounts

After running the seed script, you can use these accounts to test the application:

### **Administrator**
- **Email**: `admin@hostel.com`
- **Password**: `password123`
- **Access**: Full system control

### **Wardens**
- **Email**: `john.warden@hostel.com` (Blocks A, B)
- **Email**: `sarah.warden@hostel.com` (Blocks C, D)
- **Email**: `michael.warden@hostel.com` (Block A)
- **Email**: `emma.warden@hostel.com` (Block B)
- **Password**: `password123`
- **Access**: Block management, complaint handling

### **Students**
- **Email**: `alice@student.com` (Block A)
- **Email**: `diana@student.com` (Block B)
- **Email**: `george@student.com` (Block C)
- **Email**: `ian@student.com` (Block D)
- **Password**: `password123`
- **Access**: Room booking, complaints, fees, leaves

---

## 📁 Project Structure

```
hostel-management-system/
├── 📂 backend/
│   ├── 📂 config/          # Database configuration
│   ├── 📂 controllers/     # Route controllers
│   ├── 📂 middleware/      # Authentication & validation
│   ├── 📂 models/          # MongoDB schemas
│   ├── 📂 routes/          # API routes
│   ├── 📂 services/        # Business logic services
│   ├── 📂 utils/           # Utility functions
│   ├── 📄 seedData.js      # Database seeding script
│   └── 📄 server.js        # Express server entry point
├── 📂 frontend/
│   ├── 📂 public/          # Static assets
│   └── 📂 src/
│       ├── 📂 components/  # Reusable UI components
│       ├── 📂 contexts/    # React contexts
│       ├── 📂 hooks/       # Custom React hooks
│       ├── 📂 pages/       # Page components
│       ├── 📂 services/    # API services
│       ├── 📂 types/       # TypeScript type definitions
│       └── 📂 utils/       # Utility functions
└── 📄 README.md           # Project documentation
```

---

## 🔌 API Endpoints

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### **Users**
- `GET /api/users` - Get all users (Admin/Warden)
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Rooms**
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### **Complaints**
- `GET /api/complaints` - Get complaints
- `POST /api/complaints` - Submit complaint
- `PUT /api/complaints/:id` - Update complaint
- `DELETE /api/complaints/:id` - Delete complaint

### **Fees**
- `GET /api/fees` - Get fee records
- `POST /api/fees` - Create fee record
- `PUT /api/fees/:id` - Update fee payment

### **Leaves**
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Submit leave request
- `PUT /api/leaves/:id` - Update leave status

### **Announcements**
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update announcement

---

## 🎨 UI/UX Features

### **Design System**
- **Modern Interface** with clean, intuitive design
- **Responsive Layout** that works on all devices
- **Dark/Light Mode** toggle for user preference
- **Consistent Color Scheme** with proper contrast ratios
- **Smooth Animations** and transitions

### **User Experience**
- **Role-based Navigation** showing relevant menu items
- **Real-time Feedback** with toast notifications
- **Loading States** and error handling
- **Form Validation** with helpful error messages
- **Search and Filter** capabilities across all data tables

### **Accessibility**
- **Keyboard Navigation** support
- **Screen Reader** friendly
- **High Contrast** mode support
- **Focus Indicators** for interactive elements

---

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcryptjs
- **Input Validation** on both client and server
- **CORS Configuration** for cross-origin requests
- **Rate Limiting** to prevent abuse
- **SQL Injection Protection** via Mongoose ODM
- **XSS Protection** with input sanitization

---

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- **Desktop** (1920px and above)
- **Laptop** (1024px - 1919px)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

---

## 🚀 Deployment

### **Backend Deployment**
1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Configure environment variables for production
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Update CORS settings for your frontend domain

### **Frontend Deployment**
1. Build the production version: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3
3. Update API base URL in the frontend configuration

### **Environment Variables**
```env
# Backend (.env)
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production
PORT=8000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 🧪 Testing

### **Running Tests**
```bash
# Frontend tests
cd frontend
npm test

# Backend tests (if implemented)
cd backend
npm test
```

### **Test Coverage**
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical user flows

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **MongoDB** for the flexible database solution
- **TailwindCSS** for the utility-first CSS framework
- **Lucide** for the beautiful icon set
- **All Contributors** who helped make this project better

---

## 📞 Support

If you encounter any issues or have questions:

- **Create an Issue** on GitHub
- **Email**: support@excellencehostel.edu
- **Documentation**: Check the [Wiki](https://github.com/your-username/hostel-management-system/wiki)

---

<div align="center">

**Made with ❤️ for better hostel management**

⭐ **Star this repository if you found it helpful!** ⭐

</div>