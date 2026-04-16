/**
 * Error Handler
 *
 * Maps HTTP error responses from Igniral's backend into clear,
 * actionable messages for the AI agent. Includes instructions on
 * whether to retry, modify input, or ask the user for help.
 */

import { ApiResponse } from "../api/igniral-client.js";

/**
 * Translates an API error response into an instructional message
 * for the AI agent.
 *
 * @param response The failed API response
 * @param context  Description of what was being attempted (e.g., "creating application")
 * @returns A formatted error message with guidance for the agent
 */
export function handleApiError(
  response: ApiResponse,
  context: string
): string {
  const status = response.status;
  const serverMessage = response.error || "Unknown error";

  switch (status) {
    case 400:
      return [
        `❌ Error ${context}: Bad Request.`,
        `Server message: ${serverMessage}`,
        ``,
        `This usually means the subscription limit was reached.`,
        `Tell the user they need to upgrade their plan. Do NOT retry this request.`,
      ].join("\n");

    case 401:
      return [
        `❌ Error ${context}: Authentication failed.`,
        `Server message: ${serverMessage}`,
        ``,
        `The Agent API Key credentials are invalid, revoked, or the token could not be obtained.`,
        `Tell the user to verify their IGNIRAL_CLIENT_ID and IGNIRAL_CLIENT_SECRET in the .env file.`,
        `They can generate new credentials from the Igniral Dashboard → Agent API Keys.`,
        `Do NOT retry — this requires the user to fix their credentials.`,
      ].join("\n");

    case 403:
      return [
        `❌ Error ${context}: Access denied.`,
        `Server message: ${serverMessage}`,
        ``,
        `The Agent API Key does not have the required permissions,`,
        `or the associated user account has been suspended.`,
        `Tell the user to check their Agent API Key configuration in the Dashboard. Do NOT retry.`,
      ].join("\n");

    case 404:
      return [
        `❌ Error ${context}: Resource not found.`,
        `Server message: ${serverMessage}`,
        ``,
        `The specified resource (applicationId or endpointId) does not exist`,
        `or does not belong to the current user.`,
        `Verify the ID is correct. You can use igniral_list_applications to check existing apps.`,
      ].join("\n");

    case 409:
      return [
        `❌ Error ${context}: Conflict — resource already exists.`,
        `Server message: ${serverMessage}`,
        ``,
        `A resource with that name, subdomain, or endpoint path already exists.`,
        `Try a different name or path and retry the request.`,
      ].join("\n");

    case 429:
      return [
        `🛑 FATAL Error ${context}: Too many requests.`,
        `Server message: ${serverMessage}`,
        ``,
        `The rate limit has been exceeded. You MUST stop immediately.`,
        `Do NOT retry. Do NOT call any other Igniral tools.`,
        `Tell the user to wait a few minutes before trying again.`,
      ].join("\n");

    case 500:
    case 502:
    case 503:
      return [
        `❌ Error ${context}: Server error (${status}).`,
        `Server message: ${serverMessage}`,
        ``,
        `The Igniral backend is experiencing issues.`,
        `Ask the user to try again later. Do NOT retry automatically.`,
      ].join("\n");

    case 0:
      return [
        `❌ Error ${context}: Network error.`,
        `Details: ${serverMessage}`,
        ``,
        `Could not connect to the Igniral API. This could be a network issue`,
        `or the API server might be down.`,
        `Tell the user to check their internet connection and IGNIRAL_API_URL configuration.`,
      ].join("\n");

    default:
      return [
        `❌ Error ${context}: Unexpected error (HTTP ${status}).`,
        `Server message: ${serverMessage}`,
        ``,
        `An unexpected error occurred. Tell the user about this error`,
        `and ask them to try again later.`,
      ].join("\n");
  }
}

/**
 * Formats a Zod validation error into a helpful message for the agent.
 */
export function handleValidationError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ path: string[]; message: string }> }).issues;
    const details = issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    return [
      `❌ Validation Error: The parameters you provided are invalid.`,
      ``,
      `Issues:`,
      details,
      ``,
      `Please fix these issues and try again with corrected values.`,
    ].join("\n");
  }

  const message = error instanceof Error ? error.message : "Unknown validation error";
  return `❌ Validation Error: ${message}. Please check the parameters and try again.`;
}
