import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { Database, FileText, Check, X } from 'lucide-react'

interface DataSource {
  id: string
  original_filename: string
  created_at: string
  uploaded_csv_data: Array<{
    id: string
    original_filename: string
    data_json: any[]
  }>
}

interface DatasetSelectorProps {
  user: User
  selectedDatasets: string[]
  onDatasetToggle: (datasetId: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

const DatasetSelector = ({ 
  user, 
  selectedDatasets, 
  onDatasetToggle, 
  onSelectAll, 
  onClearAll 
}: DatasetSelectorProps) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadDataSources()
  }, [])

  const loadDataSources = async () => {
    try {
      console.log('🔍 Loading data sources for user:', user.id)
      
      // Get data sources with their uploaded CSV data
      const { data: dataSources, error: sourcesError } = await supabase
        .from('data_sources')
        .select(`
          id,
          name,
          type,
          created_at,
          uploaded_csv_data (
            id,
            original_filename,
            data_json,
            uploaded_at
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'csv')
        .order('created_at', { ascending: false })

      if (sourcesError) throw sourcesError
      
      console.log('📊 Found data sources:', dataSources?.length || 0)
      console.log('📋 Data sources:', dataSources)

      // Transform the data to match our interface
      const transformedData = dataSources?.map(source => ({
        id: source.id,
        original_filename: source.name,
        created_at: source.created_at,
        uploaded_csv_data: source.uploaded_csv_data || []
      })) || []

      setDataSources(transformedData)
    } catch (error) {
      console.error('Error loading data sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const getRowCount = (dataJson: any[]) => {
    return dataJson?.length || 0
  }

  const getColumnCount = (dataJson: any[]) => {
    if (!dataJson || dataJson.length === 0) return 0
    return Object.keys(dataJson[0] || {}).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Dataset Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center justify-between w-full"
        title="Select datasets to analyze"
      >
        <div className="flex items-center">
          <Database className="h-4 w-4 mr-2" />
          <span className="text-sm">
            {selectedDatasets.length === 0 
              ? 'Select datasets' 
              : `${selectedDatasets.length} dataset${selectedDatasets.length === 1 ? '' : 's'} selected`
            }
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {selectedDatasets.length > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
              {selectedDatasets.length}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Select Datasets</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onSelectAll}
                className="text-xs btn-primary py-1 px-2"
              >
                Select All
              </button>
              <button
                onClick={onClearAll}
                className="text-xs btn-secondary py-1 px-2"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Dataset List */}
          <div className="p-2">
            {dataSources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No datasets uploaded</p>
                <p className="text-xs">Upload CSV files to start analyzing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSources.map((source) => (
                  <div key={source.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {source.original_filename}
                          </h4>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Uploaded: {formatDate(source.created_at)}</div>
                          {source.uploaded_csv_data?.map((csv) => (
                            <div key={csv.id} className="text-xs text-gray-600">
                              {csv.original_filename} ({getRowCount(csv.data_json)} rows, {getColumnCount(csv.data_json)} columns)
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => onDatasetToggle(source.id)}
                        className={`ml-3 p-1 rounded-full transition-colors ${
                          selectedDatasets.includes(source.id)
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatasetSelector 