import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker, mockProvider, mockBooking } from '../utils/testUtils';

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock component for OTP flow testing
const OTPFlowTest: React.FC<{ userRole: 'seeker' | 'provider' }> = ({ userRole }) => {
  const [step, setStep] = React.useState(1);
  const [otpCode, setOtpCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  
  // Seeker: Generate OTP for provider to use
  const handleGenerateSeekerOTP = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`/bookings/${mockBooking.id}/seeker-start-otp`);
      setOtpCode(response.data.code);
      setStep(2);
    } catch (err) {
      setError('Failed to generate OTP');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Provider: Generate OTP via SMS
  const handleGenerateProviderOTP = async () => {
    setIsLoading(true);
    setError('');
    try {
      await axios.post(`/bookings/${mockBooking.id}/generate-start-otp`);
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Provider: Verify OTP and start service
  const handleVerifyOTP = async (enteredOtp: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.put(`/bookings/${mockBooking.id}/status`, {
        status: 'in_progress',
        otp_code: enteredOtp
      });
      setStep(3);
    } catch (err) {
      setError('Invalid OTP or verification failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <div data-testid="current-step">Step {step}</div>
      <div data-testid="user-role">{userRole}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
      {error && <div data-testid="error-message">{error}</div>}
      
      {/* Seeker Flow */}
      {userRole === 'seeker' && (
        <>
          {step === 1 && (
            <div data-testid="seeker-step1">
              <h2>Generate OTP for Provider</h2>
              <p>Generate a one-time code for your provider to start the service</p>
              <button 
                onClick={handleGenerateSeekerOTP}
                disabled={isLoading}
                data-testid="generate-seeker-otp-btn"
              >
                {isLoading ? 'Generating...' : 'Generate OTP'}
              </button>
            </div>
          )}
          
          {step === 2 && (
            <div data-testid="seeker-step2">
              <h2>Share This OTP</h2>
              <p>Share this code with your provider to start the appointment:</p>
              <div data-testid="otp-display" className="otp-code">{otpCode}</div>
              <p>This code will expire in 30 minutes</p>
              <div data-testid="sharing-instructions">
                <h3>Instructions:</h3>
                <ul>
                  <li>Share this 6-digit code with your provider</li>
                  <li>Provider will enter this code to start the service</li>
                  <li>Do not share this code with anyone else</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Provider Flow */}
      {userRole === 'provider' && (
        <>
          {step === 1 && (
            <div data-testid="provider-step1">
              <h2>Start Service</h2>
              <p>Choose how to get your OTP:</p>
              <button 
                onClick={handleGenerateProviderOTP}
                disabled={isLoading}
                data-testid="generate-provider-otp-btn"
              >
                {isLoading ? 'Sending...' : 'Send OTP to My Phone'}
              </button>
              <p>OR ask seeker for their generated OTP</p>
              <button 
                onClick={() => setStep(2)}
                data-testid="use-seeker-otp-btn"
              >
                I Have Seeker's OTP
              </button>
            </div>
          )}
          
          {step === 2 && (
            <div data-testid="provider-step2">
              <h2>Enter OTP to Start Service</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const otp = formData.get('otp') as string;
                handleVerifyOTP(otp);
              }}>
                <input 
                  name="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  data-testid="otp-input"
                  required
                />
                <button 
                  type="submit"
                  disabled={isLoading}
                  data-testid="verify-otp-btn"
                >
                  {isLoading ? 'Verifying...' : 'Start Service'}
                </button>
              </form>
            </div>
          )}
          
          {step === 3 && (
            <div data-testid="provider-step3">
              <h2>Service Started!</h2>
              <p>OTP verified successfully. You can now begin the service.</p>
              <div data-testid="service-status">Status: In Progress</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

describe('OTP Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Seeker OTP Flow', () => {
    test('seeker can successfully generate and display OTP', async () => {
      const user = userEvent.setup();
      
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          code: '123456',
          expires_in_minutes: 30
        }
      });
      
      renderWithProviders(<OTPFlowTest userRole="seeker" />, { user: mockSeeker });
      
      // Should start on step 1
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
      expect(screen.getByTestId('seeker-step1')).toBeInTheDocument();
      expect(screen.getByText('Generate OTP for Provider')).toBeInTheDocument();
      
      // Generate OTP
      const generateButton = screen.getByTestId('generate-seeker-otp-btn');
      await user.click(generateButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
      });
      
      // Should call API
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(`/bookings/${mockBooking.id}/seeker-start-otp`);
      });
      
      // Should move to step 2 and display OTP
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
        expect(screen.getByTestId('seeker-step2')).toBeInTheDocument();
        expect(screen.getByTestId('otp-display')).toHaveTextContent('123456');
        expect(screen.getByText('This code will expire in 30 minutes')).toBeInTheDocument();
        expect(screen.getByTestId('sharing-instructions')).toBeInTheDocument();
      });
    });

    test('seeker OTP generation handles errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockAxios.get.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<OTPFlowTest userRole="seeker" />, { user: mockSeeker });
      
      const generateButton = screen.getByTestId('generate-seeker-otp-btn');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to generate OTP');
      });
      
      // Should remain on step 1
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1');
    });
  });

  describe('Provider OTP Flow', () => {
    test('provider can generate OTP via SMS', async () => {
      const user = userEvent.setup();
      
      mockAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'OTP sent to your phone number'
        }
      });
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      expect(screen.getByTestId('provider-step1')).toBeInTheDocument();
      
      const generateButton = screen.getByTestId('generate-provider-otp-btn');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(`/bookings/${mockBooking.id}/generate-start-otp`);
      });
      
      // Should move to step 2
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
        expect(screen.getByTestId('provider-step2')).toBeInTheDocument();
      });
    });

    test('provider can use seeker-generated OTP', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      // Skip to using seeker's OTP
      const useSeekerOtpButton = screen.getByTestId('use-seeker-otp-btn');
      await user.click(useSeekerOtpButton);
      
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
      expect(screen.getByTestId('provider-step2')).toBeInTheDocument();
    });

    test('provider can successfully verify OTP and start service', async () => {
      const user = userEvent.setup();
      
      mockAxios.put.mockResolvedValue({
        data: {
          ...mockBooking,
          status: 'in_progress'
        }
      });
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      // Skip to OTP verification step
      const useSeekerOtpButton = screen.getByTestId('use-seeker-otp-btn');
      await user.click(useSeekerOtpButton);
      
      // Enter OTP and verify
      const otpInput = screen.getByTestId('otp-input');
      const verifyButton = screen.getByTestId('verify-otp-btn');
      
      await user.type(otpInput, '123456');
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(mockAxios.put).toHaveBeenCalledWith(`/bookings/${mockBooking.id}/status`, {
          status: 'in_progress',
          otp_code: '123456'
        });
      });
      
      // Should move to step 3
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
        expect(screen.getByTestId('provider-step3')).toBeInTheDocument();
        expect(screen.getByText('Service Started!')).toBeInTheDocument();
        expect(screen.getByTestId('service-status')).toHaveTextContent('Status: In Progress');
      });
    });

    test('provider OTP verification handles invalid OTP', async () => {
      const user = userEvent.setup();
      
      mockAxios.put.mockRejectedValue(new Error('Invalid OTP'));
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      // Skip to OTP verification step
      const useSeekerOtpButton = screen.getByTestId('use-seeker-otp-btn');
      await user.click(useSeekerOtpButton);
      
      // Enter invalid OTP
      const otpInput = screen.getByTestId('otp-input');
      const verifyButton = screen.getByTestId('verify-otp-btn');
      
      await user.type(otpInput, '000000');
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid OTP or verification failed');
      });
      
      // Should remain on step 2
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
    });

    test('OTP input validation works correctly', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      // Skip to OTP verification step
      const useSeekerOtpButton = screen.getByTestId('use-seeker-otp-btn');
      await user.click(useSeekerOtpButton);
      
      const otpInput = screen.getByTestId('otp-input') as HTMLInputElement;
      
      // Should accept only 6 digits
      await user.type(otpInput, '1234567890');
      expect(otpInput.value).toBe('123456');
      
      // Clear and test
      await user.clear(otpInput);
      await user.type(otpInput, 'abc123');
      expect(otpInput.value).toBe('123'); // Only numbers should be entered
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<OTPFlowTest userRole="seeker" />, { user: mockSeeker });
      
      const generateButton = screen.getByTestId('generate-seeker-otp-btn');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
      });
    });

    test('handles API error responses', async () => {
      const user = userEvent.setup();
      
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: 'Booking not found' }
        }
      });
      
      renderWithProviders(<OTPFlowTest userRole="provider" />, { user: mockProvider });
      
      const generateButton = screen.getByTestId('generate-provider-otp-btn');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to send OTP');
      });
    });
  });
});