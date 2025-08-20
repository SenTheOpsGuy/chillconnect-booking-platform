import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldCheckIcon, 
  CurrencyDollarIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      if (user.role === 'seeker') {
        navigate('/providers');
      } else if (user.role === 'provider') {
        navigate('/bookings');
      } else {
        // For admin roles, go to dashboard
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Verified Providers',
      description: 'All providers go through rigorous verification for your safety and peace of mind.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Secure Token System',
      description: 'Safe and discreet payments using our token-based system with escrow protection.'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Template Communication',
      description: 'Professional communication through pre-approved message templates.'
    },
    {
      icon: UserGroupIcon,
      title: 'Premium Experience',
      description: 'Curated selection of professional providers for an exceptional experience.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/80"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <HeartIcon className="w-16 h-16 text-sensual-red animate-pulse-slow" />
                <SparklesIcon className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-float" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-white">Chill</span>
              <span className="text-gradient-red">Connect</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Premium adult services platform connecting you with verified professionals 
              in an elegant, secure, and discreet environment.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link to="/providers" className="btn-primary text-lg px-8 py-4">
                    Browse Providers
                  </Link>
                  <Link to="/dashboard" className="btn-secondary text-lg px-8 py-4">
                    My Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-primary text-lg px-8 py-4">
                    Join ChillConnect
                  </Link>
                  <Link to="/login" className="btn-secondary text-lg px-8 py-4">
                    Sign In
                  </Link>
                </>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              Must be 18+ years old to use this platform
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose ChillConnect?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience the premium difference with our carefully crafted platform 
              designed for safety, elegance, and satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-sensual text-center group">
                <div className="w-12 h-12 bg-sensual-red/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-sensual-red/30 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-sensual-red" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Simple, secure, and sophisticated. Get started in just a few steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Create Account
              </h3>
              <p className="text-gray-400">
                Sign up securely and verify your age to access our premium platform.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Browse & Book
              </h3>
              <p className="text-gray-400">
                Explore verified providers and book your preferred experience using tokens.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-sensual-red to-sensual-red-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Enjoy Experience
              </h3>
              <p className="text-gray-400">
                Connect safely through our template messaging and enjoy your premium experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-sensual">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Experience Premium?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of satisfied users who trust ChillConnect for their premium experiences.
          </p>
          
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-4">
                Get Started Today
              </Link>
              <Link to="/providers" className="btn-secondary text-lg px-8 py-4">
                Browse Providers
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;