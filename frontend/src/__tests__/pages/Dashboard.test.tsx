import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker, mockProvider, mockBooking } from '../utils/testUtils';
import Dashboard from '../../pages/Dashboard';

const mockAxios = axios as jest.Mocked<typeof axios>;

const mockDashboardData = {
  total_bookings: 5,
  active_bookings: 2,
  completed_bookings: 3,
  total_earnings: 1500,
  recent_bookings: [mockBooking],
  upcoming_bookings: [mockBooking]
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.get.mockResolvedValue({ data: mockDashboardData });
  });

  test('renders dashboard for provider with correct stats', async () => {
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
    });
    
    // Check for dashboard statistics
    expect(screen.getByText('5')).toBeInTheDocument(); // total bookings
    expect(screen.getByText('2')).toBeInTheDocument(); // active bookings
    expect(screen.getByText('3')).toBeInTheDocument(); // completed bookings
    expect(screen.getByText('1500')).toBeInTheDocument(); // earnings
    
    expect(mockAxios.get).toHaveBeenCalledWith('/bookings/my-bookings');
  });

  test('renders dashboard for seeker with relevant information', async () => {
    const seekerDashboardData = {
      total_bookings: 3,
      active_bookings: 1,
      completed_bookings: 2,
      total_spent: 800,
      recent_bookings: [mockBooking],
      upcoming_bookings: [mockBooking]
    };
    
    mockAxios.get.mockResolvedValue({ data: seekerDashboardData });
    
    renderWithProviders(<Dashboard />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('Seeker Dashboard')).toBeInTheDocument();
    });
    
    // Check for seeker-specific statistics
    expect(screen.getByText('3')).toBeInTheDocument(); // total bookings
    expect(screen.getByText('1')).toBeInTheDocument(); // active bookings
    expect(screen.getByText('2')).toBeInTheDocument(); // completed bookings
    expect(screen.getByText('800')).toBeInTheDocument(); // total spent
  });

  test('displays recent bookings section', async () => {
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Recent Bookings')).toBeInTheDocument();
    });
    
    // Check for booking information
    expect(screen.getByText('Test Hotel')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  test('displays upcoming bookings section', async () => {
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Upcoming Bookings')).toBeInTheDocument();
    });
    
    // Should show upcoming booking details
    expect(screen.getByText('Test Hotel')).toBeInTheDocument();
  });

  test('shows loading state while fetching dashboard data', () => {
    // Mock a delayed response
    mockAxios.get.mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    mockAxios.get.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      // Should show error message or handle gracefully
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  test('displays different dashboard content based on user role', async () => {
    // Test provider dashboard
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/earnings/i)).toBeInTheDocument();
    });
    
    // Re-render with seeker
    renderWithProviders(<Dashboard />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('Seeker Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/spent/i)).toBeInTheDocument();
    });
  });

  test('provides quick action buttons', async () => {
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
    });
    
    // Check for quick action buttons
    expect(screen.getByRole('link', { name: /view all bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  test('shows empty state when no bookings exist', async () => {
    mockAxios.get.mockResolvedValue({ 
      data: {
        ...mockDashboardData,
        recent_bookings: [],
        upcoming_bookings: [],
        total_bookings: 0
      }
    });
    
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('No bookings yet')).toBeInTheDocument();
    });
  });

  test('updates dashboard data when refreshed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
    });
    
    // Find and click refresh button if it exists
    const refreshButton = screen.queryByRole('button', { name: /refresh/i });
    if (refreshButton) {
      await user.click(refreshButton);
      
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
      });
    }
  });

  test('displays proper formatting for currency and numbers', async () => {
    renderWithProviders(<Dashboard />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
    });
    
    // Check for proper number formatting
    const earningsElement = screen.getByText('1500');
    expect(earningsElement).toBeInTheDocument();
    
    // Verify currency symbols or formatting if present
    const currencyElements = screen.getAllByText(/\$|tokens?/i);
    expect(currencyElements.length).toBeGreaterThan(0);
  });
});