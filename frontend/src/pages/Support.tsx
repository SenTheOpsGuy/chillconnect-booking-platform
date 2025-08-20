import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LifebuoyIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  HandThumbUpIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

interface SupportTicket {
  id: number;
  category: 'technical' | 'billing' | 'account' | 'booking' | 'safety' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  resolution?: string;
}

interface SupportMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface HelpArticle {
  id: number;
  category: string;
  title: string;
  content: string;
  tags: string;
  views: number;
  helpful_votes: number;
}

const Support: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'help' | 'tickets' | 'create'>('help');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);
  const [helpCategories, setHelpCategories] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    category: 'technical' as const,
    priority: 'medium' as const,
    subject: '',
    description: ''
  });

  const categories = [
    { value: 'technical', label: 'Technical Issues' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'account', label: 'Account Management' },
    { value: 'booking', label: 'Booking Support' },
    { value: 'safety', label: 'Safety & Security' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-400' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTickets(),
        fetchHelpArticles(),
        fetchHelpCategories()
      ]);
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await axios.get('/support/tickets');
      setTickets(response.data);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load support tickets');
      }
    }
  };

  const fetchHelpArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(`/support/help-articles?${params.toString()}`);
      setHelpArticles(response.data);
    } catch (error) {
      console.error('Error fetching help articles:', error);
    }
  };

  const fetchHelpCategories = async () => {
    try {
      const response = await axios.get('/support/help-categories');
      setHelpCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching help categories:', error);
    }
  };

  const fetchTicketMessages = async (ticketId: number) => {
    try {
      const response = await axios.get(`/support/tickets/${ticketId}/messages`);
      setTicketMessages(response.data);
    } catch (error: any) {
      console.error('Error fetching ticket messages:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load ticket messages');
      }
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post('/support/tickets', newTicket);
      setTickets(prev => [response.data, ...prev]);
      setNewTicket({
        category: 'technical',
        priority: 'medium',
        subject: '',
        description: ''
      });
      setActiveTab('tickets');
      toast.success('Support ticket created successfully');
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create ticket';
      toast.error(errorMessage);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await axios.post(`/support/tickets/${selectedTicket.id}/messages`, {
        message: newMessage,
        is_internal: false
      });

      setNewMessage('');
      fetchTicketMessages(selectedTicket.id);
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      toast.error(errorMessage);
    }
  };

  const viewArticle = async (article: HelpArticle) => {
    try {
      const response = await axios.get(`/support/help-articles/${article.id}`);
      setSelectedArticle(response.data);
      setShowArticleModal(true);
    } catch (error) {
      console.error('Error viewing article:', error);
      toast.error('Failed to load article');
    }
  };

  const markArticleHelpful = async (articleId: number) => {
    try {
      await axios.post(`/support/help-articles/${articleId}/helpful`);
      toast.success('Thank you for your feedback!');
      // Update local state
      setHelpArticles(prev =>
        prev.map(article =>
          article.id === articleId
            ? { ...article, helpful_votes: article.helpful_votes + 1 }
            : article
        )
      );
    } catch (error) {
      console.error('Error marking article helpful:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
    fetchTicketMessages(ticket.id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'in_progress':
        return <ExclamationTriangleIcon className="w-5 h-5 text-blue-400" />;
      case 'resolved':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'closed':
        return <CheckCircleIcon className="w-5 h-5 text-gray-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-yellow-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'resolved':
        return 'text-green-400';
      case 'closed':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
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

  const filteredArticles = helpArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
        <p className="text-gray-400">Get help with your ChillConnect experience</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => setActiveTab('help')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'help'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <BookOpenIcon className="w-5 h-5" />
          <span>Help Articles</span>
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'tickets'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <span>My Tickets</span>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'create'
              ? 'bg-sensual-red text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* Help Articles Tab */}
      {activeTab === 'help' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="card-premium">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
              >
                <option value="">All Categories</option>
                {helpCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button onClick={fetchHelpArticles} className="btn-primary">
                Search
              </button>
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <div key={article.id} className="card-premium hover:border-sensual-red/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                      {article.category}
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span>{article.views} views</span>
                      <span>•</span>
                      <span>{article.helpful_votes} helpful</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                    {article.content.slice(0, 150)}...
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => viewArticle(article)}
                      className="text-sensual-red hover:text-sensual-red-light text-sm"
                    >
                      Read more →
                    </button>
                    <button
                      onClick={() => markArticleHelpful(article.id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-green-400 text-sm"
                    >
                      <HandThumbUpIcon className="w-4 h-4" />
                      <span>Helpful</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <QuestionMarkCircleIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No articles found</h3>
              <p className="text-gray-400">Try adjusting your search or browse by category</p>
            </div>
          )}
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="card-premium hover:border-sensual-red/50 transition-colors cursor-pointer"
                  onClick={() => openTicketDetail(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="text-lg font-semibold text-white">#{ticket.id} - {ticket.subject}</h3>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${
                          priorities.find(p => p.value === ticket.priority)?.color
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className={`capitalize ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span>•</span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <LifebuoyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No support tickets</h3>
              <p className="text-gray-400 mb-4">You haven't created any support tickets yet</p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary"
              >
                Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Ticket Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div className="card-premium">
            <h3 className="text-xl font-semibold text-white mb-6">Create Support Ticket</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category *</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sensual-red"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Subject *</label>
                <input
                  type="text"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description *</label>
                <textarea
                  placeholder="Please provide detailed information about your issue..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                />
              </div>

              <button
                onClick={createTicket}
                disabled={!newTicket.subject.trim() || !newTicket.description.trim()}
                className="w-full btn-primary"
              >
                Create Support Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(selectedTicket.status)}
                      <h3 className="text-xl font-semibold text-white">
                        #{selectedTicket.id} - {selectedTicket.subject}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="capitalize">{selectedTicket.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className={priorities.find(p => p.value === selectedTicket.priority)?.color}>
                        {selectedTicket.priority} priority
                      </span>
                      <span>•</span>
                      <span>{formatDate(selectedTicket.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTicketDetail(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Original Description */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-white">You</span>
                    <span className="text-xs text-gray-400">{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  <p className="text-gray-300">{selectedTicket.description}</p>
                </div>

                {/* Messages */}
                {ticketMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg p-4 ${
                      message.sender_id === user?.id
                        ? 'bg-sensual-red/10 border border-sensual-red/30 ml-8'
                        : 'bg-gray-800 mr-8'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-white">{message.sender_name}</span>
                      <span className="text-xs text-gray-400">{formatDate(message.created_at)}</span>
                      {message.is_internal && (
                        <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                          Internal
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300">{message.message}</p>
                  </div>
                ))}

                {/* Resolution */}
                {selectedTicket.resolution && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Resolved</span>
                    </div>
                    <p className="text-gray-300">{selectedTicket.resolution}</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-6 border-t border-gray-700">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="btn-primary px-4 py-2 flex items-center"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Article Modal */}
      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded mb-2 inline-block">
                    {selectedArticle.category}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{selectedArticle.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                    <span>{selectedArticle.views} views</span>
                    <span>•</span>
                    <span>{selectedArticle.helpful_votes} found this helpful</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowArticleModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="text-gray-300 whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                <button
                  onClick={() => markArticleHelpful(selectedArticle.id)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-green-400"
                >
                  <HandThumbUpIcon className="w-5 h-5" />
                  <span>Mark as helpful</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-secondary"
                >
                  Still need help? Create ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;