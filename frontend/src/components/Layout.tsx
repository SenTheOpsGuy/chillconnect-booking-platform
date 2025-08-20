import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  CurrencyDollarIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Dynamic navigation based on user role
  const getNavigation = () => {
    if (!isAuthenticated) {
      return [
        { name: 'Home', href: '/', icon: HomeIcon },
        { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
      ];
    }
    
    if (user?.role === 'seeker') {
      return [
        { name: 'Providers', href: '/providers', icon: UserGroupIcon },
        { name: 'Bookings', href: '/bookings', icon: CalendarIcon },
        { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
        { name: 'Wallet', href: '/wallet', icon: CurrencyDollarIcon },
        { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
      ];
    }
    
    if (user?.role === 'provider') {
      return [
        { name: 'Bookings', href: '/bookings', icon: CalendarIcon },
        { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
        { name: 'Wallet', href: '/wallet', icon: CurrencyDollarIcon },
        { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
      ];
    }
    
    // For admin roles
    return [
      { name: 'Providers', href: '/providers', icon: UserGroupIcon },
      { name: 'Bookings', href: '/bookings', icon: CalendarIcon },
      { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
      { name: 'Wallet', href: '/wallet', icon: CurrencyDollarIcon },
      { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
    ];
  };

  const navigation = getNavigation();

  const userNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Navigation Header */}
      <nav className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-white text-xl font-bold">ChillConnect</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm">
                    Welcome, {user?.email}
                  </span>
                  
                  <Link
                    to="/dashboard"
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Dashboard
                  </Link>
                  
                  {isAdmin && (
                    <Link
                      to="/admin-panel"
                      className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-sensual-red transition-colors duration-300 p-2"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="nav-link"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary"
                  >
                    Join Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="nav-link flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-white text-xl font-bold">ChillConnect</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Premium adult services booking platform with secure token-based payments and professional verification.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/providers" className="text-gray-400 hover:text-sensual-red text-sm">Browse Providers</Link></li>
                <li><Link to="/support" className="text-gray-400 hover:text-sensual-red text-sm">Support Center</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-sensual-red text-sm">About Us</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-gray-400 hover:text-sensual-red text-sm">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-sensual-red text-sm">Terms of Service</Link></li>
                <li><Link to="/safety" className="text-gray-400 hover:text-sensual-red text-sm">Safety Guidelines</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-center text-gray-500 text-sm">
              © 2025 ChillConnect. All rights reserved. Must be 18+ to use this platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;