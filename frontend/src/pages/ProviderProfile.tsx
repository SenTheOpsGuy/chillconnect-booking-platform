import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  StarIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CheckBadgeIcon,
  UserIcon,
  LanguageIcon,
  BriefcaseIcon,
  HeartIcon,
  ShareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import ImageGallery from '../components/common/ImageGallery';

interface Provider {
  id: number;
  user_id: number;
  name: string;
  bio: string;
  hourly_rate: number;
  location: string;
  images: string[];
  services_offered: string[];
  languages: string[];
  verification_status: 'pending' | 'approved' | 'rejected';
  avg_rating: number;
  total_ratings: number;
  is_available_now: boolean;
  availability: Record<string, Array<{ start_time: string; end_time: string }>>;
  recent_reviews: Array<{
    rating: number;
    review: string;
    reviewer_name: string;
    created_at: string;
    provider_response?: string;
  }>;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

const ProviderProfile: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'availability'>('overview');
  const [bookingDuration, setBookingDuration] = useState(1);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/providers/${providerId}`);
      setProvider(response.data);
      
      // Set default selected date to today
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    } catch (error: any) {
      console.error('Error fetching provider details:', error);
      if (error.response?.status === 404) {
        toast.error('Provider not found');
        navigate('/providers');
      } else {
        toast.error('Failed to load provider details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please log in to book a service');
      navigate('/login');
      return;
    }

    if (!selectedSlot || !selectedDate) {
      toast.error('Please select a date and time slot');
      return;
    }

    if (user.role !== 'seeker') {
      toast.error('Only seekers can book services');
      return;
    }

    try {
      const bookingData = {
        provider_id: provider?.user_id,
        start_date: selectedDate,
        start_time: selectedSlot.start_time,
        duration_hours: bookingDuration,
        special_requests: ''
      };

      const response = await axios.post('/api/v1/bookings/', bookingData);
      
      if (response.data.success) {
        toast.success('Booking request sent successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMessage = error.response?.data?.detail || 'Booking failed';
      toast.error(errorMessage);
    }
  };

  const startChat = async () => {
    if (!user) {
      toast.error('Please log in to start a chat');
      navigate('/login');
      return;
    }

    try {
      // Create or find existing chat
      const response = await axios.post('/api/v1/chat/create', {
        participant_id: provider?.user_id
      });
      
      if (response.data.success) {
        navigate(`/chat/${response.data.chat_id}`);
      }
    } catch (error: any) {
      console.error('Chat creation error:', error);
      toast.error('Failed to start chat');
    }
  };

  const toggleFavorite = async () => {
    // TODO: Implement favorites API
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${provider?.name} - ChillConnect`,
          text: `Check out ${provider?.name}'s profile on ChillConnect`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Profile link copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDayOfWeek = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  const getAvailableSlots = () => {
    if (!provider || !selectedDate) return [];
    
    const dayOfWeek = getDayOfWeek(selectedDate);
    return provider.availability[dayOfWeek] || [];
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-600'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-premium text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Provider Not Found</h2>
          <p className="text-gray-400">The provider you're looking for doesn't exist or is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Profile Image Gallery */}
        <div className="lg:col-span-1">
          <div className="card-premium">
            <ImageGallery images={provider.images} className="mb-4" />
            
