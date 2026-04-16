/**
 * Tool 4: igniral_list_applications
 *
 * Lists all applications owned by the current user.
 * Use this to check what applications already exist before creating
 * new ones, or to get the applicationId of an existing application.
 *
 * Note: This calls the standard GET endpoint which uses jwt.sub
 * for user identification. The token must have sub=userId.
 */

import { IgniralClient } from "../api/igniral-client.js";
import { wrapApplicationList } from "../utils/response-wrapper.js";
import { handleApiError } from "../utils/error-handler.js";

/**
 * Executes the list-applications tool.
 *
 * @param client The Igniral API client
 * @returns MCP tool result content
 */
export async function executeListApplications(
  client: IgniralClient
): Promise<string> {
  // Call GET /api/igniral-user-application with pagination defaults
  const response = await client.getFromApi<Record<string, unknown>>(
    "/api/igniral-user-application?page=0&size=50&sort=createdAt,desc"
  );

  if (!response.ok) {
    return handleApiError(response, "listing applications");
  }

  return wrapApplicationList(response.data as Record<string, unknown>);
}
