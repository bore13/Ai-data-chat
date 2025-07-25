import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, message, dataContext } = await req.json()

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch user's data sources
    const { data: dataSources, error: sourcesError } = await supabase
      .from('data_sources')
      .select(`
        *,
        uploaded_csv_data (*)
      `)
      .eq('user_id', userId)

    if (sourcesError) {
      throw new Error(`Failed to fetch data sources: ${sourcesError.message}`)
    }

    // Prepare data context
    const csvData = dataSources?.flatMap(ds => ds.uploaded_csv_data) || []
    const analysisContext = prepareDataContext(csvData)

    // Call OpenAI for analysis
    const aiResponse = await callOpenAI(message, analysisContext)

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        dataSourcesCount: dataSources?.length || 0,
        csvFilesCount: csvData.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

function prepareDataContext(csvData: any[]): string {
  if (!csvData.length) {
    return "No CSV data available for analysis."
  }

  let context = "Available data sources:\n"
  
  csvData.forEach((data, index) => {
    const sampleData = data.data_json?.slice(0, 5) || []
    const columns = Object.keys(sampleData[0] || {})
    
    context += `\nDataset ${index + 1}: ${data.original_filename}\n`
    context += `Columns: ${columns.join(', ')}\n`
    context += `Total rows: ${data.data_json?.length || 0}\n`
    context += `Sample data:\n${JSON.stringify(sampleData, null, 2)}\n`
  })

  return context
}

async function callOpenAI(userMessage: string, dataContext: string): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `You are an expert data analyst. Analyze the following data and provide insights based on the user's question.

Data Context:
${dataContext}

User Question: ${userMessage}

Please provide:
1. A clear, actionable response
2. Key insights from the data
3. Specific recommendations
4. Any relevant calculations or metrics

Format your response as JSON with the following structure:
{
  "message": "Your main response to the user",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "metrics": {"metric1": "value1", "metric2": "value2"},
  "recommendations": ["recommendation 1", "recommendation 2"]
}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert data analyst. Provide clear, actionable insights based on data analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  try {
    return JSON.parse(content)
  } catch {
    return {
      message: content,
      insights: ['Analysis completed'],
      recommendations: []
    }
  }
} 