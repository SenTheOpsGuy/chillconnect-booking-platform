import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AdminStats {
  total_users: number;
  total_providers: number;
  total_seekers: number;
  pending_verifications: number;
  active_bookings: number;
  open_disputes: number;
  open_support_tickets: number;
  total_revenue: number;
  platform_commission: number;
}

interface Employee {
  id: number;
  email: string;
  role: 'employee' | 'manager';
  verification_status: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface Dispute {
  id: number;
  booking_id: number;
  reporter_email: string;
  dispute_type: string;
  description: string;
  status: string;
  assigned_manager?: number;
  created_at: string;
  booking_details: {
    start_time?: string;
    total_tokens?: number;
  };
}

interface Verification {
  id: number;
  user_id: number;
  user_email: string;
  verification_type: string;
  status: string;
  documents: string[];
  assigned_employee?: number;
  created_at: string;
}

interface NewEmployee {
  email: string;
  role: 'employee' | 'manager';
  phone?: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'disputes' | 'verifications' | 'assignments'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    email: '',
    role: 'employee',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'dashboard':
          await fetchStats();
          break;
        case 'employees':
          await fetchEmployees();
          break;
        case 'disputes':
          await fetchDisputes();
          break;
        case 'verifications':
          await fetchVerifications();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/admin/dashboard');
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/admin/employees');
      setEmployees(response.data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchDisputes = async () => {
    try {
      const response = await axios.get('/admin/disputes');
      setDisputes(response.data.disputes);
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
    }
  };

  const fetchVerifications = async () => {
    try {
      const response = await axios.get('/admin/verification-queue');
      setVerifications(response.data);
    } catch (error: any) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to load verification queue');
    }
  };

