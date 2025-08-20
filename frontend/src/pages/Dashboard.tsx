import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  CalendarIcon, 
  CreditCardIcon, 
  UserGroupIcon, 
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface Booking {
  id: number;
  provider_id: number;
  provider_name: string;
  start_time: string;
  duration_hours: number;
  total_tokens: number;
  status: string;
  location?: string;
  created_at: string;
}

interface TokenWallet {
  balance: number;
  escrow_balance: number;
}

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalSpent: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent bookings
      const bookingsResponse = await axios.get('/bookings/my-bookings');
      const bookingsData = bookingsResponse.data;
      setBookings(bookingsData.slice(0, 5)); // Show only 5 recent bookings
      
      // Calculate stats
      const totalBookings = bookingsData.length;
      const activeBookings = bookingsData.filter((b: Booking) => 
        ['pending', 'confirmed', 'in_progress'].includes(b.status)
      ).length;
      const completedBookings = bookingsData.filter((b: Booking) => 
        b.status === 'completed'
      ).length;
      const totalSpent = bookingsData.reduce((sum: number, b: Booking) => 
        sum + b.total_tokens, 0
      );
      
      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        totalSpent
      });

      // Fetch wallet information
      try {
        const walletResponse = await axios.get('/tokens/balance');
        setWallet(walletResponse.data);
      } catch (error) {
        console.log('No wallet data available');
      }
      
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load dashboard data');
        console.error('Dashboard error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-blue-400" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-gray-400">
          {user?.role === 'seeker' ? 
            'Discover premium companionship services' : 
            'Manage your professional services'
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-premium">
          <div className="flex items-center">
            <CalendarIcon className="w-8 h-8 text-sensual-red mr-3" />
            <div>
              <p className="text-sm text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="card-premium">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Active Bookings</p>
              <p className="text-2xl font-bold text-white">{stats.activeBookings}</p>
            </div>
          </div>
        </div>

        <div className="card-premium">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-white">{stats.completedBookings}</p>
            </div>
          </div>
        </div>

        <div className="card-premium">
          <div className="flex items-center">
            <CreditCardIcon className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Tokens Balance</p>
              <p className="text-2xl font-bold text-white">{wallet?.balance || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Bookings</h3>
              <Link to="/bookings" className="text-sensual-red hover:text-sensual-red-light">
                View all →
              </Link>
            </div>
            
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-700 rounded-lg p-4 hover:border-sensual-red/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-white font-medium">{booking.provider_name}</h4>
                        <p className="text-sm text-gray-400">{formatDate(booking.start_time)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(booking.status)}
                        <span className={`text-sm capitalize ${
                          booking.status === 'completed' ? 'text-blue-400' :
                          booking.status === 'confirmed' ? 'text-green-400' :
                          booking.status === 'pending' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">
                        {booking.duration_hours}h • {booking.location || 'Location TBD'}
                      </span>
                      <span className="text-sensual-red font-medium">
                        {booking.total_tokens} tokens
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No bookings yet</p>
                <Link to="/providers" className="text-sensual-red hover:text-sensual-red-light mt-2 inline-block">
                  Browse providers to get started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="card-premium">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                to="/providers" 
                className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-sensual-red/50 transition-colors group"
              >
                <UserGroupIcon className="w-5 h-5 text-sensual-red mr-3" />
                <span className="text-white group-hover:text-sensual-red">Browse Providers</span>
              </Link>
              
              <Link 
                to="/wallet" 
                className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-sensual-red/50 transition-colors group"
              >
                <CreditCardIcon className="w-5 h-5 text-sensual-red mr-3" />
                <span className="text-white group-hover:text-sensual-red">Manage Wallet</span>
              </Link>
              
              <Link 
                to="/chat" 
                className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-sensual-red/50 transition-colors group"
              >
                <ChatBubbleLeftIcon className="w-5 h-5 text-sensual-red mr-3" />
                <span className="text-white group-hover:text-sensual-red">Messages</span>
              </Link>
              
              <Link 
                to="/support" 
                className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-sensual-red/50 transition-colors group"
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-sensual-red mr-3" />
                <span className="text-white group-hover:text-sensual-red">Get Support</span>
              </Link>
            </div>
          </div>

          {/* Account Status */}
          <div className="card-premium">
            <h3 className="text-xl font-semibold text-white mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Account Type:</span>
                <span className="text-white capitalize font-medium">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verification:</span>
                <span className={`capitalize font-medium ${
                  user?.verification_status === 'verified' ? 'text-green-400' : 
                  user?.verification_status === 'pending' ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {user?.verification_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email Verified:</span>
                <span className={`font-medium ${user?.email_verified ? 'text-green-400' : 'text-red-400'}`}>
                  {user?.email_verified ? 'Yes' : 'No'}
                </span>
              </div>
              {wallet && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Token Balance:</span>
                  <span className="text-sensual-red font-bold">{wallet.balance}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;