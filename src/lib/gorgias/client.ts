/**
 * Gorgias API Client
 * Low-level API client for Gorgias REST API
 * 
 * Documentation: https://developers.gorgias.com/reference/introduction
 */

import type { GorgiasApiError } from './types';

// Configuration from environment variables
const GORGIAS_DOMAIN = process.env.GORGIAS_DOMAIN || '';
const GORGIAS_EMAIL = process.env.GORGIAS_EMAIL || '';
const GORGIAS_API_KEY = process.env.GORGIAS_API_KEY || '';

/**
 * Get the base URL for Gorgias API
 */
export function getGorgiasBaseUrl(): string {
  if (!GORGIAS_DOMAIN) {
    throw new Error('GORGIAS_DOMAIN environment variable is required');
  }
  return `https://${GORGIAS_DOMAIN}.gorgias.com/api`;
}

/**
 * Check if Gorgias is configured
 */
export function isGorgiasConfigured(): boolean {
  return Boolean(GORGIAS_DOMAIN && GORGIAS_EMAIL && GORGIAS_API_KEY);
}

/**
 * Get Basic Auth header value
 */
function getAuthHeader(): string {
  if (!GORGIAS_EMAIL || !GORGIAS_API_KEY) {
    throw new Error('GORGIAS_EMAIL and GORGIAS_API_KEY environment variables are required');
  }
  const credentials = `${GORGIAS_EMAIL}:${GORGIAS_API_KEY}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Default headers for Gorgias API requests
 */
function getDefaultHeaders(): HeadersInit {
  return {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Custom error class for Gorgias API errors
 */
export class GorgiasError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, status: number, errorData?: GorgiasApiError) {
    super(message);
    this.name = 'GorgiasError';
    this.status = status;
    this.code = errorData?.code;
    this.errors = errorData?.errors;
  }
}

/**
 * Parse error response from Gorgias API
 */
async function parseErrorResponse(response: Response): Promise<GorgiasApiError> {
  try {
    const data = await response.json();
    // Handle various error response formats from Gorgias
    // Gorgias can return: { error: { msg: "...", data: {...} } } or { message: "..." }
    let message = data.message;
    if (!message && data.error) {
      if (typeof data.error === 'string') {
        message = data.error;
      } else if (data.error.msg) {
        message = data.error.msg;
        if (data.error.data) {
          message += ': ' + JSON.stringify(data.error.data);
        }
      } else {
        message = JSON.stringify(data.error);
      }
    }
    if (!message && typeof data === 'object') {
      message = JSON.stringify(data);
    }
    return {
      message: message || `HTTP ${response.status}`,
      errors: data.errors || data.error?.data,
      code: data.code,
    };
  } catch {
    return {
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
}

/**
 * Generic request function for Gorgias API
 */
export async function gorgiasRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  if (!isGorgiasConfigured()) {
    throw new GorgiasError('Gorgias is not configured', 0);
  }

  const baseUrl = getGorgiasBaseUrl();
  
  // Build URL with query parameters
  const url = new URL(`${baseUrl}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const options: RequestInit = {
    method,
    headers: getDefaultHeaders(),
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const errorData = await parseErrorResponse(response);
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new GorgiasError(
        `Rate limited. Retry after ${retryAfter || 'unknown'} seconds`,
        429,
        errorData
      );
    }

    throw new GorgiasError(errorData.message, response.status, errorData);
  }

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================
// API Request Helpers
// ============================================

/**
 * GET request to Gorgias API
 */
export async function gorgiasGet<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  return gorgiasRequest<T>('GET', endpoint, undefined, params);
}

/**
 * POST request to Gorgias API
 */
export async function gorgiasPost<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  return gorgiasRequest<T>('POST', endpoint, body);
}

/**
 * PUT request to Gorgias API
 */
export async function gorgiasPut<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  return gorgiasRequest<T>('PUT', endpoint, body);
}

/**
 * DELETE request to Gorgias API
 */
export async function gorgiasDelete<T>(
  endpoint: string
): Promise<T> {
  return gorgiasRequest<T>('DELETE', endpoint);
}
