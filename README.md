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

## Authentication

This server uses **Agent API Keys** (OAuth2 `client_credentials` grant) to authenticate with Igniral's backend. Tokens are automatically obtained and renewed — you only need to provide your `clientId` and `clientSecret`.

Generate credentials from the **[Igniral Dashboard](https://auth.igniral.com/login) → Agent API Keys**.

## Quick Start (via NPM)

The easiest way to use this server is via `npx` — no cloning or installing required:

```bash
npx -y igniral-mcp-server
```

Or install globally:

```bash
npm install -g igniral-mcp-server
```

## Setup (from source)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Agent API Key credentials
   ```

3. **Build:**
   ```bash
   npm run build
   ```

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

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

### With Cursor

Add to your `.cursor/mcp.json`:

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

### With Antigravity (Google)

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

### Development

```bash
# Run in development mode
npm run dev

# Test with MCP Inspector
npm run inspect
```

## Tools

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

## Links

- 🌐 **Website:** [igniral.com](https://igniral.com)
- 📖 **Documentation:** [igniral.com/docs](https://igniral.com/docs)
- 💬 **Community:** [Discord](https://discord.gg/ZrMbjPJh8w)
- 📧 **Support:** [support@igniral.com](mailto:support@igniral.com)

## License

MIT
