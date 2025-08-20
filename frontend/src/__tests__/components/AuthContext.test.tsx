import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker, mockApiResponse, mockApiError } from '../utils/testUtils';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const mockAxios = axios as jest.Mocked<typeof axios>;

// Test component that uses AuthContext
const TestComponent: React.FC = () => {
  const { user, login, logout, register, loading, token } = useAuth();
  
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <div data-testid="user-role">{user?.role || 'No role'}</div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="token">{token ? 'Has token' : 'No token'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => register({
        email: 'new@example.com',
        password: 'password',
        role: 'seeker',
        age_confirmed: true
      })}>Register</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('provides initial state with no user', () => {
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
    expect(screen.getByTestId('user-role')).toHaveTextContent('No role');
    expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    expect(screen.getByTestId('token')).toHaveTextContent('No token');
  });

  test('handles successful login', async () => {
    const user = userEvent.setup();
    const loginResponse = {
      access_token: 'mock-token',
      token_type: 'bearer',
      user: mockSeeker
    };
    
    mockAxios.post.mockResolvedValue(mockApiResponse(loginResponse));
    
    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test_seeker@example.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('seeker');
      expect(screen.getByTestId('token')).toHaveTextContent('Has token');
    });
    
    expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
    
    // Check if token is stored in localStorage
    expect(localStorage.getItem('token')).toBe('mock-token');
  });

  test('handles failed login', async () => {
    const user = userEvent.setup();
    mockAxios.post.mockRejectedValue(mockApiError('Invalid credentials', 401));
    
    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
      expect(screen.getByTestId('token')).toHaveTextContent('No token');
    });
    
    // Token should not be stored
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('handles successful registration', async () => {
    const user = userEvent.setup();
    mockAxios.post.mockResolvedValue(mockApiResponse(mockSeeker));
    
    renderWithProviders(<TestComponent />);
    
    const registerButton = screen.getByRole('button', { name: /register/i });
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password',
        role: 'seeker',
        age_confirmed: true
      });
    });
  });

  test('handles logout', async () => {
    const user = userEvent.setup();
    
    // Set up initial logged-in state
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockSeeker));
    
    renderWithProviders(<TestComponent />);
    
    // Initially should have user data
    expect(screen.getByTestId('user-email')).toHaveTextContent('test_seeker@example.com');
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
      expect(screen.getByTestId('token')).toHaveTextContent('No token');
    });
    
    // Token should be removed from localStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('loads user from localStorage on initialization', () => {
    // Set up localStorage with user data
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockSeeker));
    
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('test_seeker@example.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('seeker');
    expect(screen.getByTestId('token')).toHaveTextContent('Has token');
  });

  test('shows loading state during async operations', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockAxios.post.mockReturnValue(loginPromise);
    
    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    // Should show loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    
    // Resolve the login
    resolveLogin!(mockApiResponse({
      access_token: 'mock-token',
      token_type: 'bearer',
      user: mockSeeker
    }));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });
  });

  test('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    mockAxios.post.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });
  });

  test('handles registration with validation errors', async () => {
    const user = userEvent.setup();
    mockAxios.post.mockRejectedValue(mockApiError('Email already exists', 400));
    
    renderWithProviders(<TestComponent />);
    
    const registerButton = screen.getByRole('button', { name: /register/i });
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });
    
    // Should remain in no-user state
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
  });
});