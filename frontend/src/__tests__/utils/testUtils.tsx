import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock user data for testing
export const mockSeeker = {
  id: 1,
  email: 'test_seeker@example.com',
  role: 'seeker',
  phone: '+1234567890',
  is_active: true,
  email_verified: true,
  age_confirmed: true,
  created_at: '2024-01-01T00:00:00.000Z'
};

export const mockProvider = {
  id: 2,
  email: 'test_provider@example.com',
  role: 'provider',
  phone: '+1234567891',
  is_active: true,
  email_verified: true,
  age_confirmed: true,
  created_at: '2024-01-01T00:00:00.000Z'
};

export const mockBooking = {
  id: 1,
  seeker_id: 1,
  provider_id: 2,
  start_time: '2024-12-25T18:00:00.000Z',
  duration_hours: 2,
  total_tokens: 460,
  booking_type: 'outcall',
  status: 'confirmed',
  location: 'Test Hotel',
  special_requests: 'Test request',
  created_at: '2024-01-01T00:00:00.000Z',
  provider: mockProvider,
  seeker: mockSeeker
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  user?: typeof mockSeeker | typeof mockProvider | null;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    user = null,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  // Mock AuthContext value
  const mockAuthValue = {
    user,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    loading: false,
    token: user ? 'mock-token' : null
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <div>
        {children}
      </div>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper functions for common test scenarios
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockApiResponse = (data: any, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
});

export const mockApiError = (message: string, status = 400) => ({
  response: {
    data: { detail: message },
    status,
    statusText: 'Bad Request'
  }
});