import { supabase } from './supabase'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  message: string
  reformulated_query?: string
  data?: any
  charts?: any[]
  insights?: string[]
  recommendations?: string[]
  metrics?: Record<string, string>
}

class AIService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    this.baseUrl = 'https://api.openai.com/v1'
  }

  async analyzeData(userId: string, userMessage: string): Promise<AIResponse> {
    try {
      // Only use real AI - no fallbacks
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      return await this.fallbackAnalysis(userId, userMessage)
    } catch (error) {
      console.error('AI analysis error:', error)
      throw error
    }
  }



  private async fallbackAnalysis(userId: string, userMessage: string): Promise<AIResponse> {
    try {
      // 1. Fetch user's data sources and CSV data
      const { data: dataSources, error: sourcesError } = await supabase
        .from('data_sources')
        .select(`
          *,
          uploaded_csv_data (*)
        `)
        .eq('user_id', userId)

      if (sourcesError) throw sourcesError

      // 2. Prepare context from CSV data
      const csvData = dataSources?.flatMap(ds => ds.uploaded_csv_data) || []
      const dataContext = this.prepareDataContext(csvData)

      // 3. Create AI prompt with data context
      const prompt = this.createAnalysisPrompt(userMessage, dataContext)

      // 4. Call AI service
      const response = await this.callAI(prompt)

      // 5. Parse and structure the response
      return this.parseAIResponse(response)

    } catch (error) {
      console.error('Fallback analysis error:', error)
      return {
        message: "I'm having trouble analyzing your data right now. Please check your API configuration and try again.",
        insights: ['Error occurred during analysis']
      }
    }
  }

  private prepareDataContext(csvData: any[]): string {
    if (!csvData.length) {
      return "No CSV data available for analysis."
    }

    let context = "Available data sources:\n"
    
    csvData.forEach((data, index) => {
      const sampleData = data.data_json?.slice(0, 3) || []
      const columns = Object.keys(sampleData[0] || {})
      
      context += `\nDataset ${index + 1}: ${data.original_filename}\n`
      context += `Columns: ${columns.join(', ')}\n`
      context += `Sample data:\n${JSON.stringify(sampleData, null, 2)}\n`
    })

    return context
  }

  private createAnalysisPrompt(userMessage: string, dataContext: string): string {
    return `You are an expert data analyst. Your role is to:

1. INTELLIGENTLY REFORMULATE the user's question into a precise, professional data analysis query
2. ANALYZE the data thoroughly with specific numbers and metrics
3. PROVIDE actionable insights with concrete data points

Data Context:
${dataContext}

User Question: ${userMessage}

QUERY REFORMULATION GUIDELINES:
- Fix grammar, spelling, and clarity issues in the original question
- Convert casual language to professional data analysis terminology
- Identify the core analytical intent behind the question
- Add missing context or specificity that would improve analysis
- Use proper data analysis terminology (e.g., "top performers" instead of "who sold most")
- Clarify ambiguous terms and add precision to vague requests
- Structure the reformulated query to maximize analytical accuracy

EXAMPLES OF QUERY IMPROVEMENT:
- "who sold most" → "Identify the top-performing sales representatives by total revenue and units sold"
- "show me trends" → "Analyze sales trends by time period, product category, and geographic region"
- "what's our revenue" → "Calculate total revenue, revenue by product category, and revenue growth trends"

IMPORTANT INSTRUCTIONS:
- Always include SPECIFIC NUMBERS, percentages, and metrics in your response
- Reformulate the user's question into a professional data analysis query
- Provide concrete data points, not just qualitative statements
- Calculate totals, averages, rankings, and percentages where relevant
- Use Romanian currency (LEI) for monetary values
- Format numbers with appropriate precision (e.g., 1,234.56 LEI, 45.7%)

Please provide a JSON response with the following structure. Return ONLY the JSON object, no additional text, formatting, or markdown code blocks:

{
  "reformulated_query": "Professional, precise reformulation of the user's question with proper data analysis terminology",
  "message": "Your main response with specific numbers and data points",
  "insights": ["Specific insight with numbers", "Another insight with metrics"],
  "metrics": {
    "total_sales": "1,234,567 LEI",
    "top_performer": "Maria Popescu - 45,678 LEI",
    "average_performance": "12,345 LEI"
  },
  "recommendations": ["Specific recommendation with data backing", "Another actionable recommendation"]
}

CRITICAL: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text.

IMPORTANT: The response must be a valid JSON object that can be parsed directly. Do not wrap it in markdown or add any text before or after the JSON.`
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Calling OpenAI API with key:', this.apiKey.substring(0, 20) + '...')
    console.log('API URL:', `${this.baseUrl}/chat/completions`)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
        max_tokens: 1000
      })
    })

    console.log('OpenAI response status:', response.status)
    console.log('OpenAI response headers:', response.headers)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI error response:', errorText)
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  private parseAIResponse(aiResponse: string): AIResponse {
    console.log('Raw AI response:', aiResponse)
    
    try {
      // Clean the response - remove markdown formatting if present
      let cleanResponse = aiResponse.trim()
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('Cleaned response:', cleanResponse)
      
      // Try to parse as JSON first
      const parsed = JSON.parse(cleanResponse)
      console.log('Parsed JSON:', parsed)
      
      // If the parsed object has all the expected fields, use it
      if (parsed.message && parsed.reformulated_query) {
        return {
          message: parsed.message,
          reformulated_query: parsed.reformulated_query,
          insights: parsed.insights || [],
          metrics: parsed.metrics || {},
          recommendations: parsed.recommendations || []
        }
      } else {
        // If the AI returned the entire JSON as message, try to extract the actual message
        return {
          message: parsed.message || aiResponse,
          reformulated_query: parsed.reformulated_query,
          insights: parsed.insights || [],
          metrics: parsed.metrics || {},
          recommendations: parsed.recommendations || []
        }
      }
    } catch (error) {
      console.log('JSON parse error:', error)
      
      // If not JSON, check if it contains JSON-like structure
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          console.log('Extracted JSON:', parsed)
          return {
            message: parsed.message || aiResponse,
            reformulated_query: parsed.reformulated_query,
            insights: parsed.insights || [],
            metrics: parsed.metrics || {},
            recommendations: parsed.recommendations || []
          }
        } catch (extractError) {
          console.log('Extract parse error:', extractError)
          // If JSON parsing fails, return as plain message
          return {
            message: aiResponse,
            insights: ['Analysis completed']
          }
        }
      } else {
        // If not JSON, return as plain message
        return {
          message: aiResponse,
          insights: ['Analysis completed']
        }
      }
    }
  }
}

export const aiService = new AIService() 