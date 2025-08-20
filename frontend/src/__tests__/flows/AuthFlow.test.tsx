import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { renderWithProviders, mockSeeker } from '../utils/testUtils';

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock components for the auth flow
const AuthFlowTest: React.FC = () => {
  const [view, setView] = React.useState<'login' | 'register' | 'dashboard'>('login');
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/auth/login', { email, password });
      setUser(response.data.user);
      setView('dashboard');
    } catch (error) {
      console.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/auth/register', userData);
      setUser(response.data);
      setView('dashboard');
    } catch (error) {
      console.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    setUser(null);
    setView('login');
  };
  
  return (
    <div>
      <div data-testid="current-view">{view}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
      
      {view === 'login' && (
        <div data-testid="login-form">
          <h2>Login</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleLogin(
              formData.get('email') as string,
              formData.get('password') as string
            );
          }}>
            <input 
              name="email" 
              type="email" 
              placeholder="Email"
              data-testid="email-input"
              required
            />
            <input 
              name="password" 
              type="password" 
              placeholder="Password"
              data-testid="password-input"
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <button onClick={() => setView('register')}>Switch to Register</button>
        </div>
      )}
      
      {view === 'register' && (
        <div data-testid="register-form">
          <h2>Register</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleRegister({
              email: formData.get('email'),
              password: formData.get('password'),
              role: formData.get('role'),
              age_confirmed: true,
              phone: formData.get('phone')
            });
          }}>
            <input 
              name="email" 
              type="email" 
              placeholder="Email"
              data-testid="register-email-input"
              required
            />
            <input 
              name="password" 
              type="password" 
              placeholder="Password"
              data-testid="register-password-input"
              required
            />
            <input 
              name="phone" 
              type="tel" 
              placeholder="Phone"
              data-testid="phone-input"
              required
            />
            <select name="role" data-testid="role-select" required>
              <option value="">Select Role</option>
              <option value="seeker">Seeker</option>
              <option value="provider">Provider</option>
            </select>
            <label>
              <input type="checkbox" name="age_confirmed" required />
              I confirm I am 18+ years old
            </label>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <button onClick={() => setView('login')}>Switch to Login</button>
        </div>
      )}
      
      {view === 'dashboard' && user && (
        <div data-testid="dashboard">
          <h2>Welcome, {user.email}!</h2>
          <p>Role: {user.role}</p>
          <p>Status: Logged in successfully</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
};

describe('Complete Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('user can complete login flow successfully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockResolvedValue({ 
      data: {
        access_token: 'mock-token',
        token_type: 'bearer',
        user: mockSeeker
      }
    });
    
    renderWithProviders(<AuthFlowTest />);
    
    // Should start with login form
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    
    // Fill in login form
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    });
    
    // Should call login API
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    // Should navigate to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('dashboard');
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome, test_seeker@example.com!')).toBeInTheDocument();
      expect(screen.getByText('Role: seeker')).toBeInTheDocument();
    });
  });

  test('user can complete registration flow successfully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockResolvedValue({ data: mockSeeker });
    
    renderWithProviders(<AuthFlowTest />);
    
    // Switch to register view
    const switchToRegisterButton = screen.getByRole('button', { name: /switch to register/i });
    await user.click(switchToRegisterButton);
    
    expect(screen.getByTestId('current-view')).toHaveTextContent('register');
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    
    // Fill in registration form
    const emailInput = screen.getByTestId('register-email-input');
    const passwordInput = screen.getByTestId('register-password-input');
    const phoneInput = screen.getByTestId('phone-input');
    const roleSelect = screen.getByTestId('role-select');
    const ageCheckbox = screen.getByRole('checkbox');
    const registerButton = screen.getByRole('button', { name: /register/i });
    
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'securepass123');
    await user.type(phoneInput, '+1234567890');
    await user.selectOptions(roleSelect, 'seeker');
    await user.click(ageCheckbox);
    await user.click(registerButton);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    });
    
    // Should call registration API
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
        email: 'newuser@example.com',
        password: 'securepass123',
        phone: '+1234567890',
        role: 'seeker',
        age_confirmed: true
      });
    });
    
    // Should navigate to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('dashboard');
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  test('user can switch between login and register views', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<AuthFlowTest />);
    
    // Should start with login
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
    
    // Switch to register
    const switchToRegisterButton = screen.getByRole('button', { name: /switch to register/i });
    await user.click(switchToRegisterButton);
    
    expect(screen.getByTestId('current-view')).toHaveTextContent('register');
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    
    // Switch back to login
    const switchToLoginButton = screen.getByRole('button', { name: /switch to login/i });
    await user.click(switchToLoginButton);
    
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  test('user can logout and return to login', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockResolvedValue({ 
      data: {
        access_token: 'mock-token',
        token_type: 'bearer',
        user: mockSeeker
      }
    });
    
    renderWithProviders(<AuthFlowTest />);
    
    // Login first
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // Should be on dashboard
    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('dashboard');
    });
    
    // Logout
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    // Should return to login
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  test('handles login failure gracefully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockRejectedValue(new Error('Invalid credentials'));
    
    renderWithProviders(<AuthFlowTest />);
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });
    
    // Should remain on login view after failure
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  test('handles registration failure gracefully', async () => {
    const user = userEvent.setup();
    
    mockAxios.post.mockRejectedValue(new Error('Email already exists'));
    
    renderWithProviders(<AuthFlowTest />);
    
    // Switch to register
    const switchToRegisterButton = screen.getByRole('button', { name: /switch to register/i });
    await user.click(switchToRegisterButton);
    
    // Fill and submit registration form
    const emailInput = screen.getByTestId('register-email-input');
    const passwordInput = screen.getByTestId('register-password-input');
    const phoneInput = screen.getByTestId('phone-input');
    const roleSelect = screen.getByTestId('role-select');
    const ageCheckbox = screen.getByRole('checkbox');
    const registerButton = screen.getByRole('button', { name: /register/i });
    
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(phoneInput, '+1234567890');
    await user.selectOptions(roleSelect, 'seeker');
    await user.click(ageCheckbox);
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });
    
    // Should remain on register view after failure
    expect(screen.getByTestId('current-view')).toHaveTextContent('register');
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
  });

  test('form validation prevents submission with empty fields', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<AuthFlowTest />);
    
    // Try to submit empty login form
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    // API should not be called
    expect(mockAxios.post).not.toHaveBeenCalled();
    
    // Should still be on login view
    expect(screen.getByTestId('current-view')).toHaveTextContent('login');
  });
});