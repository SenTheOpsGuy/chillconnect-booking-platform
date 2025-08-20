import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker, mockProvider, mockBooking } from '../utils/testUtils';

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock components for the booking flow
const BookingFlowTest: React.FC = () => {
  const [step, setStep] = React.useState(1);
  const [bookingData, setBookingData] = React.useState<any>(null);
  
  const handleCreateBooking = async () => {
    try {
      const response = await axios.post('/bookings/create', {
        provider_id: mockProvider.id,
        start_time: '2024-12-25T18:00:00.000Z',
        duration_hours: 2,
        booking_type: 'outcall',
        location: 'Test Hotel'
      });
      setBookingData(response.data);
      setStep(2);
    } catch (error) {
      console.error('Booking creation failed');
    }
  };
  
  const handleConfirmBooking = async () => {
    try {
      await axios.put(`/bookings/${bookingData.id}/status`, { status: 'confirmed' });
      setStep(3);
    } catch (error) {
      console.error('Booking confirmation failed');
    }
  };
  
  const handleGenerateOTP = async () => {
    try {
      await axios.get(`/bookings/${bookingData.id}/seeker-start-otp`);
      setStep(4);
    } catch (error) {
      console.error('OTP generation failed');
    }
  };
  
  return (
    <div>
      <div data-testid="current-step">Step {step}</div>
      
      {step === 1 && (
        <div data-testid="booking-creation">
          <h2>Create Booking</h2>
          <button onClick={handleCreateBooking}>Create Booking</button>
        </div>
      )}
      
      {step === 2 && bookingData && (
        <div data-testid="booking-confirmation">
          <h2>Booking Created</h2>
          <p>Booking ID: {bookingData.id}</p>
          <p>Status: {bookingData.status}</p>
          <button onClick={handleConfirmBooking}>Confirm Booking</button>
        </div>
      )}
      
      {step === 3 && (
        <div data-testid="booking-confirmed">
          <h2>Booking Confirmed</h2>
          <p>Your booking has been confirmed!</p>
          <button onClick={handleGenerateOTP}>Generate Start OTP</button>
        </div>
      )}
      
      {step === 4 && (
        <div data-testid="otp-generated">
          <h2>OTP Generated</h2>
          <p>Share this OTP with your provider to start the service</p>
          <div data-testid="otp-code">123456</div>
        </div>
      )}
    </div>
  );
};

describe('Complete Booking Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('seeker can complete entire booking flow successfully', async () => {
    const user = userEvent.setup();
    
    // Mock API responses for each step
    mockAxios.post.mockResolvedValue({ 
      data: { ...mockBooking, id: 1, status: 'pending' }
    });
    mockAxios.put.mockResolvedValue({ 
      data: { ...mockBooking, id: 1, status: 'confirmed' }
    });
    mockAxios.get.mockResolvedValue({ 
      data: { success: true, code: '123456', expires_in_minutes: 30 }
    });
    
    renderWithProviders(<BookingFlowTest />, { user: mockSeeker });
    
    // Step 1: Create booking
    expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
    expect(screen.getByTestId('booking-creation')).toBeInTheDocument();
    
    const createButton = screen.getByRole('button', { name: /create booking/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith('/bookings/create', {
        provider_id: mockProvider.id,
        start_time: '2024-12-25T18:00:00.000Z',
        duration_hours: 2,
        booking_type: 'outcall',
        location: 'Test Hotel'
      });
    });
    
    // Step 2: Booking created, waiting for confirmation
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
      expect(screen.getByTestId('booking-confirmation')).toBeInTheDocument();
      expect(screen.getByText('Booking ID: 1')).toBeInTheDocument();
      expect(screen.getByText('Status: pending')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(mockAxios.put).toHaveBeenCalledWith('/bookings/1/status', { 
        status: 'confirmed' 
      });
    });
    
    // Step 3: Booking confirmed
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
      expect(screen.getByTestId('booking-confirmed')).toBeInTheDocument();
      expect(screen.getByText('Your booking has been confirmed!')).toBeInTheDocument();
    });
    
    const generateOtpButton = screen.getByRole('button', { name: /generate start otp/i });
    await user.click(generateOtpButton);
    
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith('/bookings/1/seeker-start-otp');
    });
    
    // Step 4: OTP generated
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 4');
      expect(screen.getByTestId('otp-generated')).toBeInTheDocument();
      expect(screen.getByTestId('otp-code')).toHaveTextContent('123456');
      expect(screen.getByText('Share this OTP with your provider')).toBeInTheDocument();
    });
  });

  test('handles booking creation error gracefully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockRejectedValue(new Error('Insufficient tokens'));
    
    renderWithProviders(<BookingFlowTest />, { user: mockSeeker });
    
    const createButton = screen.getByRole('button', { name: /create booking/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });
    
    // Should remain on step 1 after error
    expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
    expect(screen.getByTestId('booking-creation')).toBeInTheDocument();
  });

  test('handles booking confirmation error gracefully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockResolvedValue({ 
      data: { ...mockBooking, id: 1, status: 'pending' }
    });
    mockAxios.put.mockRejectedValue(new Error('Provider rejected booking'));
    
    renderWithProviders(<BookingFlowTest />, { user: mockSeeker });
    
    // Create booking first
    const createButton = screen.getByRole('button', { name: /create booking/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
    });
    
    // Try to confirm booking
    const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(mockAxios.put).toHaveBeenCalled();
    });
    
    // Should remain on step 2 after error
    expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
  });

  test('handles OTP generation error gracefully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockResolvedValue({ 
      data: { ...mockBooking, id: 1, status: 'pending' }
    });
    mockAxios.put.mockResolvedValue({ 
      data: { ...mockBooking, id: 1, status: 'confirmed' }
    });
    mockAxios.get.mockRejectedValue(new Error('OTP generation failed'));
    
    renderWithProviders(<BookingFlowTest />, { user: mockSeeker });
    
    // Complete booking creation and confirmation
    const createButton = screen.getByRole('button', { name: /create booking/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
    });
    
    // Try to generate OTP
    const generateOtpButton = screen.getByRole('button', { name: /generate start otp/i });
    await user.click(generateOtpButton);
    
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalled();
    });
    
    // Should remain on step 3 after error
    expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
  });
});