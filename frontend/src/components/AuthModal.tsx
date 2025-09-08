import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, UserCheck, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAdminCreated?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAdminCreated
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);
  const [adminExists, setAdminExists] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Update mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      // Check for reset token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlResetToken = urlParams.get('reset');
      if (urlResetToken) {
        setResetToken(urlResetToken);
        setMode('reset');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [initialMode, isOpen]);

  // Check if admin exists
  useEffect(() => {
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
    if (isOpen) {
      checkAdminExists();
    }
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await login(loginData.email, loginData.password);
    if (success) {
      onClose();
      // Let React Router handle navigation instead of forcing reload
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
      
      const data = await response.json();
      console.log('Register response:', data);
      
      if (response.ok && data.success) {
        toast.success('Admin account created successfully! Please login.');
        setMode('login');
        setRegisterData({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'admin' });
        if (onAdminCreated) {
          onAdminCreated();
        }
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setEmailSent(true);
        if (data.emailSent) {
          toast.success('Password reset instructions have been sent to your email! Please check your inbox.');
        } else {
          // Fallback for development when email service is not available
          setResetToken(data.resetToken);
          setMode('reset');
          toast.success('Email service unavailable. Use the reset token provided.');
          console.log('Reset token for development:', data.resetToken);
        }
      } else {
        toast.error(data.message || 'Failed to send reset instructions');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (resetData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: resetToken, newPassword: resetData.newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Password reset successful! You can now login with your new password.');
        setMode('login');
        setResetData({ newPassword: '', confirmPassword: '' });
        setResetToken('');
        setForgotEmail('');
      } else {
        toast.error(data.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-lg w-full modal-container animate-in ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Logo size="md" />
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4">
          {mode === 'login' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Sign in to your account</p>
              
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="input-field pl-10 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
              
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-2">
                <button
                  onClick={() => setMode('forgot')}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 block w-full"
                >
                  Forgot your password?
                </button>
                {!adminExists && (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => setMode('register')}
                      className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                    >
                      Sign up
                    </button>
                  </p>
                )}
              </div>
            </div>
          ) : mode === 'register' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Registration</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Create admin account for your hostel</p>
              
              <form onSubmit={handleRegisterSubmit} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter your full name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      className="input-field pl-10"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="tel"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter your phone number"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <select
                      required
                      className="input-field pl-10 bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-white"
                      value={registerData.role}
                      disabled
                    >
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="password"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter your password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="password"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="col-span-2 w-full btn-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Creating admin account...' : 'Create Admin Account'}
                </button>
              </form>
              
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Only administrators can create accounts. Wardens and students receive credentials from admin.
                </p>
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : mode === 'forgot' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Enter your email to receive reset instructions</p>
              
              {!emailSent ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        required
                        className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="Enter your email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-3 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Instructions'}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      We've sent password reset instructions to <strong>{forgotEmail}</strong>
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-2">Next steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-left">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the reset link or copy the reset token</li>
                        <li>Return here to reset your password</li>
                      </ol>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                      <button
                        onClick={() => setMode('reset')}
                        className="btn-primary px-6 py-2 text-sm"
                      >
                        I have the reset token
                      </button>
                      <button
                        onClick={() => {
                          setEmailSent(false);
                          setForgotEmail('');
                        }}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                      >
                        Didn't receive email? Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setEmailSent(false);
                    setForgotEmail('');
                  }}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Enter your reset token and new password</p>
              
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reset Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter the reset token from your email"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Check your email for the reset token
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="password"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Enter new password"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="password"
                      required
                      className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      placeholder="Confirm new password"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({...resetData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
              
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Remember your password?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;