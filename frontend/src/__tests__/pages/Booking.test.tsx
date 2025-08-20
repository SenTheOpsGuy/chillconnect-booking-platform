import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker, mockProvider, mockBooking } from '../utils/testUtils';
import Booking from '../../pages/Booking';

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('Booking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.get.mockResolvedValue({ data: [mockBooking] });
  });

  test('renders booking list for seeker', async () => {
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    // Wait for bookings to load
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    expect(mockAxios.get).toHaveBeenCalledWith('/bookings/my-bookings');
  });

  test('renders booking list for provider', async () => {
    renderWithProviders(<Booking />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    expect(mockAxios.get).toHaveBeenCalledWith('/bookings/my-bookings');
  });

  test('displays booking cards with correct information', async () => {
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      // Check for booking details
      expect(screen.getByText('Test Hotel')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
      expect(screen.getByText('460 tokens')).toBeInTheDocument();
    });
  });

  test('filters bookings by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find and click the status filter dropdown
    const statusFilter = screen.getByDisplayValue('All Bookings');
    await user.selectOptions(statusFilter, 'confirmed');
    
    expect(statusFilter).toHaveValue('confirmed');
  });

  test('opens booking detail modal when clicking view details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Look for a view details button or clickable element
    const viewButton = screen.getByRole('button', { name: /view/i });
    await user.click(viewButton);
    
    // Should open detail modal
    expect(screen.getByText('Booking Details')).toBeInTheDocument();
  });

  test('allows provider to generate OTP for service start', async () => {
    const user = userEvent.setup();
    mockAxios.post.mockResolvedValue({ 
      data: { success: true, message: 'OTP sent to your phone number' }
    });
    
    renderWithProviders(<Booking />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find generate OTP button
    const generateOtpButton = screen.getByRole('button', { name: /generate otp/i });
    await user.click(generateOtpButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        `/bookings/${mockBooking.id}/generate-start-otp`
      );
    });
  });

  test('allows seeker to view start service OTP', async () => {
    const user = userEvent.setup();
    mockAxios.get.mockResolvedValue({ 
      data: { success: true, code: '123456', expires_in_minutes: 30 }
    });
    
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find view OTP button
    const viewOtpButton = screen.getByRole('button', { name: /view otp/i });
    await user.click(viewOtpButton);
    
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith(
        `/bookings/${mockBooking.id}/seeker-start-otp`
      );
    });
    
    // Should show OTP modal
    expect(screen.getByText('Service Start OTP')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
  });

  test('allows provider to update booking status', async () => {
    const user = userEvent.setup();
    mockAxios.put.mockResolvedValue({ 
      data: { ...mockBooking, status: 'in_progress' }
    });
    
    renderWithProviders(<Booking />, { user: mockProvider });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find status update button
    const updateStatusButton = screen.getByRole('button', { name: /start service/i });
    await user.click(updateStatusButton);
    
    // Should open OTP modal
    expect(screen.getByText('Enter OTP to Start Service')).toBeInTheDocument();
    
    // Enter OTP and submit
    const otpInput = screen.getByPlaceholderText(/enter.*otp/i);
    await user.type(otpInput, '123456');
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(mockAxios.put).toHaveBeenCalledWith(
        `/bookings/${mockBooking.id}/status`,
        { status: 'in_progress', otp_code: '123456' }
      );
    });
  });

  test('shows loading state while fetching bookings', () => {
    // Mock a delayed response
    mockAxios.get.mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    mockAxios.get.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      // Should not crash and may show an error message
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
  });

  test('shows appropriate actions based on booking status', async () => {
    const pendingBooking = { ...mockBooking, status: 'pending' as const };
    mockAxios.get.mockResolvedValue({ data: [pendingBooking] });
    
    renderWithProviders(<Booking />, { user: mockProvider });
    
    await waitFor(() => {
      // Provider should see confirm/reject options for pending bookings
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  test('displays correct booking information in detail modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Open booking detail
    const viewButton = screen.getByRole('button', { name: /view/i });
    await user.click(viewButton);
    
    // Check for detailed information
    expect(screen.getByText('Booking Details')).toBeInTheDocument();
    expect(screen.getByText('Test Hotel')).toBeInTheDocument();
    expect(screen.getByText('outcall')).toBeInTheDocument();
    expect(screen.getByText('460')).toBeInTheDocument(); // tokens
  });

  test('allows booking cancellation for appropriate statuses', async () => {
    const user = userEvent.setup();
    const pendingBooking = { ...mockBooking, status: 'pending' as const };
    mockAxios.get.mockResolvedValue({ data: [pendingBooking] });
    mockAxios.delete.mockResolvedValue({ 
      data: { success: true, refund_amount: 460 }
    });
    
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(mockAxios.delete).toHaveBeenCalledWith(`/bookings/${pendingBooking.id}`);
    });
  });

  test('shows rating modal for completed bookings', async () => {
    const user = userEvent.setup();
    const completedBooking = { ...mockBooking, status: 'completed' as const };
    mockAxios.get.mockResolvedValue({ data: [completedBooking] });
    
    renderWithProviders(<Booking />, { user: mockSeeker });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
    
    // Find rate button
    const rateButton = screen.getByRole('button', { name: /rate/i });
    await user.click(rateButton);
    
    // Should show rating modal
    expect(screen.getByText('Rate Your Experience')).toBeInTheDocument();
  });
});