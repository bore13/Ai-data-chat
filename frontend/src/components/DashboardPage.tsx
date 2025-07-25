import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aiService } from '../lib/ai'
import { ChatEncryption } from '../lib/encryption'
import { User } from '../types'
import { Send, Database, LogOut, MessageSquare, BarChart3, TrendingUp, Lightbulb, Trash2, Shield } from 'lucide-react'
import PrivacyNotice from './PrivacyNotice'

interface DashboardPageProps {
  user: User
}

const DashboardPage = ({ user }: DashboardPageProps) => {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{
    id: string, 
    text: string, 
    isUser: boolean, 
    timestamp: Date,
    insights?: string[],
    recommendations?: string[],
    reformulated_query?: string,
    metrics?: Record<string, string>
  }>>([])
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const navigate = useNavigate()

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory()
  }, [])

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })

      if (error) throw error

      if (data) {
        const formattedMessages = await Promise.all(
          data.map(async (msg) => {
            // Decrypt message text
            const decryptedText = await ChatEncryption.decryptMessage(msg.message_text, user.id)
            
            return {
              id: msg.id,
              text: decryptedText,
              isUser: msg.is_user_message,
              timestamp: new Date(msg.timestamp),
              insights: msg.insights || [],
              recommendations: msg.recommendations || [],
              reformulated_query: msg.reformulated_query,
              metrics: msg.metrics || {}
            }
          })
        )
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const saveMessageToHistory = async (message: any) => {
    try {
      // Encrypt message text before storing
      const encryptedText = await ChatEncryption.encryptMessage(message.text, user.id)
      
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          message_text: encryptedText,
          is_user_message: message.isUser,
          timestamp: message.timestamp,
          insights: message.insights,
          recommendations: message.recommendations,
          reformulated_query: message.reformulated_query,
          metrics: message.metrics
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving message to history:', error)
    }
  }

  const clearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history?')) return

    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error
      setMessages([])
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    await saveMessageToHistory(userMessage)
    setLoading(true)

    try {
      // Call real AI service
      const aiResponse = await aiService.analyzeData(user.id, message)
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.message,
        isUser: false,
        timestamp: new Date(),
        insights: aiResponse.insights,
        recommendations: aiResponse.recommendations,
        reformulated_query: aiResponse.reformulated_query,
        metrics: aiResponse.metrics
      }

      setMessages(prev => [...prev, aiMessage])
      await saveMessageToHistory(aiMessage)
    } catch (error) {
      console.error('AI analysis error:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble analyzing your data right now. Please check your API configuration and try again.",
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      await saveMessageToHistory(errorMessage)
    } finally {
      setLoading(false)
    }

    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">AI Data Chat</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={() => setShowPrivacyNotice(true)}
                className="flex items-center text-green-600 text-xs hover:text-green-700"
                title="Learn about privacy & security"
              >
                <Shield className="h-3 w-3 mr-1" />
                End-to-End Encrypted
              </button>
              <button
                onClick={clearChatHistory}
                className="btn-secondary flex items-center text-red-600 hover:text-red-700"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </button>
              <button
                onClick={() => navigate('/data-sources')}
                className="btn-secondary flex items-center"
              >
                <Database className="h-4 w-4 mr-2" />
                Data Sources
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center mb-6">
                <MessageSquare className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">AI Data Analyst Chat</h2>
              </div>
              
              {/* Chat Messages Area */}
              <div className="bg-gray-50 rounded-lg p-4 h-96 mb-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-32">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Start chatting with your AI Data Analyst</p>
                    <p className="text-sm">Ask questions about your data to get instant insights</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            msg.isUser
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          
                          {/* Show reformulated query if available */}
                          {!msg.isUser && msg.reformulated_query && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center mb-1">
                                <span className="text-xs font-semibold text-blue-600">🔍 Analysis Query:</span>
                              </div>
                              <p className="text-xs text-blue-600 italic">{msg.reformulated_query}</p>
                            </div>
                          )}

                          {/* Show metrics if available */}
                          {!msg.isUser && msg.metrics && Object.keys(msg.metrics).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Key Metrics:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {Object.entries(msg.metrics).map(([key, value], index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span className="text-gray-600 font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                    <span className="text-gray-800 font-semibold">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show insights if available */}
                          {!msg.isUser && msg.insights && msg.insights.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Key Insights:</span>
                              </div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {msg.insights.map((insight, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-yellow-500 mr-1">•</span>
                                    {insight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Show recommendations if available */}
                          {!msg.isUser && msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Recommendations:</span>
                              </div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {msg.recommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-500 mr-1">→</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <p className={`text-xs mt-2 ${
                            msg.isUser ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about your data... (e.g., 'Show me sales trends for Q4')"
                  className="input-field flex-1"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Reports Section */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center mb-6">
                <BarChart3 className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">AI-Generated Reports</h2>
              </div>
              
              <div className="text-center text-gray-500 py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No reports generated yet</p>
                <p className="text-sm">Start chatting to see AI-generated visualizations</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/data-sources')}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Add Data Source
                </button>
                <button
                  onClick={() => setMessage("Show me a summary of my data")}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Data Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Privacy Notice Modal */}
      <PrivacyNotice 
        isOpen={showPrivacyNotice} 
        onClose={() => setShowPrivacyNotice(false)} 
      />
    </div>
  )
}

export default DashboardPage 