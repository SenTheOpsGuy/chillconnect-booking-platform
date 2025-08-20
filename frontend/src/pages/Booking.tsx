import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  StarIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Booking {
  id: number;
  provider_id: number;
  provider_name: string;
  seeker_id: number;
  start_time: string;
  duration_hours: number;
  total_tokens: number;
  booking_type: 'incall' | 'outcall';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  special_requests?: string;
  created_at: string;
}

interface BookingUpdate {
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  otp_code?: string;
}

interface RatingData {
  rating: number;
  review: string;
  is_anonymous: boolean;
}

const Booking: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSeekerOtpModal, setShowSeekerOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [seekerOtpCode, setSeekerOtpCode] = useState('');
  const [otpBookingId, setOtpBookingId] = useState<number | null>(null);
  const [seekerOtpBookingId, setSeekerOtpBookingId] = useState<number | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [seekerOtpLoading, setSeekerOtpLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [ratingData, setRatingData] = useState<RatingData>({
    rating: 5,
    review: '',
    is_anonymous: false
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/bookings/my-bookings');
      setBookings(response.data);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: number, status: string, otpCode?: string) => {
    try {
      setActionLoading(true);
      const payload: BookingUpdate = { status: status as any };
      if (otpCode) {
        payload.otp_code = otpCode;
      }
      
      await axios.put(`/bookings/${bookingId}/status`, payload);
      
      // Update local state
      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: status as any }
            : booking
        )
      );
      
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, status: status as any } : null);
      }
      
      toast.success(`Booking ${status} successfully`);
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update booking';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const generateOtp = async (bookingId: number) => {
    try {
      setOtpLoading(true);
      await axios.post(`/bookings/${bookingId}/generate-start-otp`);
      toast.success('OTP sent to your phone number');
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to generate OTP';
      toast.error(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleStartService = async (bookingId: number) => {
    setOtpBookingId(bookingId);
    setShowOtpModal(true);
    // Generate OTP automatically when modal opens
    await generateOtp(bookingId);
  };

  const verifyOtpAndStartService = async () => {
    if (!otpCode || !otpBookingId) {
      toast.error('Please enter the OTP code');
      return;
    }

    await updateBookingStatus(otpBookingId, 'in_progress', otpCode);
    
    // Close modal and reset state
    setShowOtpModal(false);
    setOtpCode('');
    setOtpBookingId(null);
  };

  const handleViewSeekerOtp = async (bookingId: number) => {
    try {
      setSeekerOtpLoading(true);
      const response = await axios.get(`/bookings/${bookingId}/seeker-start-otp`);
      setSeekerOtpCode(response.data.code);
      setSeekerOtpBookingId(bookingId);
      setShowSeekerOtpModal(true);
      toast.success('OTP retrieved successfully');
    } catch (error: any) {
      console.error('Error getting seeker OTP:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to get OTP';
      toast.error(errorMessage);
    } finally {
      setSeekerOtpLoading(false);
    }
  };

  const submitRating = async () => {
    if (!selectedBooking || ratingData.rating < 1 || ratingData.rating > 5) {
      toast.error('Please provide a valid rating');
      return;
    }

    try {
      setActionLoading(true);
      const targetUserId = user?.role === 'seeker' ? selectedBooking.provider_id : selectedBooking.seeker_id;
      
      await axios.post('/ratings/create', {
        booking_id: selectedBooking.id,
        rated_user: targetUserId,
        rating: ratingData.rating,
        review: ratingData.review,
        is_anonymous: ratingData.is_anonymous
      });

      setShowRatingModal(false);
      setRatingData({
        rating: 5,
        review: '',
        is_anonymous: false
      });
      toast.success('Rating submitted successfully');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to submit rating';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'confirmed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'in_progress':
        return <ExclamationTriangleIcon className="w-5 h-5 text-blue-400" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-blue-400" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'confirmed':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'in_progress':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'completed':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const canPerformAction = (booking: Booking, action: string) => {
    const isProvider = user?.role === 'provider' && booking.provider_id === user.id;
    const isSeeker = user?.role === 'seeker' && booking.seeker_id === user.id;

    switch (action) {
      case 'confirm':
        return isProvider && booking.status === 'pending';
      case 'start':
        return isProvider && booking.status === 'confirmed';
      case 'complete':
        return isProvider && booking.status === 'in_progress';
      case 'cancel':
        return (isSeeker || isProvider) && ['pending', 'confirmed'].includes(booking.status);
      case 'rate':
        return booking.status === 'completed' && (isSeeker || isProvider);
      case 'view_otp':
        return isSeeker && booking.status === 'confirmed';
      default:
        return false;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilBooking = (startTime: string) => {
    const now = new Date();
    const booking = new Date(startTime);
    const diffInHours = Math.ceil((booking.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return 'Past due';
    if (diffInHours < 1) return 'Starting soon';
    if (diffInHours < 24) return `In ${diffInHours} hours`;
    const days = Math.ceil(diffInHours / 24);
    return `In ${days} day${days > 1 ? 's' : ''}`;
  };

  const filteredBookings = bookings.filter(booking =>
    selectedStatus === 'all' || booking.status === selectedStatus
  );

  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, index) => {
      const filled = index < rating;
      const Icon = filled ? StarIconSolid : StarIcon;
      return (
        <Icon
          key={index}
          className={`w-5 h-5 ${
            filled ? 'text-yellow-400' : 'text-gray-600'
          } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
          onClick={() => interactive && onChange && onChange(index + 1)}
        />
      );
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Bookings</h1>
        <p className="text-gray-400">
          {user?.role === 'seeker' 
            ? 'Manage your service bookings' 
            : 'Manage your service appointments'
          }
        </p>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statusOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setSelectedStatus(option.value)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedStatus === option.value
                ? 'bg-sensual-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {option.label}
            {option.value !== 'all' && (
              <span className="ml-2 text-xs bg-gray-700 px-2 py-1 rounded">
                {bookings.filter(b => b.status === option.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="card-premium hover:border-sensual-red/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(booking.status)}
                    <h3 className="text-lg font-semibold text-white">
                      Booking #{booking.id}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                    {['confirmed', 'in_progress'].includes(booking.status) && (
                      <span className="text-xs text-yellow-400">
                        {getTimeUntilBooking(booking.start_time)}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {user?.role === 'seeker' ? 'Provider' : 'Client'}: {booking.provider_name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-300">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{formatDate(booking.start_time)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-300">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-300">
                      <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-sensual-red">{booking.total_tokens} tokens</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm capitalize">{booking.booking_type}</span>
                    </div>
                  </div>

                  {/* Location and Requests */}
                  {(booking.location || booking.special_requests) && (
                    <div className="space-y-2 mb-4">
                      {booking.location && (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <MapPinIcon className="w-4 h-4" />
                          <span className="text-sm">{booking.location}</span>
                        </div>
                      )}
                      {booking.special_requests && (
                        <div className="flex items-start space-x-2 text-gray-400">
                          <DocumentTextIcon className="w-4 h-4 mt-0.5" />
                          <span className="text-sm">{booking.special_requests}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingDetail(true);
                      }}
                      className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>View Details</span>
                    </button>

                    <Link
                      to={`/chat?booking=${booking.id}`}
                      className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>Chat</span>
                    </Link>

                    {canPerformAction(booking, 'confirm') && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        disabled={actionLoading}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Confirm
                      </button>
                    )}

                    {canPerformAction(booking, 'start') && (
                      <button
                        onClick={() => handleStartService(booking.id)}
                        disabled={actionLoading || otpLoading}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Start Service
                      </button>
                    )}

                    {canPerformAction(booking, 'complete') && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                        disabled={actionLoading}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Mark Complete
                      </button>
                    )}

                    {canPerformAction(booking, 'cancel') && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}

                    {canPerformAction(booking, 'view_otp') && (
                      <button
                        onClick={() => handleViewSeekerOtp(booking.id)}
                        disabled={seekerOtpLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center space-x-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View OTP</span>
                      </button>
                    )}

                    {canPerformAction(booking, 'rate') && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowRatingModal(true);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center space-x-1"
                      >
                        <StarIcon className="w-4 h-4" />
                        <span>Rate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CalendarIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
          <p className="text-gray-400 mb-4">
            {selectedStatus === 'all'
              ? user?.role === 'seeker'
                ? "You haven't made any bookings yet"
                : "You don't have any bookings yet"
              : `No ${selectedStatus} bookings found`
            }
          </p>
          {user?.role === 'seeker' && (
            <Link to="/providers" className="btn-primary">
              Browse Providers
            </Link>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {showBookingDetail && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(selectedBooking.status)}
                    <h3 className="text-xl font-semibold text-white">
                      Booking #{selectedBooking.id}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-400">Created {formatDate(selectedBooking.created_at)}</p>
                </div>
                <button
                  onClick={() => setShowBookingDetail(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Participant Info */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Participants</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Provider:</span>
                      <span className="text-white">{selectedBooking.provider_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Client:</span>
                      <span className="text-white">You</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Booking Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date & Time:</span>
                      <span className="text-white">{formatDate(selectedBooking.start_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{selectedBooking.duration_hours} hour{selectedBooking.duration_hours > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Cost:</span>
                      <span className="text-sensual-red font-medium">{selectedBooking.total_tokens} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service Type:</span>
                      <span className="text-white capitalize">{selectedBooking.booking_type}</span>
                    </div>
                    {selectedBooking.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white">{selectedBooking.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {selectedBooking.special_requests && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Special Requests</h4>
                    <p className="text-gray-300">{selectedBooking.special_requests}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/chat?booking=${selectedBooking.id}`}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>Open Chat</span>
                  </Link>

                  {canPerformAction(selectedBooking, 'rate') && (
                    <button
                      onClick={() => {
                        setShowBookingDetail(false);
                        setShowRatingModal(true);
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <StarIcon className="w-4 h-4" />
                      <span>Leave Rating</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Leave a Rating</h3>
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Rating</label>
                  <div className="flex justify-center space-x-1 mb-2">
                    {renderStars(ratingData.rating, true, (rating) =>
                      setRatingData(prev => ({ ...prev, rating }))
                    )}
                  </div>
                  <p className="text-center text-sm text-gray-400">
                    {ratingData.rating} out of 5 stars
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Review (optional)</label>
                  <textarea
                    placeholder="Share your experience..."
                    value={ratingData.review}
                    onChange={(e) => setRatingData(prev => ({ ...prev, review: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={ratingData.is_anonymous}
                    onChange={(e) => setRatingData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                    className="w-4 h-4 text-sensual-red bg-gray-800 border-gray-700 rounded focus:ring-sensual-red"
                  />
                  <label htmlFor="anonymous" className="ml-2 text-sm text-white">
                    Submit as anonymous review
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={actionLoading || ratingData.rating < 1}
                    className="flex-1 btn-primary"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Verify OTP to Start Service</h3>
                <button
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpCode('');
                    setOtpBookingId(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm">
                    We've sent a 6-digit verification code to your registered phone number.
                    Enter the code below to start the service.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-lg tracking-widest placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => otpBookingId && generateOtp(otpBookingId)}
                    disabled={otpLoading}
                    className="text-sensual-red hover:text-sensual-red-light text-sm"
                  >
                    {otpLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                  <span className="text-xs text-gray-500">Code expires in 10 minutes</span>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowOtpModal(false);
                      setOtpCode('');
                      setOtpBookingId(null);
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyOtpAndStartService}
                    disabled={actionLoading || otpCode.length !== 6}
                    className="flex-1 btn-primary"
                  >
                    {actionLoading ? 'Verifying...' : 'Start Service'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seeker OTP Display Modal */}
      {showSeekerOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Service Start OTP</h3>
                <button
                  onClick={() => {
                    setShowSeekerOtpModal(false);
                    setSeekerOtpCode('');
                    setSeekerOtpBookingId(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="bg-gray-800 rounded-lg p-6 mb-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Share this OTP with your provider to start the service:
                    </p>
                    <div className="text-3xl font-bold text-sensual-red tracking-wider mb-2">
                      {seekerOtpCode}
                    </div>
                    <p className="text-xs text-gray-500">Valid for 30 minutes</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-blue-800 font-medium mb-2">Instructions:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Share this 6-digit code with your provider</li>
                    <li>• Provider will enter this code to start the service</li>
                    <li>• Keep this code private and secure</li>
                    <li>• Code expires in 30 minutes</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(seekerOtpCode);
                      toast.success('OTP copied to clipboard');
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Copy OTP
                  </button>
                  <button
                    onClick={() => {
                      setShowSeekerOtpModal(false);
                      setSeekerOtpCode('');
                      setSeekerOtpBookingId(null);
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;