# Igniral MCP Server

Model Context Protocol server that bridges AI agents (Claude, Cursor, etc.) with Igniral's backend APIs for dynamic API creation and management.

## Authentication

This server uses **Agent API Keys** (OAuth2 `client_credentials` grant) to authenticate with Igniral's backend. Tokens are automatically obtained and renewed — you only need to provide your `clientId` and `clientSecret`.

Generate credentials from the **Igniral Dashboard → Agent API Keys**.

## Setup

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
      "command": "node",
      "args": ["/path/to/igniral-mcp-server/dist/index.js"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret",
        "IGNIRAL_AUTH_URL": "https://auth.igniral.io",
        "IGNIRAL_API_URL": "https://api.igniral.com",
        "IGNIRAL_AI_API_URL": "https://ai-schema.igniral.com"
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
      "args": ["tsx", "/path/to/igniral-mcp-server/src/index.ts"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret",
        "IGNIRAL_AUTH_URL": "https://auth.igniral.io",
        "IGNIRAL_API_URL": "https://api.igniral.com",
        "IGNIRAL_AI_API_URL": "https://ai-schema.igniral.com"
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
      "command": "node",
      "args": ["/path/to/igniral-mcp-server/dist/index.js"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "your-client-secret",
        "IGNIRAL_AUTH_URL": "https://auth.igniral.io",
        "IGNIRAL_API_URL": "https://api.igniral.com",
        "IGNIRAL_AI_API_URL": "https://ai-schema.igniral.com"
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
| `IGNIRAL_AUTH_URL` | ❌ | Auth server URL (default: `https://auth.igniral.io`) |
| `IGNIRAL_API_URL` | ✅ | Base URL for json-elements microservice |
| `IGNIRAL_AI_API_URL` | ✅ | Base URL for ai-schema-builder microservice |
