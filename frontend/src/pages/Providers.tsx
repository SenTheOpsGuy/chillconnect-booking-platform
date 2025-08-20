import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  CheckBadgeIcon,
  FunnelIcon,
  CalendarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

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
  verification_status: string;
  avg_rating: number;
  total_ratings: number;
  is_available_now: boolean;
}

interface BookingRequest {
  provider_id: number;
  start_time: string;
  duration_hours: number;
  booking_type: 'incall' | 'outcall';
  location?: string;
  special_requests?: string;
}

interface SearchFilters {
  location: string;
  min_rate: string;
  max_rate: string;
  services: string;
  languages: string;
  available_today: boolean;
}

const Providers: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingData, setBookingData] = useState<Partial<BookingRequest>>({
    duration_hours: 1,
    booking_type: 'outcall',
    location: '',
    special_requests: ''
  });
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    min_rate: '',
    max_rate: '',
    services: '',
    languages: '',
    available_today: false
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.location) params.append('location', filters.location);
      if (filters.min_rate) params.append('min_rate', filters.min_rate);
      if (filters.max_rate) params.append('max_rate', filters.max_rate);
      if (filters.services) params.append('services', filters.services);
      if (filters.languages) params.append('languages', filters.languages);
      if (filters.available_today) params.append('available_today', 'true');

      const response = await axios.get(`/providers/search?${params.toString()}`);
      setProviders(response.data);
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load providers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProviders();
  };

  const handleBooking = async () => {
    if (!selectedProvider || !bookingData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const bookingRequest = {
        provider_id: selectedProvider.user_id,
        start_time: bookingData.start_time,
        duration_hours: bookingData.duration_hours || 1,
        booking_type: bookingData.booking_type || 'outcall',
        location: bookingData.location,
        special_requests: bookingData.special_requests
      };

      await axios.post('/bookings/create', bookingRequest);
      toast.success('Booking request sent successfully!');
      setShowBookingModal(false);
      setSelectedProvider(null);
      setBookingData({
        duration_hours: 1,
        booking_type: 'outcall',
        location: '',
        special_requests: ''
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMessage = error.response?.data?.detail || 'Booking failed';
      toast.error(errorMessage);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const filled = index < Math.floor(rating);
      return filled ? (
        <StarIconSolid key={index} className="w-4 h-4 text-yellow-400" />
      ) : (
        <StarIcon key={index} className="w-4 h-4 text-gray-600" />
      );
    });
  };

  const calculateTotalCost = () => {
    if (!selectedProvider || !bookingData.duration_hours) return 0;
    const baseCost = selectedProvider.hourly_rate * bookingData.duration_hours;
    const processingFee = Math.floor(baseCost * 0.05);
    return baseCost + processingFee;
  };

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-white mb-2">Browse Providers</h1>
        <p className="text-gray-400">Discover premium companionship services</p>
      </div>

      {/* Search and Filters */}
      <div className="card-premium mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, bio, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <button onClick={handleSearch} className="btn-primary">
            Search
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="City or area"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Rate (tokens/hour)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.min_rate}
                  onChange={(e) => setFilters({ ...filters, min_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Rate (tokens/hour)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={filters.max_rate}
                  onChange={(e) => setFilters({ ...filters, max_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Services</label>
                <input
                  type="text"
                  placeholder="e.g., companionship, dinner date"
                  value={filters.services}
                  onChange={(e) => setFilters({ ...filters, services: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Languages</label>
                <input
                  type="text"
                  placeholder="e.g., English, Spanish"
                  value={filters.languages}
                  onChange={(e) => setFilters({ ...filters, languages: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available_today"
                  checked={filters.available_today}
                  onChange={(e) => setFilters({ ...filters, available_today: e.target.checked })}
                  className="w-4 h-4 text-sensual-red bg-gray-800 border-gray-700 rounded focus:ring-sensual-red"
                />
                <label htmlFor="available_today" className="ml-2 text-sm text-white">
                  Available today
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Grid */}
      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div key={provider.id} className="card-premium hover:border-sensual-red/50 transition-colors">
              {/* Provider Image */}
              <div className="relative h-48 bg-gray-800 rounded-lg mb-4 overflow-hidden">
                {provider.images.length > 0 ? (
                  <img
                    src={provider.images[0]}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserGroupIcon className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                
                {/* Status Indicators */}
                <div className="absolute top-3 left-3 flex space-x-2">
                  {provider.verification_status === 'approved' && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <CheckBadgeIcon className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                  {provider.is_available_now && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      Available
                    </span>
                  )}
                </div>
              </div>

              {/* Provider Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">{provider.name}</h3>
                  <p className="text-gray-400 text-sm flex items-center mt-1">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {provider.location}
                  </p>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">{provider.bio}</p>

                {/* Rating */}
                {provider.total_ratings > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="flex">{renderStars(provider.avg_rating)}</div>
                    <span className="text-sm text-gray-400">
                      {provider.avg_rating.toFixed(1)} ({provider.total_ratings} reviews)
                    </span>
                  </div>
                )}

                {/* Services */}
                {provider.services_offered.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {provider.services_offered.slice(0, 3).map((service, index) => (
                      <span key={index} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                        {service}
                      </span>
                    ))}
                    {provider.services_offered.length > 3 && (
                      <span className="text-xs text-gray-400">+{provider.services_offered.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Rate and Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="flex items-center text-sensual-red font-semibold">
                    <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                    {provider.hourly_rate} tokens/hr
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link
                      to={`/chat?provider=${provider.user_id}`}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Send message"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400" />
                    </Link>
                    
                    {user?.role === 'seeker' && (
                      <button
                        onClick={() => {
                          setSelectedProvider(provider);
                          setShowBookingModal(true);
                        }}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Book Now
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
          <UserGroupIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No providers found</h3>
          <p className="text-gray-400 mb-4">Try adjusting your search criteria or filters</p>
          <button onClick={() => {
            setSearchQuery('');
            setFilters({
              location: '',
              min_rate: '',
              max_rate: '',
              services: '',
              languages: '',
              available_today: false
            });
            fetchProviders();
          }} className="btn-secondary">
            Clear filters
          </button>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Book with {selectedProvider.name}</h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={bookingData.start_time}
                    onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duration (hours) *</label>
                  <select
                    value={bookingData.duration_hours}
                    onChange={(e) => setBookingData({ ...bookingData, duration_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 12].map(hours => (
                      <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Service Type *</label>
                  <select
                    value={bookingData.booking_type}
                    onChange={(e) => setBookingData({ ...bookingData, booking_type: e.target.value as 'incall' | 'outcall' })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  >
                    <option value="outcall">Outcall (Visit your location)</option>
                    <option value="incall">Incall (Visit provider's location)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="Meeting location (optional)"
                    value={bookingData.location}
                    onChange={(e) => setBookingData({ ...bookingData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Special Requests</label>
                  <textarea
                    placeholder="Any special requests or notes (optional)"
                    value={bookingData.special_requests}
                    onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                {/* Cost Summary */}
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Base cost ({bookingData.duration_hours}h × {selectedProvider.hourly_rate} tokens)</span>
                    <span className="text-white">{(bookingData.duration_hours || 1) * selectedProvider.hourly_rate} tokens</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Processing fee (5%)</span>
                    <span className="text-white">{Math.floor(((bookingData.duration_hours || 1) * selectedProvider.hourly_rate) * 0.05)} tokens</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t border-gray-700 pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-sensual-red">{calculateTotalCost()} tokens</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBooking}
                    className="flex-1 btn-primary"
                  >
                    Confirm Booking
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

export default Providers;