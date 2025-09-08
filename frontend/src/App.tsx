import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import RoleGuard from './components/RoleGuard';

import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Complaints from './pages/Complaints';
import Users from './pages/Users';
import MyRoom from './pages/MyRoom';
import Fees from './pages/Fees';
import Leaves from './pages/Leaves';
import Announcements from './pages/Announcements';
import Wardens from './pages/Wardens';
import Notifications from './pages/Notifications';
import About from './pages/About';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import Demo from './pages/Demo';
import Register from './pages/Register';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/demo" element={<Demo />} />

      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/users" element={
                <RoleGuard allowedRoles={['admin', 'warden', 'student']}>
                  <Layout><Users /></Layout>
                </RoleGuard>
              } />
              <Route path="/wardens" element={
                <RoleGuard allowedRoles={['admin']}>
                  <Layout><Wardens /></Layout>
                </RoleGuard>
              } />
              <Route path="/rooms" element={
                <RoleGuard allowedRoles={['admin', 'warden', 'student']}>
                  <Layout><Rooms /></Layout>
                </RoleGuard>
              } />
              <Route path="/my-room" element={
                <RoleGuard allowedRoles={['student']}>
                  <Layout><MyRoom /></Layout>
                </RoleGuard>
              } />
              <Route path="/complaints" element={<Layout><Complaints /></Layout>} />
              <Route path="/leaves" element={<Layout><Leaves /></Layout>} />
              <Route path="/fees" element={<Layout><Fees /></Layout>} />
              <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
              <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
              <Route path="/about" element={<Layout><About /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/settings" element={
                <RoleGuard allowedRoles={['admin', 'warden', 'student']}>
                  <Layout><Settings /></Layout>
                </RoleGuard>
              } />
              {/* Add more routes as needed */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '8px',
                  background: '#363636',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  zIndex: 9999,
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#10b981',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#10b981',
                  },
                },
                error: {
                  duration: 4000,
                  style: {
                    background: '#ef4444',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;