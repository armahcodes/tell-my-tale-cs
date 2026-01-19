/**
 * Shopify Customer Account API Integration
 * Using 2025-10 API with Discovery Endpoints
 * 
 * Documentation: https://shopify.dev/docs/api/customer/2025-10
 * 
 * Client ID: 883bd791-769b-4ef4-802b-937aa650db4b
 */

import { 
  CUSTOMER_ACCOUNT_CLIENT_ID,
  discoverOpenIDConfig,
  getCustomerAccountGraphQLEndpoint,
  type OpenIDConfiguration
} from './client';

// ============================================
// PKCE Utilities (for Public Clients)
// ============================================

/**
 * Generate a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (no padding)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  buffer.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a random nonce for replay attack protection
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// ============================================
// OAuth 2.0 Authorization Flow
// ============================================

/**
 * Build the authorization URL for customer login
 * Uses discovery to get the correct authorization endpoint
 */
export async function buildAuthorizationUrl(
  redirectUri: string,
  state: string,
  nonce: string,
  codeChallenge: string,
  options?: {
    locale?: string;
    loginHint?: string;
    prompt?: 'none';
  }
): Promise<string> {
  const config = await discoverOpenIDConfig();
  const authUrl = new URL(config.authorization_endpoint);

  // Required parameters
  authUrl.searchParams.append('scope', 'openid email customer-account-api:full');
  authUrl.searchParams.append('client_id', CUSTOMER_ACCOUNT_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('nonce', nonce);
  
  // PKCE parameters (required for public clients)
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  // Optional parameters
  if (options?.locale) {
    authUrl.searchParams.append('locale', options.locale);
  }
  if (options?.loginHint) {
    authUrl.searchParams.append('login_hint', options.loginHint);
  }
  if (options?.prompt) {
    authUrl.searchParams.append('prompt', options.prompt);
  }

  return authUrl.toString();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const config = await discoverOpenIDConfig();
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = await discoverOpenIDConfig();
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Get logout URL
 */
export async function getLogoutUrl(idTokenHint?: string, postLogoutRedirectUri?: string): Promise<string> {
  const config = await discoverOpenIDConfig();
  const logoutUrl = new URL(config.end_session_endpoint);

  if (idTokenHint) {
    logoutUrl.searchParams.append('id_token_hint', idTokenHint);
  }
  if (postLogoutRedirectUri) {
    logoutUrl.searchParams.append('post_logout_redirect_uri', postLogoutRedirectUri);
  }

  return logoutUrl.toString();
}

// ============================================
// Customer Account API GraphQL Client
// ============================================

/**
 * Execute a GraphQL query against the Customer Account API
 * Uses discovery to get the correct endpoint
 */
export async function customerAccountQuery<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const graphqlEndpoint = await getCustomerAccountGraphQLEndpoint();
  
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Customer Account API request failed: ${response.status} - ${error}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    // Handle specific error codes
    const errorCode = json.errors[0]?.extensions?.code;
    if (errorCode === 'THROTTLED') {
      throw new Error('API rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ============================================
// Types
// ============================================

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

export interface CustomerOrder {
  id: string;
  number: number;
  name: string;
  processedAt: string;
  cancelledAt?: string;
  financialStatus?: string;
  fulfillments: {
    status: string;
    createdAt: string;
    updatedAt: string;
    estimatedDeliveryAt?: string;
    trackingInformation: {
      company?: string;
      number?: string;
      url?: string;
    }[];
    latestShipmentStatus?: {
      status: string;
    };
  }[];
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
  lineItems: {
    edges: {
      node: {
        id: string;
        name: string;
        title?: string;
        quantity: number;
        totalPrice: {
          amount: string;
          currencyCode: string;
        };
        image?: {
          url: string;
          altText?: string;
        };
        productId?: string;
        variantId?: string;
      };
    }[];
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    provinceCode: string;
    countryCode: string;
    zip: string;
    phone?: string;
  };
  confirmationNumber?: string;
}

export interface CustomerProfile {
  id: string;
  emailAddress: {
    emailAddress: string;
    marketingState: string;
  };
  firstName: string;
  lastName: string;
  phoneNumber?: {
    phoneNumber: string;
  };
  createdAt: string;
  defaultAddress?: {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    provinceCode: string;
    countryCode: string;
    zip: string;
    phone?: string;
  };
}

// ============================================
// GraphQL Queries for Customer Account API
// ============================================

export const CUSTOMER_ORDERS_QUERY = `#graphql
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      id
      emailAddress {
        emailAddress
      }
      firstName
      lastName
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          cursor
          node {
            id
            number
            name
            processedAt
            fulfillments {
              status
              createdAt
              updatedAt
              trackingInformation {
                company
                number
                url
              }
            }
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 20) {
              edges {
                node {
                  id
                  name
                  quantity
                  totalPrice {
                    amount
                    currencyCode
                  }
                  image {
                    url
                    altText
                  }
                  productId
                  variantId
                }
              }
            }
            shippingAddress {
              firstName
              lastName
              address1
              address2
              city
              provinceCode
              countryCode
              zip
              phone
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export const CUSTOMER_ORDER_BY_ID_QUERY = `#graphql
  query CustomerOrderById($orderId: ID!) {
    customer {
      id
      order(id: $orderId) {
        id
        number
        name
        processedAt
        cancelledAt
        financialStatus
        fulfillments {
          status
          createdAt
          updatedAt
          estimatedDeliveryAt
          trackingInformation {
            company
            number
            url
          }
          latestShipmentStatus {
            status
          }
        }
        totalPrice {
          amount
          currencyCode
        }
        subtotal {
          amount
          currencyCode
        }
        totalShipping {
          amount
          currencyCode
        }
        totalTax {
          amount
          currencyCode
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              name
              title
              quantity
              totalPrice {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
              productId
              variantId
            }
          }
        }
        shippingAddress {
          firstName
          lastName
          address1
          address2
          city
          provinceCode
          countryCode
          zip
          phone
        }
        confirmationNumber
      }
    }
  }
`;

export const CUSTOMER_PROFILE_QUERY = `#graphql
  query CustomerProfile {
    customer {
      id
      emailAddress {
        emailAddress
        marketingState
      }
      firstName
      lastName
      phoneNumber {
        phoneNumber
      }
      createdAt
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        provinceCode
        countryCode
        zip
        phone
      }
      addresses(first: 10) {
        edges {
          node {
            id
            firstName
            lastName
            address1
            address2
            city
            provinceCode
            countryCode
            zip
            phone
          }
        }
      }
    }
  }
`;
