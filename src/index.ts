#!/usr/bin/env node
/**
 * Igniral MCP Server — Entry Point
 *
 * A Model Context Protocol server that bridges AI agents (Claude, Cursor, etc.)
 * with Igniral's backend microservices for dynamic API creation and management.
 *
 * Transport: stdio (standard for IDE integrations like Cursor and Claude Desktop)
 *
 * Tools exposed:
 * 1. igniral_generate_schema_from_prompt — Auto-generate a complete app from description
 * 2. igniral_create_application — Create an empty app shell manually
 * 3. igniral_create_dynamic_endpoint — Add endpoints to an existing app
 * 4. igniral_list_applications — List the user's existing applications
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import { IgniralClient } from "./api/igniral-client.js";
import { executeGenerateSchema } from "./tools/generate-schema.js";
import { executeCreateApplication } from "./tools/create-application.js";
import { executeCreateEndpoint } from "./tools/create-endpoint.js";
import { executeListApplications } from "./tools/list-applications.js";
import { executeUpdateEndpoint } from "./tools/update-endpoint.js";

// ─── Bootstrap ──────────────────────────────────────────────────────────

let config: ReturnType<typeof loadConfig>;
let client: IgniralClient;

try {
  config = loadConfig();
  client = new IgniralClient(config);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n✖ ${message}\n`);
  console.error("Tip: Pass credentials via environment variables when configuring your MCP client:");
  console.error('  "env": { "IGNIRAL_CLIENT_ID": "...", "IGNIRAL_CLIENT_SECRET": "..." }\n');
  console.error("Get your Agent API Key at: https://igniral.com\n");
  process.exit(1);
}

const server = new McpServer({
  name: "igniral-mcp-server",
  version: "1.0.2",
});

// ─── Tool 1: Generate Schema from Prompt ────────────────────────────────

server.tool(
  "igniral_generate_schema_from_prompt",
  `Generates a complete application from a natural language description. 
This tool creates the application, ALL endpoints with their JSON schemas, 
roles, and permissions automatically. 

Use this when the user gives a general or ambiguous instruction like 
"build me a gym management app" or "create an API for a restaurant".

You do NOT need to call igniral_create_application or 
igniral_create_dynamic_endpoint after this — everything is created 
automatically. This may take 30-90 seconds to complete.

Returns the applicationId and a summary of what was created.`,
  {
    prompt: z
      .string()
      .describe(
        "Natural language description of the application to generate. " +
          "Be as detailed as possible about what the app should do and " +
          "what data it should manage. Minimum 10 characters."
      ),
  },
  async ({ prompt }) => {
    const result = await executeGenerateSchema(client, { prompt });
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ─── Tool 2: Create Application ─────────────────────────────────────────

server.tool(
  "igniral_create_application",
  `Creates an empty application shell (without endpoints). 
Use this when the user wants to manually build an application step by step, 
providing a specific name, description, and settings.

After creating the application, use igniral_create_dynamic_endpoint to add 
API endpoints one by one. Returns the applicationId needed for creating endpoints.

Do NOT use this after igniral_generate_schema_from_prompt — that tool 
already creates the application automatically.`,
  {
    name: z.string().describe("Name of the application (e.g., 'GymApp', 'Pet Store API')"),
    description: z.string().describe("Description of what the application does"),
    version: z.string().optional().describe("API version (default: 'v1')"),
    subdomain: z
      .string()
      .optional()
      .describe(
        "Custom subdomain for the API (lowercase, hyphens allowed). " +
          "If not provided, one is generated automatically."
      ),
    aiGeneratedContext: z
      .string()
      .optional()
      .describe("AI-generated context/documentation for the application"),
    isPrivate: z
      .boolean()
      .optional()
      .describe(
        "Whether the app is private (default: true). " +
          "Private apps require authentication for all endpoints. " +
          "Public apps can have some endpoints visible without auth."
      ),
  },
  async (params) => {
    const result = await executeCreateApplication(client, params);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ─── Tool 3: Create Dynamic Endpoint ────────────────────────────────────

server.tool(
  "igniral_create_dynamic_endpoint",
  `Creates a dynamic API endpoint within an existing application. 
Requires an applicationId from a previous igniral_create_application call. 

Use this iteratively to add all needed endpoints to the application. 
Each endpoint defines its data schema (JSON Schema format), HTTP methods, 
visibility (PUBLIC/PRIVATE), and security policy.

Security policies:
- NONE: Anyone with role permissions sees all data
- OWNER_ONLY: Users only see data they created (most common for personal data)
- CLAIM_FILTER: Filter data based on JWT claims (requires securityConfig)`,
  {
    applicationId: z.string().describe("ID of the application to add the endpoint to"),
    endpointPath: z
      .string()
      .describe(
        "URL path for the endpoint (e.g., '/products', '/users', '/orders'). " +
          "Must start with / and use lowercase letters, numbers, and hyphens."
      ),
    allowedMethods: z
      .array(z.string())
      .describe(
        "HTTP methods to enable: ['GET', 'POST', 'PUT', 'DELETE']. " +
          "Include all methods the endpoint should support."
      ),
    schemaDefinition: z
      .record(z.string(), z.unknown())
      .describe(
        "JSON Schema defining the data structure for this endpoint. " +
          'Must include "$schema", "type": "object", and "properties". ' +
          "Each property needs a type (string, number, integer, boolean, array, object)."
      ),
    type: z
      .enum(["JSON", "FILE"])
      .optional()
      .describe("Endpoint type: 'JSON' for data APIs (default), 'FILE' for file uploads"),
    visibility: z
      .enum(["PUBLIC", "PRIVATE"])
      .optional()
      .describe(
        "Endpoint visibility: 'PRIVATE' (default, requires auth) or " +
          "'PUBLIC' (accessible without auth, only for public apps)"
      ),
    securityPolicy: z
      .enum(["NONE", "OWNER_ONLY", "CLAIM_FILTER"])
      .optional()
      .describe(
        "Data access control: 'NONE' (shared data), " +
          "'OWNER_ONLY' (users see only their data), " +
          "'CLAIM_FILTER' (filter by JWT claims, requires securityConfig)"
      ),
    securityConfig: z
      .object({
        claimFilterRules: z.array(
          z.object({
            payloadPath: z.string(),
            claimName: z.string(),
          })
        ),
      })
      .optional()
      .describe(
        "Required when securityPolicy is 'CLAIM_FILTER'. " +
          "Defines which JWT claim maps to which data field for filtering."
      ),
    endpointDocumentation: z
      .string()
      .optional()
      .describe("Human-readable documentation for this endpoint"),
  },
  async (params) => {
    const result = await executeCreateEndpoint(client, params as Record<string, unknown>);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ─── Tool 4: List Applications ──────────────────────────────────────────

server.tool(
  "igniral_list_applications",
  `Lists all applications owned by the current user. 
Use this to check what applications already exist before creating new ones, 
or to get the applicationId of an existing application.

Takes no parameters — the user is identified by the configured service token.`,
  {},
  async () => {
    const result = await executeListApplications(client);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ─── Tool 5: Update Dynamic Endpoint ────────────────────────────────────

server.tool(
  "igniral_update_dynamic_endpoint",
  `Updates a dynamic API endpoint within an existing application. 
Requires an endpointId from a previous list_applications call. 

Use this to modify the schema or configuration of an already existing endpoint.`,
  {
    endpointId: z.string().describe("ID of the endpoint to update"),
    applicationId: z.string().describe("ID of the application the endpoint belongs to"),
    endpointPath: z
      .string()
      .describe(
        "URL path for the endpoint (e.g., '/products', '/users', '/orders'). " +
          "Must start with / and use lowercase letters, numbers, and hyphens."
      ),
    allowedMethods: z
      .array(z.string())
      .describe(
        "HTTP methods to enable: ['GET', 'POST', 'PUT', 'DELETE']. " +
          "Include all methods the endpoint should support."
      ),
    schemaDefinition: z
      .record(z.string(), z.unknown())
      .describe(
        "JSON Schema defining the data structure for this endpoint. " +
          'Must include "$schema", "type": "object", and "properties". ' +
          "Each property needs a type (string, number, integer, boolean, array, object)."
      ),
    type: z
      .enum(["JSON", "FILE"])
      .optional()
      .describe("Endpoint type: 'JSON' for data APIs (default), 'FILE' for file uploads"),
    visibility: z
      .enum(["PUBLIC", "PRIVATE"])
      .optional()
      .describe(
        "Endpoint visibility: 'PRIVATE' (default, requires auth) or " +
          "'PUBLIC' (accessible without auth, only for public apps)"
      ),
    securityPolicy: z
      .enum(["NONE", "OWNER_ONLY", "CLAIM_FILTER"])
      .optional()
      .describe(
        "Data access control: 'NONE' (shared data), " +
          "'OWNER_ONLY' (users see only their data), " +
          "'CLAIM_FILTER' (filter by JWT claims, requires securityConfig)"
      ),
    securityConfig: z
      .object({
        claimFilterRules: z.array(
          z.object({
            payloadPath: z.string(),
            claimName: z.string(),
          })
        ),
      })
      .optional()
      .describe(
        "Required when securityPolicy is 'CLAIM_FILTER'. " +
          "Defines which JWT claim maps to which data field for filtering."
      ),
    endpointDocumentation: z
      .string()
      .optional()
      .describe("Human-readable documentation for this endpoint"),
  },
  async (params) => {
    const result = await executeUpdateEndpoint(client, params as Record<string, unknown>);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ─── Start Server ───────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (not stdout, which is used by MCP protocol)
  console.error("Igniral MCP Server v1.0.0 started");
  console.error(`Connected to API: ${config.apiUrl}`);
  console.error(`Connected to AI API: ${config.aiApiUrl}`);
  console.error(`Auth server: ${config.authUrl}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n✖ Fatal error: ${message}\n`);
  process.exit(1);
});
