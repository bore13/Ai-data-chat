import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User, DataSource, CSVPreview, BIConnectionConfig } from '../types'
import { 
  Database, 
  Plus, 
  ArrowLeft, 
  FileText, 
  Settings, 
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react'
import Papa from 'papaparse'

interface DataSourcesPageProps {
  user: User
}

const DataSourcesPage = ({ user }: DataSourcesPageProps) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null)
  const [connectionType, setConnectionType] = useState<'csv' | 'bi'>('csv')
  const [biConfig, setBiConfig] = useState<BIConnectionConfig>({})
  const [sourceName, setSourceName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchDataSources()
  }, [])

  const fetchDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDataSources(data || [])
    } catch (error: any) {
      setError('Failed to fetch data sources')
      console.error('Error fetching data sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setSourceName(file.name.replace(/\.[^/.]+$/, '')) // Remove extension for default name

    // Preview CSV
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setCsvPreview({
          headers: results.meta.fields || [],
          rows: results.data.slice(0, 5) as string[][],
          totalRows: results.data.length
        })
      },
      error: (error) => {
        setError('Failed to parse CSV file')
        console.error('CSV parsing error:', error)
      }
    })
  }

  const handleUploadCSV = async () => {
    if (!selectedFile || !sourceName.trim()) return

    setUploading(true)
    setError('')

    try {
      // Create data source record
      const { data: dataSource, error: sourceError } = await supabase
        .from('data_sources')
        .insert({
          user_id: user.id,
          name: sourceName,
          type: 'csv',
          config_json: {
            filename: selectedFile.name,
            size: selectedFile.size,
            lastModified: selectedFile.lastModified
          }
        })
        .select()
        .single()

      if (sourceError) throw sourceError

      // Parse and store CSV data
      Papa.parse(selectedFile, {
        header: true,
        complete: async (results) => {
          try {
            const { error: dataError } = await supabase
              .from('uploaded_csv_data')
              .insert({
                data_source_id: dataSource.id,
                original_filename: selectedFile.name,
                data_json: results.data
              })

            if (dataError) throw dataError

            // Reset form and refresh list
            setSelectedFile(null)
            setCsvPreview(null)
            setSourceName('')
            setShowAddForm(false)
            await fetchDataSources()
          } catch (error: any) {
            setError('Failed to store CSV data')
            console.error('Error storing CSV data:', error)
          }
        },
        error: (error) => {
          setError('Failed to parse CSV file')
          console.error('CSV parsing error:', error)
        }
      })
    } catch (error: any) {
      setError('Failed to create data source')
      console.error('Error creating data source:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleConnectBI = async () => {
    if (!sourceName.trim()) return

    setUploading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('data_sources')
        .insert({
          user_id: user.id,
          name: sourceName,
          type: 'powerbi', // TODO: Make this dynamic based on selected BI type
          config_json: biConfig
        })

      if (error) throw error

      // Reset form and refresh list
      setSourceName('')
      setBiConfig({})
      setShowAddForm(false)
      await fetchDataSources()
    } catch (error: any) {
      setError('Failed to create BI connection')
      console.error('Error creating BI connection:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data source?')) return

    try {
      const { error } = await supabase
        .from('data_sources')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchDataSources()
    } catch (error: any) {
      setError('Failed to delete data source')
      console.error('Error deleting data source:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'csv':
      case 'excel':
        return <FileText className="h-5 w-5" />
      case 'powerbi':
      case 'tableau':
      case 'snowflake':
      case 'bigquery':
        return <Database className="h-5 w-5" />
      default:
        return <Settings className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex items-center mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">Data Sources</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 flex items-center p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {/* Add Data Source Form */}
        {showAddForm && (
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add New Data Source</h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedFile(null)
                  setCsvPreview(null)
                  setSourceName('')
                  setBiConfig({})
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Connection Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="csv"
                      checked={connectionType === 'csv'}
                      onChange={(e) => setConnectionType(e.target.value as 'csv')}
                      className="mr-2"
                    />
                    CSV/Excel Upload
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="bi"
                      checked={connectionType === 'bi'}
                      onChange={(e) => setConnectionType(e.target.value as 'bi')}
                      className="mr-2"
                    />
                    BI Solution Connection
                  </label>
                </div>
              </div>

              {/* Source Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Source Name
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Enter a name for this data source"
                  className="input-field"
                />
              </div>

              {/* CSV Upload Section */}
              {connectionType === 'csv' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV/Excel File
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="input-field"
                  />
                  
                  {csvPreview && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Preview ({csvPreview.totalRows} rows)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              {csvPreview.headers.map((header, index) => (
                                <th key={index} className="text-left p-2 bg-gray-200">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {csvPreview.headers.map((_header, colIndex) => (
                                  <td key={colIndex} className="p-2 border-t">{row[colIndex] || ''}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUploadCSV}
                    disabled={!selectedFile || !sourceName.trim() || uploading}
                    className="btn-primary mt-4 w-full"
                  >
                    {uploading ? 'Uploading...' : 'Upload & Create Data Source'}
                  </button>
                </div>
              )}

              {/* BI Connection Section */}
              {connectionType === 'bi' && (
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Power BI Workspace ID
                      </label>
                      <input
                        type="text"
                        value={biConfig.workspace_id || ''}
                        onChange={(e) => setBiConfig({ ...biConfig, workspace_id: e.target.value })}
                        placeholder="Enter Power BI workspace ID"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={biConfig.api_key || ''}
                        onChange={(e) => setBiConfig({ ...biConfig, api_key: e.target.value })}
                        placeholder="Enter API key"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleConnectBI}
                    disabled={!sourceName.trim() || uploading}
                    className="btn-primary mt-4 w-full"
                  >
                    {uploading ? 'Connecting...' : 'Connect to BI Solution'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Sources List */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Data Sources</h2>
          
          {dataSources.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No data sources connected yet</p>
              <p className="text-sm text-gray-400">Add your first data source to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dataSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-primary-600">
                      {getTypeIcon(source.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{source.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{source.type} • Created {new Date(source.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="btn-secondary flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="btn-secondary flex items-center text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default DataSourcesPage 