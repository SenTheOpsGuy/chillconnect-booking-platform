import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  role: 'seeker' | 'provider' | 'employee' | 'manager' | 'admin' | 'super_admin';
  verification_status: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  role: 'seeker' | 'provider';
  age_confirmed: boolean;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Set up axios defaults
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Set up axios interceptor for auth token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking authentication, token:', token ? 'present' : 'none');
      
      if (token) {
        try {
          console.log('📡 Verifying token with /auth/me');
          // Verify token is still valid by making a request to get user profile
          const response = await axios.get('/auth/me');
          console.log('✅ Token valid, user:', response.data);
          setUser(response.data);
        } catch (error) {
          console.error('❌ Token verification failed:', error);
          // Token is invalid, clear it
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      } else {
        console.log('ℹ️ No token found');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔑 Attempting login for:', email);
      
      const response = await axios.post('/auth/login', { email, password });
      console.log('📡 Login response:', response.data);
      
      const { access_token, user: userData } = response.data;
      
      console.log('👤 User data:', userData);
      console.log('🎫 Token:', access_token.substring(0, 20) + '...');
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('auth_token', access_token);
      
      console.log('✅ Auth state updated successfully');
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.detail || 'Login failed';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await axios.post('/auth/register', userData);
      
      // Registration successful, but user needs to verify email
      toast.success('Registration successful! Please check your email for verification.');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'employee';

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};