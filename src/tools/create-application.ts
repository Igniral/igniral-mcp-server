/**
 * Tool 2: igniral_create_application
 *
 * Creates an empty application shell (without endpoints).
 * Use this when the user wants to manually build an application
 * step by step, providing specific name, description, and settings.
 *
 * After creating the application, use igniral_create_dynamic_endpoint
 * to add endpoints one by one.
 */

import { IgniralClient } from "../api/igniral-client.js";
import { createApplicationInput } from "../validation/schemas.js";
import { wrapApplicationCreated } from "../utils/response-wrapper.js";
import {
  handleApiError,
  handleValidationError,
} from "../utils/error-handler.js";

/**
 * Executes the create-application tool.
 *
 * @param client  The Igniral API client
 * @param params  Raw parameters from the AI agent
 * @returns MCP tool result content
 */
export async function executeCreateApplication(
  client: IgniralClient,
  params: Record<string, unknown>
): Promise<string> {
  // 1. Validate input with Zod
  const parsed = createApplicationInput.safeParse(params);
  if (!parsed.success) {
    return handleValidationError(parsed.error);
  }

  const { name, description, version, subdomain, aiGeneratedContext, isPrivate } =
    parsed.data;

  // 2. Build request body (matches ApplicationRequest DTO)
  const body: Record<string, unknown> = {
    name,
    description,
    version,
    isPrivate,
  };

  if (subdomain) body.subdomain = subdomain;
  if (aiGeneratedContext) body.aiGeneratedContext = aiGeneratedContext;

  // 3. Call the AI-generate endpoint (include subscription from JWT)
  const response = await client.postToApi<Record<string, unknown>>(
    "/api/igniral-user-application/ai-generate",
    body,
    { "X-User-Subscription": client.getSubscription() }
  );

  if (!response.ok) {
    return handleApiError(response, "creating application");
  }

  // 4. Wrap response in instructional text
  return wrapApplicationCreated(response.data as Record<string, unknown>);
}
