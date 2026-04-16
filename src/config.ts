/**
 * Igniral MCP Server — Configuration
 *
 * Reads and validates environment variables required to connect
 * to Igniral's backend microservices.
 */

export interface IgniralConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiUrl: string;
  aiApiUrl: string;
}

/**
 * Loads configuration from environment variables.
 * Throws if any required variable is missing.
 */
export function loadConfig(): IgniralConfig {
  const clientId = process.env.IGNIRAL_CLIENT_ID;
  const clientSecret = process.env.IGNIRAL_CLIENT_SECRET;
  const authUrl = process.env.IGNIRAL_AUTH_URL || "https://auth.igniral.com";
  const apiUrl = process.env.IGNIRAL_API_URL || "https://api.igniral.io";
  const aiApiUrl = process.env.IGNIRAL_AI_API_URL || "https://ai.igniral.com";

  const missing: string[] = [];
  if (!clientId) missing.push("IGNIRAL_CLIENT_ID");
  if (!clientSecret) missing.push("IGNIRAL_CLIENT_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `See .env.example for the expected configuration.`
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    authUrl: authUrl.replace(/\/$/, ""),
    apiUrl: apiUrl.replace(/\/$/, ""),
    aiApiUrl: aiApiUrl.replace(/\/$/, ""),
  };
}
