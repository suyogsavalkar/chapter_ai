# Chapter

<p align="center">
  <strong>Your AI workspace where you can get work done across apps just by texting</strong>
</p>

<p align="center">
  Chapter transforms how you interact with your digital workspace by providing a unified AI interface that connects to all your favorite apps and services. Instead of switching between multiple applications, simply describe what you need to accomplish in natural language, and Chapter handles the rest.
</p>

## What is Chapter?

Chapter is an intelligent AI workspace that acts as your personal assistant across all your connected applications. Whether you need to:

- Send emails and schedule meetings
- Create documents and presentations
- Manage tasks and projects
- Analyze data and generate reports
- Search across all your files and conversations
- Automate workflows between different apps

Just tell Chapter what you want to do in plain English, and it will execute tasks across your connected applications seamlessly.

## Key Features

### 🤖 **Natural Language Interface**

Interact with all your apps using conversational AI. No need to remember complex commands or navigate through multiple interfaces.

### 🔗 **Universal App Integration**

Connect Chapter to your existing workflow with support for:

- **Communication**: Gmail, Slack, Microsoft Teams, Discord
- **Productivity**: Google Workspace, Microsoft 365, Notion, Airtable
- **Development**: GitHub, GitLab, Jira, Linear
- **Design**: Figma, Adobe Creative Suite
- \*\*And many more through our extensible plugin system

### 🧠 **Context-Aware Intelligence**

Chapter understands your work context and can:

- Reference previous conversations and decisions
- Maintain project context across sessions
- Learn your preferences and workflows
- Suggest relevant actions based on your current tasks

### 🔒 **Privacy & Security First**

- End-to-end encryption for all communications
- Granular permission controls for each connected app
- Local data processing options available
- SOC 2 Type II compliant infrastructure

### ⚡ **Powerful Automation**

- Create custom workflows that span multiple applications
- Set up intelligent triggers and notifications
- Batch process repetitive tasks
- Schedule and automate routine operations

## Getting Started

### Prerequisites

Before you begin, make sure you have the following installed:

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

   Edit `.env.local` and configure the following required variables:

   ```bash
   # Authentication
   AUTH_SECRET=your-auth-secret-here
   NEXTAUTH_URL=http://localhost:3000

   # Database (Neon Postgres)
   DATABASE_URL=your-neon-database-url

   # AI Provider (choose one or multiple)
   OPENAI_API_KEY=your-openai-key
   ANTHROPIC_API_KEY=your-anthropic-key

   # App Integrations (configure as needed)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   SLACK_CLIENT_ID=your-slack-client-id
   SLACK_CLIENT_SECRET=your-slack-client-secret

   # Optional: Vercel AI Gateway
   AI_GATEWAY_API_KEY=your-ai-gateway-key
   ```

4. **Set up the database**

   ```bash
   pnpm db:push
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   Chapter will be running at [http://localhost:3000](http://localhost:3000)

### First Time Setup

1. **Create your account** - Visit the app and sign up with your preferred authentication method

2. **Connect your first app** - Start by connecting one of your frequently used applications (Gmail, Slack, etc.)

3. **Try your first command** - Ask Chapter to do something simple like "Show me my recent emails" or "What meetings do I have today?"

4. **Explore integrations** - Visit the Apps section to connect more of your workflow tools

## Configuration

### Database Setup

Chapter uses Neon Postgres for data persistence. To set up your database:

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project and database
3. Copy the connection string to your `.env.local` file
4. Run the database migrations: `pnpm db:push`

### AI Provider Configuration

Chapter supports multiple AI providers. Configure at least one:

**OpenAI (Recommended)**

```bash
OPENAI_API_KEY=sk-your-openai-key
```

**Anthropic Claude**

```bash
ANTHROPIC_API_KEY=your-anthropic-key
```

**Vercel AI Gateway (For production)**

```bash
AI_GATEWAY_API_KEY=your-gateway-key
```

### App Integrations

Each connected app requires OAuth credentials. Here's how to set up the most common ones:

#### Google Workspace

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail, Calendar, and Drive APIs
4. Create OAuth 2.0 credentials
5. Add your credentials to `.env.local`

#### Slack

1. Visit [Slack API](https://api.slack.com/apps)
2. Create a new app
3. Configure OAuth scopes for the permissions you need
4. Add credentials to `.env.local`

#### GitHub

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth app
3. Set authorization callback URL to `http://localhost:3000/api/auth/callback/github`
4. Add credentials to `.env.local`

## Usage Examples

Once Chapter is running, you can interact with it using natural language:

### Email Management

```
"Send an email to john@company.com about the project update"
"Show me all unread emails from this week"
"Schedule a meeting with the design team for tomorrow at 2 PM"
```

### Document Creation

```
"Create a project proposal document in Google Docs"
"Generate a weekly report based on our Slack conversations"
"Make a presentation about our Q4 results"
```

### Task Management

```
"Add a task to follow up with the client next week"
"Show me all overdue tasks across my project management tools"
"Create a new project in Linear for the mobile app redesign"
```

### Cross-App Workflows

```
"When I receive an email with 'urgent' in the subject, create a high-priority task in Todoist"
"Summarize today's Slack messages and add them to my daily notes in Notion"
"Create a GitHub issue for every bug report in our support channel"
```

## Development

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
│   └── integrations/     # App integration logic
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

### Adding New Integrations

To add support for a new app:

1. Create integration file in `lib/integrations/`
2. Implement OAuth flow in `app/api/auth/`
3. Add UI components in `components/apps/`
4. Update the apps configuration

### Running Tests

```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run end-to-end tests
pnpm test:e2e
```

## Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub**

2. **Deploy to Vercel**
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/chapter)

3. **Configure environment variables** in the Vercel dashboard

4. **Set up your custom domain** (optional)

### Self-Hosting

Chapter can be deployed to any platform that supports Node.js:

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## Support

- **Documentation**: [docs.chapter.ai](https://docs.chapter.ai)
- **Community**: [Discord](https://discord.gg/chapter)
- **Issues**: [GitHub Issues](https://github.com/your-org/chapter/issues)
- **Email**: support@chapter.ai

## License

Chapter is open source software licensed under the [MIT License](LICENSE).

---

**Ready to transform your workflow?** Clone Chapter today and experience the future of AI-powered productivity.
