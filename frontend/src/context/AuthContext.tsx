/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateUser?: (user: User) => void;
  refreshUserData?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('showLoginAfterLogout');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const { token: newToken, user: newUser } = data;
        
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        toast.success(`Welcome back, ${newUser.name}!`);
        return true;
      } else {
        toast.error(data.message || 'Invalid email or password');
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Unable to connect to server. Please check your connection.');
      } else {
        toast.error('Login failed. Please try again.');
      }
      return false;
    }
  };

  const logout = () => {
    // Clear user state first
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    toast.success('Logged out successfully');
    
    // Use setTimeout to ensure state is cleared before navigation
    setTimeout(() => {
      navigate('/?login=true', { replace: true });
    }, 100);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Function to refresh user data from server
  const refreshUserData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Auto-refresh user data every 15 seconds to catch admin updates
  useEffect(() => {
    if (user && token) {
      const interval = setInterval(() => {
        // Check if any modal is open by looking for modal overlay elements
        const hasOpenModal = document.querySelector('.modal-overlay');
        if (!hasOpenModal) {
          refreshUserData();
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};