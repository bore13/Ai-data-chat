export interface User {
  id: string
  email: string
  full_name?: string
  company?: string
}

export interface DataSource {
  id: string
  user_id: string
  name: string
  type: 'csv' | 'excel' | 'powerbi' | 'tableau' | 'snowflake' | 'bigquery'
  config_json: any
  created_at: string
}

export interface CSVData {
  id: string
  data_source_id: string
  original_filename: string
  data_json: any
  uploaded_at: string
}

export interface BIConnectionConfig {
  // Power BI
  workspace_id?: string
  powerbi_dataset_id?: string
  
  // Tableau
  server_url?: string
  site_id?: string
  tableau_project_id?: string
  
  // Snowflake
  account?: string
  warehouse?: string
  database?: string
  schema?: string
  
  // BigQuery
  bigquery_project_id?: string
  bigquery_dataset_id?: string
  
  // Common
  api_key?: string
  username?: string
  password?: string
}

export interface CSVPreview {
  headers: string[]
  rows: string[][]
  totalRows: number
} 