            {/* Verification Status */}
            <div className="flex items-center justify-center mt-4">
              {provider.verification_status === 'approved' && (
                <div className="flex items-center text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                  <CheckBadgeIcon className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}
              {provider.verification_status === 'pending' && (
                <div className="flex items-center text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Verification Pending</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            {/* Header with name and actions */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{provider.name}</h1>
                <div className="flex items-center space-x-4 text-gray-400">
                  <div className="flex items-center">
                    <MapPinIcon className="w-5 h-5 mr-1" />
                    <span>{provider.location}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex mr-2">{renderStars(provider.avg_rating)}</div>
                    <span>{provider.avg_rating.toFixed(1)} ({provider.total_ratings} reviews)</span>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={toggleFavorite}
                  className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                >
                  {isFavorite ? (
                    <HeartIconSolid className="w-6 h-6 text-red-500" />
                  ) : (
                    <HeartIcon className="w-6 h-6 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={shareProfile}
                  className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                >
                  <ShareIcon className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Rate and Availability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Hourly Rate</p>
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="w-6 h-6 text-sensual-red mr-2" />
                      <span className="text-2xl font-bold text-sensual-red">
                        {provider.hourly_rate} tokens/hr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Availability</p>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        provider.is_available_now ? 'bg-green-400' : 'bg-gray-600'
                      }`}></div>
                      <span className="text-white font-medium">
                        {provider.is_available_now ? 'Available Now' : 'Currently Busy'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn-primary flex items-center justify-center"
                disabled={!provider.is_available_now || provider.verification_status !== 'approved'}
              >
                <CalendarIcon className="w-5 h-5 mr-2" />
                Book Now
              </button>
              <button
                onClick={startChat}
                className="btn-secondary flex items-center justify-center"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="card-premium mb-8">
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: UserIcon },
              { id: 'reviews', name: 'Reviews', icon: StarIcon },
              { id: 'availability', name: 'Availability', icon: CalendarIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-sensual-red text-sensual-red'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Bio */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">About</h3>
              <p className="text-gray-300 leading-relaxed">
                {provider.bio || 'No bio provided.'}
              </p>
            </div>

            {/* Services and Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-white mb-3 flex items-center">
                  <BriefcaseIcon className="w-5 h-5 mr-2" />
                  Services Offered
                </h4>
                <div className="flex flex-wrap gap-2">
                  {provider.services_offered.map((service, index) => (
                    <span
                      key={index}
                      className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-white mb-3 flex items-center">
                  <LanguageIcon className="w-5 h-5 mr-2" />
                  Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {provider.languages.map((language, index) => (
                    <span
                      key={index}
                      className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Reviews & Ratings</h3>
              <div className="flex items-center space-x-2">
                <div className="flex">{renderStars(provider.avg_rating)}</div>
                <span className="text-white font-medium">{provider.avg_rating.toFixed(1)}</span>
                <span className="text-gray-400">({provider.total_ratings} reviews)</span>
              </div>
            </div>

            {provider.recent_reviews.length > 0 ? (
              <div className="space-y-4">
                {provider.recent_reviews.map((review, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{review.reviewer_name}</span>
                        <div className="flex">{renderStars(review.rating)}</div>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2">{review.review}</p>
                    {review.provider_response && (
                      <div className="bg-gray-700 rounded p-3 mt-2">
                        <p className="text-sm text-gray-400 mb-1">Provider Response:</p>
                        <p className="text-gray-300">{review.provider_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No reviews yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Availability Schedule</h3>
            
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sensual-red"
              />
            </div>

            {/* Available Time Slots */}
            {selectedDate && (
              <div>
                <h4 className="text-lg font-medium text-white mb-3">
                  Available Times for {new Date(selectedDate).toLocaleDateString()}
                </h4>
                
                {getAvailableSlots().length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {getAvailableSlots().map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          selectedSlot === slot
                            ? 'border-sensual-red bg-sensual-red/10 text-sensual-red'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No available time slots for this date</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Book Service</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (hours)
                </label>
                <select
                  value={bookingDuration}
                  onChange={(e) => setBookingDuration(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sensual-red"
                >
                  {[1, 2, 3, 4, 5, 6].map(hours => (
                    <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Rate per hour:</span>
                  <span>{provider.hourly_rate} tokens</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Duration:</span>
                  <span>{bookingDuration} hour{bookingDuration > 1 ? 's' : ''}</span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-semibold text-white">
                    <span>Total Cost:</span>
                    <span>{provider.hourly_rate * bookingDuration} tokens</span>
                  </div>
                </div>
              </div>
              
              {selectedSlot && selectedDate && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Selected Time:</p>
                  <p className="text-white">
                    {new Date(selectedDate).toLocaleDateString()} at {formatTime(selectedSlot.start_time)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                className="flex-1 btn-primary"
                disabled={!selectedSlot || !selectedDate}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderProfile;