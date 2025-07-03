# AI-Powered Conversational Data Analyst

A groundbreaking tool for companies of all sizes to gain instant, AI-driven insights from their data via natural language chat.

## Core Functionality

This product serves as an "AI Data Analyst" that:
- Understands user questions in natural language
- Connects to diverse data sources (BI solutions, CSV/Excel uploads)
- Autonomously generates intelligent charts, tables, and reports
- Provides instant insights without data migration

## Key Technical Pillars

- **Universal Data Connectivity**: Direct APIs to major BI/Data Warehouse solutions for enterprises; secure CSV/Excel upload for others
- **Advanced AI Core**: Leveraging Gemini 2.0 Flash for NLU and Imagen 3.0 for dynamic visualizations
- **Scalable Cloud-Native Platform**: Microservices architecture with Supabase for platform data
- **Enterprise Security & RBAC**: Robust authentication and authorization

## Project Structure

```
AI DATA CHAT/
├── frontend/                 # React TypeScript application
├── supabase/                # Supabase backend and migrations
│   ├── migrations/          # Database schema migrations
│   └── functions/           # Edge Functions
└── README.md               # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-DATA-CHAT
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Update .env.local with your Supabase credentials
   npm run dev
   ```

3. **Supabase Setup**
   ```bash
   cd supabase
   supabase start
   supabase db reset
   ```

## Development Phases

- **Phase 1**: Foundational Setup & Universal Data Ingestion Framework ✅
- **Phase 2**: Advanced AI Core for NLP and Data Querying
- **Phase 3**: Dynamic Visualization Generation
- **Phase 4**: Enterprise Features & Scaling

## License

MIT License 