  const createEmployee = async () => {
    if (!newEmployee.email || !newEmployee.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading(true);
      const response = await axios.post('/admin/employees', newEmployee);
      
      // Show temporary password to admin
      toast.success(`Employee created! Temporary password: ${response.data.temporary_password}`, {
        duration: 10000
      });
      
      setEmployees(prev => [response.data, ...prev]);
      setShowCreateEmployee(false);
      setNewEmployee({ email: '', role: 'employee', phone: '' });
    } catch (error: any) {
      console.error('Error creating employee:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create employee';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const assignDispute = async (disputeId: number, managerId: number) => {
    try {
      setActionLoading(true);
      await axios.put(`/admin/disputes/${disputeId}/assign`, { manager_id: managerId });
      toast.success('Dispute assigned successfully');
      fetchDisputes();
    } catch (error: any) {
      console.error('Error assigning dispute:', error);
      toast.error('Failed to assign dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'investigating':
      case 'in_progress':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'resolved':
      case 'completed':
      case 'approved':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'rejected':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-gray-400">Manage ChillConnect platform operations</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'dashboard'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'employees'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <UserGroupIcon className="w-5 h-5" />
          <span>Employees</span>
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'disputes'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>Disputes</span>
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'verifications'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <DocumentCheckIcon className="w-5 h-5" />
          <span>Verifications</span>
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'assignments'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ClipboardDocumentCheckIcon className="w-5 h-5" />
          <span>Assignments</span>
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-premium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.total_users}</p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-sensual-red" />
              </div>
            </div>

            <div className="card-premium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Verifications</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending_verifications}</p>
                </div>
                <DocumentCheckIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="card-premium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Open Disputes</p>
                  <p className="text-2xl font-bold text-red-400">{stats.open_disputes}</p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <div className="card-premium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Platform Revenue</p>
                  <p className="text-2xl font-bold text-green-400">₹{stats.platform_commission.toLocaleString()}</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-premium">
              <h3 className="text-lg font-semibold text-white mb-4">User Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Providers</span>
                  <span className="text-white">{stats.total_providers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seekers</span>
                  <span className="text-white">{stats.total_seekers}</span>
                </div>
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-semibold text-white mb-4">Active Operations</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Bookings</span>
                  <span className="text-white">{stats.active_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Support Tickets</span>
                  <span className="text-white">{stats.open_support_tickets}</span>
                </div>
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="text-white">₹{stats.total_revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Commission (15%)</span>
                  <span className="text-green-400">₹{stats.platform_commission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Employee Management</h2>
            <button
              onClick={() => setShowCreateEmployee(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlusIcon className="w-5 h-5" />
              <span>Create Employee</span>
            </button>
          </div>

          {/* Employees List */}
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="card-premium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <UserIcon className="w-10 h-10 text-gray-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{employee.email}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="capitalize">{employee.role}</span>
                        <span>•</span>
                        <span className={employee.is_active ? 'text-green-400' : 'text-red-400'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span>•</span>
                        <span>Created {formatDate(employee.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getStatusColor(employee.verification_status)}`}>
                      {employee.verification_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {employees.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No employees found</h3>
              <p className="text-gray-400">Create your first employee account to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Dispute Management</h2>

          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="card-premium">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Dispute #{dispute.id}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getStatusColor(dispute.status)}`}>
                        {dispute.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Reporter:</span> {dispute.reporter_email}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Type:</span> {dispute.dispute_type}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Booking:</span> #{dispute.booking_id}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Created:</span> {formatDate(dispute.created_at)}
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-3">{dispute.description}</p>
                    
                    <div className="flex items-center justify-between">
                      {dispute.assigned_manager ? (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-400">
                            Assigned to Manager ID: {dispute.assigned_manager}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-400">Unassigned</span>
                      )}
                      
                      {!dispute.assigned_manager && employees.filter(e => e.role === 'manager').length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignDispute(dispute.id, parseInt(e.target.value));
                            }
                          }}
                          className="text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          defaultValue=""
                        >
                          <option value="">Assign to...</option>
                          {employees.filter(e => e.role === 'manager').map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {disputes.length === 0 && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No disputes found</h3>
              <p className="text-gray-400">All disputes have been resolved</p>
            </div>
          )}
        </div>
      )}

      {/* Verifications Tab */}
      {activeTab === 'verifications' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Verification Queue</h2>

          <div className="space-y-4">
            {verifications.map((verification) => (
              <div key={verification.id} className="card-premium">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Verification #{verification.id}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getStatusColor(verification.status)}`}>
                        {verification.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">User:</span> {verification.user_email}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Type:</span> {verification.verification_type}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Documents:</span> {verification.documents.length} files
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Created:</span> {formatDate(verification.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {verification.assigned_employee ? (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-400">
                            Assigned to Employee ID: {verification.assigned_employee}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-400">Unassigned</span>
                      )}
                      
                      {!verification.assigned_employee && employees.filter(e => e.role === 'employee').length > 0 && (
                        <span className="text-sm text-gray-400">
                          Auto-assignment enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {verifications.length === 0 && (
            <div className="text-center py-12">
              <DocumentCheckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No verifications pending</h3>
              <p className="text-gray-400">All verifications have been processed</p>
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Assignment Overview</h2>

          {/* Employee Workload Summary */}
          <div className="card-premium">
            <h3 className="text-lg font-semibold text-white mb-4">Employee Workload</h3>
            <div className="space-y-4">
              {employees.map((employee) => {
                const assignedDisputes = disputes.filter(d => d.assigned_manager === employee.id).length;
                const assignedVerifications = verifications.filter(v => v.assigned_employee === employee.id).length;
                const totalAssignments = assignedDisputes + assignedVerifications;

                return (
                  <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                      <div>
                        <h4 className="text-white font-medium">{employee.email}</h4>
                        <p className="text-sm text-gray-400 capitalize">{employee.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{totalAssignments} tasks</p>
                      <div className="text-sm text-gray-400">
                        {employee.role === 'manager' && (
                          <span>{assignedDisputes} disputes</span>
                        )}
                        {employee.role === 'employee' && (
                          <span>{assignedVerifications} verifications</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unassigned Tasks Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-premium">
              <h3 className="text-lg font-semibold text-white mb-4">Unassigned Disputes</h3>
              <div className="space-y-3">
                {disputes.filter(d => !d.assigned_manager).slice(0, 5).map((dispute) => (
                  <div key={dispute.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div>
                      <p className="text-white text-sm">Dispute #{dispute.id}</p>
                      <p className="text-gray-400 text-xs">{dispute.dispute_type}</p>
                    </div>
                    <span className="text-xs text-yellow-400">Pending</span>
                  </div>
                ))}
                {disputes.filter(d => !d.assigned_manager).length === 0 && (
                  <p className="text-gray-400 text-sm">All disputes are assigned</p>
                )}
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-semibold text-white mb-4">Unassigned Verifications</h3>
              <div className="space-y-3">
                {verifications.filter(v => !v.assigned_employee).slice(0, 5).map((verification) => (
                  <div key={verification.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div>
                      <p className="text-white text-sm">Verification #{verification.id}</p>
                      <p className="text-gray-400 text-xs">{verification.verification_type}</p>
                    </div>
                    <span className="text-xs text-yellow-400">Pending</span>
                  </div>
                ))}
                {verifications.filter(v => !v.assigned_employee).length === 0 && (
                  <p className="text-gray-400 text-sm">All verifications are assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card-premium text-center">
              <p className="text-2xl font-bold text-white">{employees.length}</p>
              <p className="text-gray-400 text-sm">Total Staff</p>
            </div>
            <div className="card-premium text-center">
              <p className="text-2xl font-bold text-yellow-400">{disputes.filter(d => !d.assigned_manager).length}</p>
              <p className="text-gray-400 text-sm">Unassigned Disputes</p>
            </div>
            <div className="card-premium text-center">
              <p className="text-2xl font-bold text-blue-400">{verifications.filter(v => !v.assigned_employee).length}</p>
              <p className="text-gray-400 text-sm">Unassigned Verifications</p>
            </div>
            <div className="card-premium text-center">
              <p className="text-2xl font-bold text-green-400">
                {disputes.filter(d => d.assigned_manager).length + verifications.filter(v => v.assigned_employee).length}
              </p>
              <p className="text-gray-400 text-sm">Active Assignments</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Create Employee</h3>
                <button
                  onClick={() => setShowCreateEmployee(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email *</label>
                  <input
                    type="email"
                    placeholder="employee@company.com"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Role *</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value as 'employee' | 'manager' }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone (optional)</label>
                  <input
                    type="tel"
                    placeholder="+1234567890"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateEmployee(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createEmployee}
                    disabled={actionLoading || !newEmployee.email || !newEmployee.role}
                    className="flex-1 btn-primary"
                  >
                    {actionLoading ? 'Creating...' : 'Create Employee'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;