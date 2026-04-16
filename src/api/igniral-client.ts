import { IgniralConfig } from "../config.js";
import { TokenManager } from "./TokenManager.js";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * HTTP client that handles authentication and error normalization
 * for all Igniral backend calls.
 */
export class IgniralClient {
  private config: IgniralConfig;
  private tokenManager: TokenManager;

  constructor(config: IgniralConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
  }

  /**
   * Common headers for all requests.
   * Includes Authorization (Bearer token) and X-Acting-User (from JWT sub).
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.tokenManager.getToken();
    const userId = this.tokenManager.getUserId();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (userId) {
      headers["X-Acting-User"] = userId;
    }
    return headers;
  }

  /**
   * POST request to the JSON Elements microservice.
   * Used by Tools 2, 3, and 4.
   */
  async postToApi<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    extraHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}${path}`;
    return this.doFetch<T>(url, "POST", body, extraHeaders);
  }

  /**
   * GET request to the JSON Elements microservice.
   * Used by Tool 4 (list applications).
   */
  async getFromApi<T = unknown>(
    path: string,
    extraHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}${path}`;
    return this.doFetch<T>(url, "GET", undefined, extraHeaders);
  }

  /**
   * POST request to the AI Schema Builder microservice.
   * Used by Tool 1 (generate schema from prompt).
   */
  async postToAiApi<T = unknown>(
    path: string,
    body: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.aiApiUrl}${path}`;
    return this.doFetch<T>(url, "POST", body);
  }

  /**
   * Returns the SSE subscription URL for generation events.
   * Used by Tool 1 to listen for async generation progress.
   */
  getSseUrl(): string {
    return `${this.config.aiApiUrl}/api/ai/generation-events/subscribe`;
  }

  /**
   * Returns the common headers needed for SSE connections.
   */
  async getSseHeaders(): Promise<Record<string, string>> {
    return this.getHeaders();
  }

  /**
   * Internal fetch wrapper with error normalization.
   */
  private async doFetch<T>(
    url: string,
    method: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const baseHeaders = await this.getHeaders();
      const headers = { ...baseHeaders, ...extraHeaders };

      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        // Handle 204 No Content
        if (response.status === 204) {
          return { ok: true, status: response.status };
        }

        const text = await response.text();
        let data: T | undefined;
        try {
          data = JSON.parse(text) as T;
        } catch {
          // Response may not be JSON (e.g., plain text for 202 Accepted)
          data = text as unknown as T;
        }

        return { ok: true, status: response.status, data };
      }

      // Error response — try to extract error message from body
      let errorMessage: string;
      try {
        const errorBody = await response.text();
        const parsed = JSON.parse(errorBody);
        errorMessage =
          parsed.message || parsed.error || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      return { ok: false, status: response.status, error: errorMessage };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown network error";
      return { ok: false, status: 0, error: `Network error: ${message}` };
    }
  }
}
