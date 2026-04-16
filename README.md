# Igniral MCP Server

> **[Igniral](https://igniral.com)** — Production-Ready Backends with AI Speed

Model Context Protocol (MCP) server that bridges AI agents (Claude, Cursor, Antigravity, etc.) with [Igniral's](https://igniral.com) backend platform. Describe your API in plain English — Igniral generates the schema, CRUD endpoints, authentication, Swagger docs, and antivirus-protected file storage automatically.

## What is Igniral?

[Igniral](https://igniral.com) lets you generate 100% of your API infrastructure with a simple prompt, or build manually using a Visual Schema Builder. Everything is production-ready from the start:

- 🤖 **AI-Powered Generation** — Describe your data model, get a complete REST API instantly
- 🔐 **Built-in Auth & RBAC** — JWT authentication with role-based access control, no auth code needed
- 📄 **Always-Sync Swagger** — OpenAPI docs update automatically with every change
- 🛡️ **Antivirus File Storage** — Every uploaded file is scanned by ClamAV before reaching your infrastructure
- 📊 **Real-time Analytics** — Monitor API usage, error rates, and traffic from your dashboard
- 🗄️ **Managed Database** — Automatic backups and replication, zero DBA required

**Get started for free** at [igniral.com](https://igniral.com) → [Start Now](https://auth.igniral.com/subscribe)

## Prerequisites

1. **Create an Igniral account** at [igniral.com](https://auth.igniral.com/subscribe) (free tier available)
2. **Generate Agent API Keys** from the [Igniral Dashboard](https://auth.igniral.com/login) → Agent API Keys
3. **Have Node.js ≥ 18** installed on your machine

> **Important:** This is an MCP server — it runs inside your AI-powered IDE (Claude Desktop, Cursor, Antigravity, etc.), not directly from the terminal. You configure it once in your IDE settings, and the IDE handles starting and stopping it automatically.

## Quick Start

Choose your IDE and add the following configuration. Replace `agent-xxxxxxxxxxxx` and `your-client-secret` with your actual Agent API Key credentials.

### Claude Desktop

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "igniral": {
      "command": "npx",
      "args": ["-y", "igniral-mcp-server"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Cursor

Edit your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "igniral": {
      "command": "npx",
      "args": ["-y", "igniral-mcp-server"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Antigravity (Google)

Edit `~/.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "igniral": {
      "command": "npx",
      "args": ["-y", "igniral-mcp-server"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

> **Note:** Antigravity may not inherit your shell's `PATH`. Use the absolute path to `node` (e.g., `/opt/homebrew/Cellar/node/25.9.0_2/bin/node`) if you get "executable not found" errors.

That's it! After saving the configuration and restarting your IDE, you can ask your AI agent things like:

- *"Build me a gym management API"*
- *"Create a REST API for a pet store with products, orders, and users"*
- *"List my existing Igniral applications"*

## Tools

Once configured, the following tools are available to your AI agent:

| Tool | Description |
|------|-------------|
| `igniral_generate_schema_from_prompt` | Auto-generate a complete app from a natural language description |
| `igniral_create_application` | Create an empty application shell manually |
| `igniral_create_dynamic_endpoint` | Add API endpoints to an existing application |
| `igniral_list_applications` | List the user's existing applications |

## Architecture

```
AI Agent (Claude/Cursor)
    │
    ▼ (MCP Protocol - stdio)
┌──────────────────────────┐
│   Igniral MCP Server     │
│   ├─ TokenManager        │  ← OAuth2 client_credentials
│   ├─ Zod Validation      │
│   ├─ SSE Client          │
│   └─ HTTP Client         │
└────────────┬─────────────┘
             │ (HTTP + JWT with sub=userId)
     ┌───────┼───────┐
     ▼       ▼       ▼
auth-     ai-schema-  json-elements
server    builder     microservice
(token)   (auto-gen)  (CRUD)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `IGNIRAL_CLIENT_ID` | ✅ | Agent API Key client ID (from Dashboard) |
| `IGNIRAL_CLIENT_SECRET` | ✅ | Agent API Key client secret (shown once at creation) |
| `IGNIRAL_AUTH_URL` | ❌ | Auth server URL (default: `https://auth.igniral.com`) |
| `IGNIRAL_API_URL` | ❌ | API URL (default: `https://api.igniral.io`) |
| `IGNIRAL_AI_API_URL` | ❌ | AI API URL (default: `https://ai.igniral.com`) |

## Development (from source)

Only needed if you want to contribute or modify the server:

```bash
git clone https://github.com/igniral/igniral-mcp-server.git
cd igniral-mcp-server
npm install
cp .env.example .env   # Edit with your credentials
npm run dev             # Start in development mode
npm run inspect         # Test with MCP Inspector
```

## Links

- 🌐 **Website:** [igniral.com](https://igniral.com)
- 📖 **Documentation:** [igniral.com/docs](https://igniral.com/docs)
- 💬 **Community:** [Discord](https://discord.gg/ZrMbjPJh8w)
- 📧 **Support:** [support@igniral.com](mailto:support@igniral.com)

## License

MIT

