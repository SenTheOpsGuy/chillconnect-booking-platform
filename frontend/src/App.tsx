import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Providers from './pages/Providers';
import ProviderProfile from './pages/ProviderProfile';
import Booking from './pages/Booking';
import Chat from './pages/Chat';
import Support from './pages/Support';
import TokenWallet from './pages/TokenWallet';
import Admin from './pages/Admin';
import AdminDashboard from './pages/admin/AdminDashboard';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App bg-gradient-dark min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected User Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/providers" element={
                <ProtectedRoute>
                  <Layout><Providers /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/providers/:id" element={
                <ProtectedRoute>
                  <Layout><ProviderProfile /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/bookings" element={
                <ProtectedRoute>
                  <Layout><Booking /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Layout><Chat /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/support" element={
                <ProtectedRoute>
                  <Layout><Support /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/wallet" element={
                <ProtectedRoute>
                  <Layout><TokenWallet /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin-panel" element={
                <ProtectedRoute requireAdmin>
                  <Layout><Admin /></Layout>
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/*" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      {/* Add more admin routes as needed */}
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              } />
            </Routes>
            
            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1F2937',
                  color: '#F3F4F6',
                  border: '1px solid #374151',
                },
                success: {
                  style: {
                    border: '1px solid #DC2626',
                  },
                },
                error: {
                  style: {
                    border: '1px solid #EF4444',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;