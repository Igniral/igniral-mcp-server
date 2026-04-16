/**
 * Response Wrapper
 *
 * Wraps raw API responses in instructional text that helps the AI agent
 * understand results and take appropriate next actions.
 * This is the "trick" that makes MCP effective — the agent reads plain
 * text, not raw JSON.
 */

import { ApiResponse } from "../api/igniral-client.js";

/**
 * Wraps a successful application creation response.
 */
export function wrapApplicationCreated(data: Record<string, unknown>): string {
  const id = data.id || "unknown";
  const name = data.name || "unknown";
  const subdomain = data.subdomain || "none";

  return [
    `✅ Success. Application created.`,
    ``,
    `• Application ID: ${id}`,
    `• Name: ${name}`,
    `• Subdomain: ${subdomain}`,
    ``,
    `You now have the applicationId needed to create endpoints.`,
    `Use the igniral_create_dynamic_endpoint tool to add API endpoints to this application.`,
    `Ask the user what data/resources their application should manage (e.g., users, products, orders).`,
  ].join("\n");
}

/**
 * Wraps a successful endpoint creation response.
 */
export function wrapEndpointCreated(data: Record<string, unknown>): string {
  const id = data.id || "unknown";
  const path = data.endpointPath || "unknown";
  const methods = Array.isArray(data.allowedMethods)
    ? (data.allowedMethods as string[]).join(", ")
    : "unknown";
  const visibility = data.visibility || "PRIVATE";
  const securityPolicy = data.securityPolicy || "NONE";

  return [
    `✅ Success. Dynamic endpoint created.`,
    ``,
    `• Endpoint ID: ${id}`,
    `• Path: ${path}`,
    `• Methods: ${methods}`,
    `• Visibility: ${visibility}`,
    `• Security Policy: ${securityPolicy}`,
    ``,
    `Ask the user if they want to create another endpoint for this application,`,
    `or if the application is ready for use.`,
  ].join("\n");
}

/**
 * Wraps a successful schema generation (Tool 1) response.
 */
export function wrapGenerationComplete(data: Record<string, unknown>): string {
  const applicationId = data.applicationId || "unknown";
  const applicationName = data.applicationName || "unknown";

  return [
    `✅ Success. Application fully generated.`,
    ``,
    `• Application ID: ${applicationId}`,
    `• Application Name: ${applicationName}`,
    ``,
    `The application was created with all endpoints, roles, and permissions automatically.`,
    `You do NOT need to call create_application or create_endpoint — everything is already set up.`,
    ``,
    `Show this information to the user and ask if they would like to make any modifications.`,
  ].join("\n");
}

/**
 * Wraps a list of applications response.
 */
export function wrapApplicationList(
  data: Record<string, unknown>
): string {
  // The API returns a Page object with content array
  const content = (data.content as Record<string, unknown>[]) || [];

  if (content.length === 0) {
    return [
      `ℹ️ The user has no applications yet.`,
      ``,
      `You can help them create one using:`,
      `• igniral_generate_schema_from_prompt — for automatic generation from a description`,
      `• igniral_create_application — for manual step-by-step creation`,
    ].join("\n");
  }

  const appLines = content.map((app, i) => {
    const status = app.status ? "🟢 Active" : "🔴 Inactive";
    const privacy = app.private ? "🔒 Private" : "🌐 Public";
    return `${i + 1}. ${app.name} (ID: ${app.id}) — ${status} | ${privacy}`;
  });

  return [
    `📋 User's applications (${content.length} total):`,
    ``,
    ...appLines,
    ``,
    `To add endpoints to an existing application, use igniral_create_dynamic_endpoint with the application ID.`,
  ].join("\n");
}
