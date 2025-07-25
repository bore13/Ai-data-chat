import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { MessageSquare, Plus, Trash2, Edit3, MoreVertical } from 'lucide-react'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatSessionsProps {
  user: User
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
}

const ChatSessions = ({ user, currentSessionId, onSessionSelect, onNewSession }: ChatSessionsProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async () => {
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
      
      setSessions(prev => [data, ...prev])
      onSessionSelect(data.id)
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle })
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: newTitle }
            : session
        )
      )
      setEditingSession(null)
    } catch (error) {
      console.error('Error updating session title:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => prev.filter(session => session.id !== sessionId))
      
      // If we deleted the current session, create a new one
      if (currentSessionId === sessionId) {
        createNewSession()
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* New Chat Button */}
      <button
        onClick={createNewSession}
        className="w-full btn-primary flex items-center justify-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Chat
      </button>

      {/* Sessions List */}
      <div className="space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id
                ? 'bg-primary-100 border border-primary-200'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => onSessionSelect(session.id)}
          >
            <MessageSquare className="h-4 w-4 mr-3 text-gray-500" />
            
            {editingSession === session.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => updateSessionTitle(session.id, editTitle)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    updateSessionTitle(session.id, editTitle)
                  }
                }}
                className="flex-1 text-sm bg-white border border-gray-300 rounded px-2 py-1"
                autoFocus
              />
            ) : (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {session.title}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(session.updated_at)}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingSession(session.id)
                  setEditTitle(session.title)
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Rename conversation"
              >
                <Edit3 className="h-3 w-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(session.id)
                }}
                className="p-1 hover:bg-red-100 rounded"
                title="Delete conversation"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No conversations yet</p>
          <p className="text-xs">Start a new chat to begin</p>
        </div>
      )}
    </div>
  )
}

export default ChatSessions 