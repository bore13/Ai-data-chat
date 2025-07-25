import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aiService } from '../lib/ai'
import { ChatEncryption } from '../lib/encryption'
import { User } from '../types'
import { Send, Database, LogOut, MessageSquare, BarChart3, TrendingUp, Lightbulb, Trash2, Shield } from 'lucide-react'
import PrivacyNotice from './PrivacyNotice'
import ChatSessions from './ChatSessions'
import DatasetSelector from './DatasetSelector'

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([])
  const [autoSelectedDataset, setAutoSelectedDataset] = useState<string | null>(null)
  const navigate = useNavigate()

  // Load chat history when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadChatHistory(currentSessionId)
    }
  }, [currentSessionId])

  // Check for selected dataset from data viewer
  useEffect(() => {
    const selectedDatasetInfo = localStorage.getItem('selectedDatasetForAnalysis')
    if (selectedDatasetInfo) {
      try {
        const dataset = JSON.parse(selectedDatasetInfo)
        setSelectedDatasets([dataset.id])
        setAutoSelectedDataset(dataset.name)
        // Clear the localStorage after using it
        localStorage.removeItem('selectedDatasetForAnalysis')
      } catch (error) {
        console.error('Error parsing selected dataset info:', error)
        localStorage.removeItem('selectedDatasetForAnalysis')
      }
    }
  }, [])

  const loadChatHistory = async (sessionId?: string) => {
    if (!sessionId) return
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
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
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const saveMessageToHistory = async (message: any) => {
    if (!currentSessionId) return
    
    try {
      // Encrypt message text before storing
      const encryptedText = await ChatEncryption.encryptMessage(message.text, user.id)
      
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          session_id: currentSessionId,
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

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setShowSessions(false)
  }

  const createOrGetSession = async () => {
    if (currentSessionId) return currentSessionId
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'New Chat'
        })
        .select()
        .single()

      if (error) throw error
      
      setCurrentSessionId(data.id)
      return data.id
    } catch (error) {
      console.error('Error creating session:', error)
      return null
    }
  }



  const handleDatasetToggle = (datasetId: string) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId)
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    )
  }

  const handleSelectAllDatasets = () => {
    // This should be implemented to get actual dataset IDs
    // For now, we'll leave it empty until we can get the real data
    console.log('Select All clicked - needs implementation')
  }

  const handleClearAllDatasets = () => {
    setSelectedDatasets([])
  }

  const clearChatHistory = async () => {
    if (!currentSessionId || !confirm('Are you sure you want to clear this conversation?')) return

    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('session_id', currentSessionId)

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

    // Ensure we have a session
    const sessionId = await createOrGetSession()
    if (!sessionId) {
      console.error('Could not create session')
      return
    }

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
      // Call real AI service with selected datasets
      const aiResponse = await aiService.analyzeData(user.id, message, selectedDatasets)
      
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">AI Data Chat</h1>
              </div>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <span className="text-sm text-gray-700 hidden lg:block">Welcome, {user.email}</span>
              <button
                onClick={() => navigate('/data-sources')}
                className="btn-secondary flex items-center"
                title="Manage data sources"
              >
                <Database className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden lg:inline">Data Sources</span>
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>

            {/* Mobile Header Actions */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={() => navigate('/data-sources')}
                className="btn-secondary p-2"
                title="Data Sources"
              >
                <Database className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary p-2"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-selected Dataset Notification */}
      {autoSelectedDataset && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 sm:mr-3" />
              <div className="flex-1">
                <p className="text-sm sm:text-base font-medium text-blue-800">
                  Dataset automatically selected for analysis
                </p>
                <p className="text-xs sm:text-sm text-blue-600">
                  "{autoSelectedDataset}" is ready for AI analysis
                </p>
              </div>
              <button
                onClick={() => setAutoSelectedDataset(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Sessions Sidebar */}
          {showSessions && (
            <div className="lg:col-span-1 order-1 lg:order-1">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversations</h3>
                <ChatSessions
                  user={user}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                />
              </div>
            </div>
          )}

          {/* Chat Section */}
          <div className={`${showSessions ? 'lg:col-span-2' : 'lg:col-span-3'} order-2 lg:order-2`}>
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mr-2" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">AI Data Analyst Chat</h2>
                  </div>
                  
                  {/* Chat Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSessions(!showSessions)}
                      className="btn-secondary flex items-center text-sm"
                      title="Manage conversations"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Conversations</span>
                    </button>
                    <button
                      onClick={clearChatHistory}
                      className="btn-secondary flex items-center text-sm text-red-600 hover:text-red-700"
                      title="Clear current conversation"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                </div>
                
                {/* Dataset Selector */}
                <div className="w-full sm:w-48 lg:w-64">
                  <DatasetSelector
                    user={user}
                    selectedDatasets={selectedDatasets}
                    onDatasetToggle={handleDatasetToggle}
                    onSelectAll={handleSelectAllDatasets}
                    onClearAll={handleClearAllDatasets}
                  />
                </div>
              </div>
              
              {/* Chat Messages Area */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 h-80 sm:h-96 mb-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-20 sm:mt-32">
                    <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">Start chatting with your AI Data Analyst</p>
                    <p className="text-xs sm:text-sm">Ask questions about your data to get instant insights</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base ${
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
                              <p className="text-xs text-blue-600 italic break-words">{msg.reformulated_query}</p>
                            </div>
                          )}

                          {/* Show metrics if available */}
                          {!msg.isUser && msg.metrics && Object.keys(msg.metrics).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-1 sm:mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Key Metrics:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {Object.entries(msg.metrics).map(([key, value], index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span className="text-gray-600 font-medium truncate mr-2">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                    <span className="text-gray-800 font-semibold text-right">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show insights if available */}
                          {!msg.isUser && msg.insights && msg.insights.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mr-1 sm:mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Key Insights:</span>
                              </div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {msg.insights.map((insight, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-yellow-500 mr-1 flex-shrink-0">•</span>
                                    <span className="break-words">{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Show recommendations if available */}
                          {!msg.isUser && msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center mb-2">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 sm:mr-2" />
                                <span className="text-xs font-semibold text-gray-700">Recommendations:</span>
                              </div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {msg.recommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-500 mr-1 flex-shrink-0">→</span>
                                    <span className="break-words">{rec}</span>
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
                  placeholder="Ask about your data..."
                  className="input-field flex-1 text-sm sm:text-base"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="btn-primary flex items-center p-2 sm:px-4 sm:py-2"
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
          <div className="lg:col-span-1 order-3 lg:order-3">
            <div className="card">
              <div className="flex items-center mb-4 sm:mb-6">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">AI-Generated Reports</h2>
              </div>
              
              <div className="text-center text-gray-500 py-8 sm:py-12">
                <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">No reports generated yet</p>
                <p className="text-xs sm:text-sm">Start chatting to see AI-generated visualizations</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card mt-4 sm:mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={() => navigate('/data-sources')}
                  className="w-full btn-secondary flex items-center justify-center text-sm sm:text-base"
                >
                  <Database className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Data Source</span>
                  <span className="sm:hidden">Data Sources</span>
                </button>
                <button
                  onClick={() => setMessage("Show me a summary of my data")}
                  className="w-full btn-secondary flex items-center justify-center text-sm sm:text-base"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Data Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Privacy Status */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setShowPrivacyNotice(true)}
                className="flex items-center text-green-600 hover:text-green-700"
                title="Learn about privacy & security"
              >
                <Shield className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">End-to-End Encrypted</span>
                <span className="sm:hidden">Secure</span>
              </button>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Your data is private and secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>AI Data Chat v1.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Privacy Notice Modal */}
      <PrivacyNotice 
        isOpen={showPrivacyNotice} 
        onClose={() => setShowPrivacyNotice(false)} 
      />
    </div>
  )
}

export default DashboardPage 