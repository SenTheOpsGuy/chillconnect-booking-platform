import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile'>('profile');

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="card-premium">
        <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>
        <p className="text-gray-400 mb-8">Settings page is being updated with new features.</p>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Current User</h2>
          <p className="text-gray-300">Email: {user?.email}</p>
          <p className="text-gray-300">Role: {user?.role}</p>
          <p className="text-gray-300">Status: {user?.is_active ? 'Active' : 'Inactive'}</p>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <p className="text-blue-200">
            🚧 Full settings functionality with profile management, file uploads, and notifications 
            will be available after deployment completion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;