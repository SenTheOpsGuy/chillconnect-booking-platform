import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/testUtils';
import Login from '../../pages/auth/Login';

// Mock the useAuth hook
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
    token: null
  })
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  )
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all required elements', () => {
    renderWithProviders(<Login />);
    
    // Check for logo and title
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your ChillConnect account')).toBeInTheDocument();
    
    // Check for form elements
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check for links
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up here/i)).toBeInTheDocument();
    expect(screen.getByText(/back to home/i)).toBeInTheDocument();
  });

  test('allows user to input email and password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  test('toggles password visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);
    
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');
    
    // Click to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    
    // Click to hide password again
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  test('validates required fields on form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Try to submit without filling fields
    await user.click(submitButton);
    
    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toBeInvalid();
    expect(passwordInput).toBeInvalid();
  });

  test('calls login function with correct credentials on form submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);
    
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('navigates to dashboard on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);
    
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('does not navigate on failed login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(false);
    
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows loading state during login attempt', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: boolean) => void;
    const loginPromise = new Promise<boolean>((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);
    
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    // Should show loading spinner
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    
    // Resolve the login
    resolveLogin!(true);
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  test('remember me checkbox can be toggled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);
    
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
    
    expect(rememberMeCheckbox.checked).toBe(false);
    
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(true);
    
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(false);
  });

  test('has proper accessibility attributes', () => {
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
    
    // Check form structure
    const form = emailInput.closest('form');
    expect(form).toBeInTheDocument();
  });
});