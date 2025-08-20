import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  FlagIcon,
  TagIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface ChatTemplate {
  id: number;
  category: 'greeting' | 'booking_inquiry' | 'logistics' | 'services' | 'payment' | 'feedback' | 'cancellation' | 'other';
  template_text: string;
  variables: string[];
  active: boolean;
  admin_only: boolean;
  usage_count: number;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  template_id: number;
  template_text: string;
  processed_message: string;
  created_at: string;
  is_flagged: boolean;
}

interface Conversation {
  booking_id: number;
  provider_id: number;
  provider_name: string;
  seeker_id: number;
  seeker_name: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get('provider');
  const bookingId = searchParams.get('booking');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    bookingId ? parseInt(bookingId) : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ChatTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'greeting', label: 'Greetings' },
    { value: 'booking_inquiry', label: 'Booking Inquiry' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'services', label: 'Services' },
    { value: 'payment', label: 'Payment' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'cancellation', label: 'Cancellation' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchTemplates();
    if (selectedBookingId) {
      fetchMessages(selectedBookingId);
    }
    // For this demo, we'll simulate conversations
    // In a real app, you'd fetch user's active bookings/conversations
    setConversations([]);
    setLoading(false);
  }, [selectedBookingId]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/chat/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load chat templates');
    }
  };

  const fetchMessages = async (bookingId: number) => {
    try {
      const response = await axios.get(`/chat/${bookingId}/messages`);
      setMessages(response.data);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load messages');
      }
    }
  };

  const sendMessage = async () => {
    if (!selectedTemplate || !selectedBookingId) return;

    try {
      setSendingMessage(true);
      
      const response = await axios.post(`/chat/${selectedBookingId}/send`, {
        template_id: selectedTemplate.id,
        variables: templateVariables
      });

      setMessages(prev => [...prev, response.data]);
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const flagMessage = async (messageId: number) => {
    const reason = prompt('Please provide a reason for flagging this message:');
    if (!reason) return;

    try {
      await axios.post(`/chat/messages/${messageId}/flag`, { reason });
      toast.success('Message flagged for admin review');
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_flagged: true } : msg
        )
      );
    } catch (error: any) {
      console.error('Error flagging message:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to flag message';
      toast.error(errorMessage);
    }
  };

  const openTemplateModal = (template: ChatTemplate) => {
    setSelectedTemplate(template);
    setTemplateVariables({});
    setShowTemplateModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const processTemplatePreview = (template: ChatTemplate, variables: Record<string, string>) => {
    let preview = template.template_text;
    template.variables.forEach(variable => {
      const value = variables[variable] || `[${variable}]`;
      preview = preview.replace(new RegExp(`\\[${variable}\\]`, 'g'), value);
    });
    return preview;
  };

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
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
        <h1 className="text-3xl font-bold text-white mb-2">Chat</h1>
        <p className="text-gray-400">Template-based messaging for safe communication</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[600px]">
        {/* Conversations Sidebar */}
        <div className="lg:col-span-1">
          <div className="card-premium h-full">
            <h3 className="text-lg font-semibold text-white mb-4">Conversations</h3>
            
            {!selectedBookingId ? (
              <div className="text-center py-8">
                <ChatBubbleLeftEllipsisIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No active conversations</p>
                <p className="text-sm text-gray-500">Start a booking to enable chat</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-sensual-red/10 border border-sensual-red/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-8 h-8 text-sensual-red" />
                    <div>
                      <p className="text-white font-medium">Booking #{selectedBookingId}</p>
                      <p className="text-sm text-gray-400">Active conversation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="card-premium h-full flex flex-col">
            {selectedBookingId ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-8 h-8 text-sensual-red" />
                    <div>
                      <h3 className="text-white font-medium">Booking #{selectedBookingId}</h3>
                      <p className="text-sm text-gray-400">Template-based messaging</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                            message.sender_id === user?.id
                              ? 'bg-sensual-red text-white'
                              : 'bg-gray-800 text-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs opacity-75">
                              {message.sender_name}
                            </span>
                            {message.sender_id !== user?.id && (
                              <button
                                onClick={() => flagMessage(message.id)}
                                className="text-xs opacity-50 hover:opacity-100"
                                title="Flag message"
                              >
                                <FlagIcon className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm">{message.processed_message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-75">
                              {formatDate(message.created_at)}
                            </span>
                            {message.is_flagged && (
                              <span className="text-xs bg-red-500 px-1 rounded">
                                Flagged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ChatBubbleLeftEllipsisIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No messages yet</p>
                      <p className="text-sm text-gray-500">Start the conversation with a template</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-700">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Send Template Message</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                  <p className="text-gray-400">Choose a booking to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Templates Sidebar */}
        <div className="lg:col-span-1">
          <div className="card-premium h-full flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Message Templates</h3>
            
            {/* Category Filter */}
            <div className="mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-sensual-red"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Templates List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                    onClick={() => selectedBookingId && openTemplateModal(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded capitalize">
                        {template.category.replace('_', ' ')}
                      </span>
                      {template.admin_only && (
                        <span className="text-xs bg-sensual-red text-white px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {template.template_text}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        Used {template.usage_count} times
                      </span>
                      {template.variables.length > 0 && (
                        <span className="text-xs text-yellow-400">
                          {template.variables.length} vars
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <TagIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No templates found</p>
                  <p className="text-sm text-gray-500">Try selecting a different category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Send Message</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Template Preview */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message Preview</label>
                  <div className="p-3 bg-gray-800 rounded-lg text-sm text-gray-300 min-h-[60px]">
                    {processTemplatePreview(selectedTemplate, templateVariables)}
                  </div>
                </div>

                {/* Template Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Fill in Variables</label>
                    <div className="space-y-3">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable}>
                          <input
                            type="text"
                            placeholder={`Enter ${variable}`}
                            value={templateVariables[variable] || ''}
                            onChange={(e) => setTemplateVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sensual-red"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <span className="text-sm bg-gray-800 text-gray-300 px-3 py-2 rounded capitalize">
                    {selectedTemplate.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={sendingMessage || (selectedTemplate.variables.length > 0 && 
                      selectedTemplate.variables.some(v => !templateVariables[v]))}
                    className="flex-1 btn-primary flex items-center justify-center"
                  >
                    {sendingMessage ? (
                      <div className="loading-spinner w-5 h-5"></div>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {!selectedBookingId && (
        <div className="mt-8 card-premium">
          <div className="text-center py-8">
            <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-4">Template-Based Chat System</h3>
            <div className="max-w-2xl mx-auto text-gray-400 space-y-3">
              <p>ChillConnect uses a template-based messaging system to ensure safe and professional communication between users.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="text-left">
                  <h4 className="text-white font-medium mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Pre-approved message templates</li>
                    <li>• Category-based organization</li>
                    <li>• Variable substitution</li>
                    <li>• Message flagging system</li>
                  </ul>
                </div>
                
                <div className="text-left">
                  <h4 className="text-white font-medium mb-2">Safety:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Prevents inappropriate content</li>
                    <li>• Admin-monitored communication</li>
                    <li>• Automated content filtering</li>
                    <li>• User reporting system</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-sm mt-6">
                To start chatting, create a booking with a provider or access an existing booking conversation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;