import { Shield, Lock, Eye, Database } from 'lucide-react'

interface PrivacyNoticeProps {
  isOpen: boolean
  onClose: () => void
}

const PrivacyNotice = ({ isOpen, onClose }: PrivacyNoticeProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Shield className="h-6 w-6 text-green-600 mr-2" />
              Privacy & Security
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                End-to-End Encryption
              </h3>
              <p className="text-green-700">
                All chat messages are encrypted client-side before being stored. 
                We cannot read your conversations - only you can decrypt them.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Zero-Knowledge Architecture
              </h3>
              <p className="text-blue-700">
                Your data is isolated by company. Each account is completely separate 
                and we have no access to your business data or conversations.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Data Ownership
              </h3>
              <p className="text-purple-700">
                You own your data completely. You can export, delete, or clear 
                all your data at any time. We don't use your data for training or analysis.
              </p>
            </div>

            <div className="text-xs text-gray-500 mt-6">
              <p><strong>Encryption:</strong> AES-256-GCM with client-side key derivation</p>
              <p><strong>Isolation:</strong> Row-level security with user-specific encryption keys</p>
              <p><strong>Compliance:</strong> GDPR-ready with data portability and deletion rights</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyNotice 