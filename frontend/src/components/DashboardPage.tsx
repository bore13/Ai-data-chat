import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { Send, Database, LogOut, MessageSquare, BarChart3 } from 'lucide-react'

interface DashboardPageProps {
  user: User
}

const DashboardPage = ({ user }: DashboardPageProps) => {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    // TODO: Implement AI chat functionality in Phase 2
    console.log('Sending message:', message)
    setMessage('')
    setLoading(false)
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
                <div className="text-center text-gray-500 mt-32">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Start chatting with your AI Data Analyst</p>
                  <p className="text-sm">Ask questions about your data to get instant insights</p>
                </div>
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
    </div>
  )
}

export default DashboardPage 