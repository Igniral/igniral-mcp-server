import { IgniralConfig } from "../config.js";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface JwtPayload {
  sub?: string;
  [key: string]: unknown;
}

export class TokenManager {
  private config: IgniralConfig;
  private accessToken: string | null = null;
  private userId: string | null = null;
  private expiresAt: number = 0;
  private isFetching: boolean = false;
  private fetchPromise: Promise<string> | null = null;

  constructor(config: IgniralConfig) {
    this.config = config;
  }

  async getToken(): Promise<string> {
    // Return cached token if valid (with 30 seconds buffer)
    if (this.accessToken && Date.now() < this.expiresAt - 30000) {
      return this.accessToken;
    }

    // If already fetching, wait for the existing promise
    if (this.isFetching && this.fetchPromise) {
      return this.fetchPromise;
    }

    this.isFetching = true;
    this.fetchPromise = this.fetchNewToken().finally(() => {
      this.isFetching = false;
      this.fetchPromise = null;
    });

    return this.fetchPromise;
  }

  /**
   * Returns the user ID (sub claim) from the cached JWT.
   * Must be called after getToken().
   */
  getUserId(): string | null {
    return this.userId;
  }

  private async fetchNewToken(): Promise<string> {
    const tokenUrl = `${this.config.authUrl}/oauth2/token`;
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'ai:generate');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch Agent API token: HTTP ${response.status} - ${errText}`);
      }

      const data = await response.json() as TokenResponse;
      this.accessToken = data.access_token;
      // expires_in is in seconds, convert to absolute ms timestamp
      this.expiresAt = Date.now() + (data.expires_in * 1000);

      // Decode JWT payload to extract sub (userId)
      this.userId = this.extractSubFromJwt(data.access_token);
      
      return this.accessToken;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Decode the JWT payload (base64url) to extract the 'sub' claim.
   * No signature verification — the backend already validates the token.
   */
  private extractSubFromJwt(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JwtPayload;
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
