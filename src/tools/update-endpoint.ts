/**
 * Tool 5: igniral_update_dynamic_endpoint
 *
 * Updates an existing dynamic API endpoint within an application.
 * Requires an endpointId from a previous create_endpoint call or list_applications.
 */

import { IgniralClient } from "../api/igniral-client.js";
import { updateEndpointInput } from "../validation/schemas.js";
import { wrapEndpointUpdated } from "../utils/response-wrapper.js";
import {
  handleApiError,
  handleValidationError,
} from "../utils/error-handler.js";

/**
 * Executes the update-dynamic-endpoint tool.
 *
 * @param client  The Igniral API client
 * @param params  Raw parameters from the AI agent
 * @returns MCP tool result content
 */
export async function executeUpdateEndpoint(
  client: IgniralClient,
  params: Record<string, unknown>
): Promise<string> {
  // 1. Validate input with Zod
  const parsed = updateEndpointInput.safeParse(params);
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

  // 3. Call the update endpoint
  const response = await client.putToApi<Record<string, unknown>>(
    `/api/igniral-user-dynamic-endpoint/${validated.endpointId}`,
    body
  );

  if (!response.ok) {
    return handleApiError(response, "updating dynamic endpoint");
  }

  // 4. Wrap response in instructional text
  return wrapEndpointUpdated(response.data as Record<string, unknown>);
}
