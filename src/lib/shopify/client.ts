import { createStorefrontApiClient, StorefrontApiClient } from '@shopify/storefront-api-client';

/**
 * Shopify Integration for TellMyTale
 * Using Customer Account API 2025-10 with Discovery Endpoints
 * 
 * Documentation: https://shopify.dev/docs/api/customer/2025-10
 */

// Store Configuration
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'tellmytale.com';
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_API_VERSION = '2025-10';

// Customer Account API Client ID (from Shopify Admin > Settings > Customer accounts > Headless)
export const CUSTOMER_ACCOUNT_CLIENT_ID = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID || '883bd791-769b-4ef4-802b-937aa650db4b';

// Discovery endpoint URLs (based on storefront domain)
export const getOpenIDConfigUrl = () => `https://${SHOPIFY_STORE_DOMAIN}/.well-known/openid-configuration`;
export const getCustomerAccountApiConfigUrl = () => `https://${SHOPIFY_STORE_DOMAIN}/.well-known/customer-account-api`;

// Types for discovery responses
export interface OpenIDConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

export interface CustomerAccountApiConfiguration {
  graphql_api: string;
  mcp_api?: string;
}

// Cache for discovered endpoints
let openIDConfig: OpenIDConfiguration | null = null;
let customerApiConfig: CustomerAccountApiConfiguration | null = null;

/**
 * Discover OpenID Connect configuration from the storefront
 * Returns authentication endpoints (authorization, token, logout URLs)
 */
export async function discoverOpenIDConfig(): Promise<OpenIDConfiguration> {
  if (openIDConfig) return openIDConfig;
  
  try {
    const response = await fetch(getOpenIDConfigUrl());
    if (!response.ok) {
      throw new Error(`Failed to discover OpenID config: ${response.status}`);
    }
    openIDConfig = await response.json();
    return openIDConfig!;
  } catch (error) {
    console.error('OpenID discovery failed:', error);
    throw error;
  }
}

/**
 * Discover Customer Account API configuration
 * Returns GraphQL API endpoint (already includes version)
 */
export async function discoverCustomerAccountApiConfig(): Promise<CustomerAccountApiConfiguration> {
  if (customerApiConfig) return customerApiConfig;
  
  try {
    const response = await fetch(getCustomerAccountApiConfigUrl());
    if (!response.ok) {
      throw new Error(`Failed to discover Customer Account API config: ${response.status}`);
    }
    customerApiConfig = await response.json();
    return customerApiConfig!;
  } catch (error) {
    console.error('Customer Account API discovery failed:', error);
    throw error;
  }
}

/**
 * Get the Customer Account API GraphQL endpoint
 * Uses discovery to get the correct endpoint with version
 */
export async function getCustomerAccountGraphQLEndpoint(): Promise<string> {
  const config = await discoverCustomerAccountApiConfig();
  return config.graphql_api;
}

// Create Storefront API Client (for public product data)
let storefrontClient: StorefrontApiClient | null = null;

export function getStorefrontClient(): StorefrontApiClient {
  if (!storefrontClient) {
    if (!SHOPIFY_STOREFRONT_TOKEN) {
      throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN is required');
    }
    
    storefrontClient = createStorefrontApiClient({
      storeDomain: `https://${SHOPIFY_STORE_DOMAIN}`,
      apiVersion: SHOPIFY_API_VERSION,
      publicAccessToken: SHOPIFY_STOREFRONT_TOKEN,
    });
  }
  return storefrontClient;
}

// ============================================
// GraphQL Queries for Storefront API
// ============================================

export const PRODUCTS_QUERY = `#graphql
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      description
      descriptionHtml
      handle
      productType
      tags
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      metafields(identifiers: [
        {namespace: "custom", key: "age_range"},
        {namespace: "custom", key: "page_count"},
        {namespace: "custom", key: "production_time"}
      ]) {
        key
        value
        namespace
      }
    }
  }
`;
