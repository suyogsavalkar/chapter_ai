# Chapter

**Your AI workspace where you can get work done across apps just by texting**

Chapter is an AI-powered chat interface that connects to your favorite apps and services through Composio integrations. Instead of switching between multiple applications, simply describe what you need to accomplish in natural language, and Chapter handles the rest.

## What is Chapter?

Chapter lets you interact with your connected apps through a conversational AI interface. You can:

- Send emails and manage your Gmail
- Schedule meetings in Google Calendar
- Create and manage tasks in Linear, Notion, or Todoist
- Work with GitHub repositories and issues
- Chat with your team on Slack
- And much more through app integrations

Just tell Chapter what you want to do, and it will execute tasks across your connected applications.

## Getting Started

Note - Chapter is a fork of Chat-SDK and Vercel.

### Prerequisites

- **Node.js** (version 18 or higher)
- **pnpm** (recommended) or npm
- **Git**

### Clone and Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/chapter.git
   cd chapter
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and configure the required variables based on what you see in `.env.example`:

   ```bash
   # Generate a random secret: https://generate-secret.vercel.app/32
   AUTH_SECRET=your-auth-secret-here

   # Google OAuth (for authentication)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # AI Providers (configure at least one)
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENROUTER_API_KEY=your-openrouter-key

   # Database
   POSTGRES_URL=your-postgres-connection-string

   # File Storage
   BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

   # Redis (for caching)
   REDIS_URL=your-redis-url

   # Composio (for app integrations)
   COMPOSIO_API_KEY=your-composio-api-key

   # Composio Integration IDs (create these in Composio dashboard)
   NEXT_PUBLIC_COMPOSIO_AUTH_GITHUB=your-github-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_GMAIL=your-gmail-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_GOOGLECALENDAR=your-calendar-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_LINEAR=your-linear-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_NOTION=your-notion-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_SLACK=your-slack-integration-id
   NEXT_PUBLIC_COMPOSIO_AUTH_TODOIST=your-todoist-integration-id
   ```

4. **Set up the database**

   ```bash
   pnpm db:migrate
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   Chapter will be running at [http://localhost:3000](http://localhost:3000)

## Required Services Setup

### Database (PostgreSQL)

You'll need a PostgreSQL database. Get one from:

- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres/quickstart) (recommended)
- [Neon](https://neon.tech) (free tier available)
- [Supabase](https://supabase.com) (free tier available)

### File Storage (Vercel Blob)

For file uploads and storage:

- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (recommended)

### Redis (Optional but recommended)

For caching and performance:

- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (recommended)
- [Upstash Redis](https://upstash.com) (free tier available)

### AI Provider

Configure at least one AI provider:

- **Google Gemini**: Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Anthropic Claude**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **OpenRouter**: Get API key from [OpenRouter](https://openrouter.ai/keys)

### Composio (App Integrations)

1. Sign up at [Composio](https://app.composio.dev/)
2. Get your API key from the dashboard
3. Create integrations for the apps you want to connect (GitHub, Gmail, etc.)
4. Copy the integration IDs to your environment variables

## Usage

Once Chapter is running:

1. **Sign in** with your Google account
2. **Connect apps** through the integrations panel
3. **Start chatting** - try commands like:
   - "Show me my recent emails"
   - "Create a new GitHub issue for the bug we discussed"
   - "Schedule a meeting with the team for tomorrow at 2 PM"
   - "Add a task to my Todoist for reviewing the proposal"

## Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run linting
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open database studio
pnpm test         # Run tests
```

### Project Structure

```
chapter/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (chat)/            # Main chat interface
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── ai/               # AI provider integrations
│   ├── db/               # Database schema and queries
│   └── services/         # External service integrations
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

## License

Check the [LICENSE](LICENSE) file for details.
