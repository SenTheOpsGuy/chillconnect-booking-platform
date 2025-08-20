import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon, UserIcon, HeartIcon } from '@heroicons/react/24/outline';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'seeker' as 'seeker' | 'provider',
    age_confirmed: false,
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.age_confirmed) {
      alert('You must confirm you are 18 years or older to register.');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    
    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    
    setIsLoading(true);
    
    const success = await register({
      email: formData.email,
      password: formData.password,
      role: formData.role,
      age_confirmed: formData.age_confirmed,
      phone: formData.phone || undefined
    });
    
    if (success) {
      navigate('/login');
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-dark-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
          </div>
          <h2 className="form-title">Join ChillConnect</h2>
          <p className="text-gray-400">Create your premium account</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selection */}
          <div>
            <label className="label-premium">I want to</label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <label className={`relative cursor-pointer ${formData.role === 'seeker' ? 'ring-2 ring-sensual-red' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="seeker"
                  checked={formData.role === 'seeker'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className="card-premium text-center p-4 hover:border-sensual-red/50 transition-all duration-300">
                  <UserIcon className="w-8 h-8 text-sensual-red mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-200">Find Services</span>
                  <p className="text-xs text-gray-400 mt-1">Browse and book</p>
                </div>
              </label>
              
              <label className={`relative cursor-pointer ${formData.role === 'provider' ? 'ring-2 ring-sensual-red' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="provider"
                  checked={formData.role === 'provider'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className="card-premium text-center p-4 hover:border-sensual-red/50 transition-all duration-300">
                  <HeartIcon className="w-8 h-8 text-sensual-red mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-200">Offer Services</span>
                  <p className="text-xs text-gray-400 mt-1">Create profile</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="label-premium">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input-premium w-full"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="phone" className="label-premium">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="input-premium w-full"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="label-premium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input-premium w-full pr-10"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label-premium">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="input-premium w-full pr-10"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Age Confirmation */}
          <div className="flex items-start space-x-3 p-4 bg-sensual-red/10 border border-sensual-red/20 rounded-xl">
            <input
              id="age_confirmed"
              name="age_confirmed"
              type="checkbox"
              required
              className="age-checkbox mt-1"
              checked={formData.age_confirmed}
              onChange={handleInputChange}
            />
            <label htmlFor="age_confirmed" className="text-sm text-gray-300 leading-relaxed">
              <span className="font-semibold text-sensual-red">I confirm I am 18 years or older</span> and 
              agree to the{' '}
              <Link to="/terms" className="text-sensual-red hover:text-sensual-red-light underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-sensual-red hover:text-sensual-red-light underline">
                Privacy Policy
              </Link>.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.age_confirmed}
            className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="loading-spinner w-5 h-5"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-sensual-red hover:text-sensual-red-light font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;