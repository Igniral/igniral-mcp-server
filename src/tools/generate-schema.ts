/**
 * Tool 1: igniral_generate_schema_from_prompt
 *
 * Generates a complete application from a natural language description.
 * This tool creates the application, ALL endpoints with their schemas,
 * roles, and permissions automatically.
 *
 * Internally:
 * 1. Opens an SSE connection to listen for generation progress
 * 2. Posts the prompt to the ai-schema-builder (which returns 202 Accepted)
 * 3. Waits for the SSE "complete" or "error" event
 * 4. Returns the final result to the agent
 *
 * The agent sees this as a synchronous tool call.
 */

import { EventSource } from "eventsource";
import { IgniralClient } from "../api/igniral-client.js";
import { generateSchemaInput } from "../validation/schemas.js";
import { wrapGenerationComplete } from "../utils/response-wrapper.js";
import {
  handleApiError,
  handleValidationError,
} from "../utils/error-handler.js";

/** SSE timeout: 180 seconds (matches server-side SseEmitter timeout) */
const SSE_TIMEOUT_MS = 180_000;

interface GenerationEvent {
  step?: string;
  applicationId?: string;
  applicationName?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Executes the generate-schema-from-prompt tool.
 *
 * @param client  The Igniral API client
 * @param params  Raw parameters from the AI agent
 * @returns MCP tool result content
 */
export async function executeGenerateSchema(
  client: IgniralClient,
  params: Record<string, unknown>
): Promise<string> {
  // 1. Validate input
  const parsed = generateSchemaInput.safeParse(params);
  if (!parsed.success) {
    return handleValidationError(parsed.error);
  }

  const { prompt } = parsed.data;

  try {
    const sseHeaders = await client.getSseHeaders();
    // 2. Open SSE connection FIRST (before triggering generation)
    const resultPromise = waitForGenerationResult(client, sseHeaders);

    // 3. Trigger the async generation
    const triggerResponse = await client.postToAiApi(
      "/api/ai/generate-application",
      { prompt }
    );

    // If the trigger itself fails (not 202), report immediately
    if (!triggerResponse.ok && triggerResponse.status !== 202) {
      return handleApiError(triggerResponse, "triggering application generation");
    }

    // 4. Wait for SSE to deliver the result
    const result = await resultPromise;

    if (result.status === "SUCCESS") {
      return wrapGenerationComplete(result);
    } else {
      return [
        `❌ Application generation failed.`,
        ``,
        `Error: ${result.message || "Unknown error during generation"}`,
        ``,
        `This may be due to a problem with the AI model or the prompt.`,
        `Ask the user to try rephrasing their request with more details.`,
      ].join("\n");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return [
      `❌ Error during application generation.`,
      ``,
      `Details: ${message}`,
      ``,
      `Ask the user to try again later.`,
    ].join("\n");
  }
}

/**
 * Opens an SSE connection and returns a promise that resolves
 * when a "complete" or "error" event is received.
 *
 * eventsource v3 follows the browser spec and doesn't support
 * custom headers directly. We use the `fetch` option to inject
 * Authorization headers via a custom fetch wrapper.
 */
function waitForGenerationResult(
  client: IgniralClient,
  sseHeaders: Record<string, string>
): Promise<GenerationEvent> {
  return new Promise((resolve, reject) => {
    const sseUrl = client.getSseUrl();

    // Custom fetch that injects auth headers into the SSE connection
    const fetchWithAuth: typeof fetch = (input, init) => {
      const headers = new Headers(init?.headers);
      for (const [key, value] of Object.entries(sseHeaders)) {
        headers.set(key, value);
      }
      return fetch(input, { ...init, headers });
    };

    const eventSource = new EventSource(sseUrl, {
      fetch: fetchWithAuth,
    });

    // Timeout handler
    const timeout = setTimeout(() => {
      eventSource.close();
      reject(
        new Error(
          "Generation timed out after 180 seconds. " +
            "The AI model may be overloaded. Ask the user to try again later."
        )
      );
    }, SSE_TIMEOUT_MS);

    // Listen for completion
    eventSource.addEventListener("complete", ((event: MessageEvent) => {
      clearTimeout(timeout);
      eventSource.close();
      try {
        const data = JSON.parse(event.data) as GenerationEvent;
        data.status = data.status || "SUCCESS";
        resolve(data);
      } catch {
        resolve({ status: "SUCCESS", message: event.data });
      }
    }) as EventListener);

    // Listen for named "error" events from the backend (generation failures)
    eventSource.addEventListener("error", ((event: Event) => {
      const messageEvent = event as MessageEvent;
      // Only handle named "error" events with data (not SSE connection errors)
      if (messageEvent.data) {
        clearTimeout(timeout);
        eventSource.close();
        try {
          const data = JSON.parse(messageEvent.data) as GenerationEvent;
          data.status = "ERROR";
          resolve(data);
        } catch {
          resolve({ status: "ERROR", message: messageEvent.data });
        }
      }
    }) as EventListener);

    // Handle SSE connection-level errors
    eventSource.onerror = () => {
      // EventSource auto-reconnects, but if it fails completely:
      if (eventSource.readyState === EventSource.CLOSED) {
        clearTimeout(timeout);
        reject(
          new Error(
            "SSE connection to Igniral backend failed. " +
              "Check that IGNIRAL_AI_API_URL is correct and the server is running."
          )
        );
      }
    };
  });
}
