/**
 * Tool 3: igniral_create_dynamic_endpoint
 *
 * Creates a dynamic API endpoint within an existing application.
 * Requires an applicationId from a previous create_application call.
 * Use this iteratively to add all needed endpoints to the application.
 */

import { IgniralClient } from "../api/igniral-client.js";
import { createEndpointInput } from "../validation/schemas.js";
import { wrapEndpointCreated } from "../utils/response-wrapper.js";
import {
  handleApiError,
  handleValidationError,
} from "../utils/error-handler.js";

/**
 * Executes the create-dynamic-endpoint tool.
 *
 * @param client  The Igniral API client
 * @param params  Raw parameters from the AI agent
 * @returns MCP tool result content
 */
export async function executeCreateEndpoint(
  client: IgniralClient,
  params: Record<string, unknown>
): Promise<string> {
  // 1. Validate input with Zod (includes securityConfig conditional check)
  const parsed = createEndpointInput.safeParse(params);
  if (!parsed.success) {
    return handleValidationError(parsed.error);
  }

  const validated = parsed.data;

  // 2. Build request body (matches DynamicEndpointRequest DTO)
  const body: Record<string, unknown> = {
    applicationId: validated.applicationId,
    endpointPath: validated.endpointPath,
    allowedMethods: validated.allowedMethods,
    schemaDefinition: validated.schemaDefinition,
    type: validated.type,
    visibility: validated.visibility,
    securityPolicy: validated.securityPolicy,
  };

  if (validated.securityConfig) {
    body.securityConfig = validated.securityConfig;
  }
  if (validated.endpointDocumentation) {
    body.endpointDocumentation = validated.endpointDocumentation;
  }

  // 3. Call the AI-generate endpoint
  const response = await client.postToApi<Record<string, unknown>>(
    "/api/igniral-user-dynamic-endpoint/ai-generate",
    body
  );

  if (!response.ok) {
    return handleApiError(response, "creating dynamic endpoint");
  }

  // 4. Wrap response in instructional text
  return wrapEndpointCreated(response.data as Record<string, unknown>);
}
