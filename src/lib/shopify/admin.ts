/**
 * Shopify Admin API Integration
 * For dashboard access to all orders and customers
 * 
 * Requires: SHOPIFY_ADMIN_ACCESS_TOKEN environment variable
 * Get it from: Shopify Admin > Apps > Develop apps > Create app > Admin API access
 */

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'tellmytale.com';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = '2024-10';

// Admin API GraphQL endpoint
function getAdminApiEndpoint(): string {
  return `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
}

/**
 * Execute a GraphQL query against the Shopify Admin API
 */
export async function adminApiQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not configured. Add it to your environment variables.');
  }

  const endpoint = getAdminApiEndpoint();
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Admin API request failed: ${response.status} - ${error}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    const errorCode = json.errors[0]?.extensions?.code;
    if (errorCode === 'THROTTLED') {
      throw new Error('API rate limit exceeded. Please try again in a moment.');
    }
    if (errorCode === 'ACCESS_DENIED') {
      const field = json.errors[0]?.path?.join('.') || 'resource';
      throw new Error(`Access denied for ${field}. Please ensure your Admin API token has the required scopes (read_orders, read_customers) enabled in Shopify Admin → Apps → Your App → API credentials.`);
    }
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ============================================
// GraphQL Queries for Admin API
// ============================================

/**
 * Get all orders with pagination
 */
export const ADMIN_ORDERS_QUERY = `#graphql
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          legacyResourceId
          name
          email
          phone
          createdAt
          updatedAt
          processedAt
          cancelledAt
          closedAt
          displayFinancialStatus
          displayFulfillmentStatus
          confirmed
          test
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            legacyResourceId
            firstName
            lastName
            email
            phone
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          billingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          shippingLine {
            title
            originalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                title
                variantTitle
                quantity
                originalTotalSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                image {
                  url
                  altText
                }
                customAttributes {
                  key
                  value
                }
                product {
                  id
                  handle
                }
                variant {
                  id
                  title
                }
              }
            }
          }
          fulfillments(first: 10) {
            id
            status
            displayStatus
            createdAt
            updatedAt
            trackingInfo(first: 5) {
              company
              number
              url
            }
            fulfillmentLineItems(first: 50) {
              edges {
                node {
                  lineItem {
                    id
                    name
                  }
                  quantity
                }
              }
            }
          }
          note
          tags
          discountCode
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Get a single order by ID
 */
export const ADMIN_ORDER_BY_ID_QUERY = `#graphql
  query GetOrderById($id: ID!) {
    order(id: $id) {
      id
      legacyResourceId
      name
      email
      phone
      createdAt
      updatedAt
      processedAt
      cancelledAt
      closedAt
      displayFinancialStatus
      displayFulfillmentStatus
      confirmed
      test
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalShippingPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalDiscountsSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      customer {
        id
        legacyResourceId
        firstName
        lastName
        email
        phone
        createdAt
        note
        tags
      }
      shippingAddress {
        firstName
        lastName
        address1
        address2
        city
        province
        provinceCode
        country
        countryCode
        zip
        phone
      }
      billingAddress {
        firstName
        lastName
        address1
        address2
        city
        province
        provinceCode
        country
        countryCode
        zip
        phone
      }
      shippingLine {
        title
        originalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
      lineItems(first: 100) {
        edges {
          node {
            id
            name
            title
            variantTitle
            quantity
            originalTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            image {
              url
              altText
            }
            customAttributes {
              key
              value
            }
            product {
              id
              handle
            }
            variant {
              id
              title
            }
          }
        }
      }
      fulfillments(first: 10) {
        id
        status
        displayStatus
        createdAt
        updatedAt
        estimatedDeliveryAt
        trackingInfo(first: 5) {
          company
          number
          url
        }
        fulfillmentLineItems(first: 50) {
          edges {
            node {
              lineItem {
                id
                name
              }
              quantity
            }
          }
        }
      }
      events(first: 50, sortKey: CREATED_AT, reverse: false) {
        edges {
          node {
            id
            message
            createdAt
          }
        }
      }
      note
      tags
      discountCode
      metafields(first: 20) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
  }
`;

/**
 * Get all customers with pagination
 */
export const ADMIN_CUSTOMERS_QUERY = `#graphql
  query GetCustomers($first: Int!, $after: String, $query: String) {
    customers(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          legacyResourceId
          firstName
          lastName
          email
          phone
          createdAt
          updatedAt
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
          state
          tags
          note
          verifiedEmail
          defaultAddress {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          addresses(first: 5) {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          lastOrder {
            id
            name
            createdAt
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Get a single customer by ID with their orders
 */
export const ADMIN_CUSTOMER_BY_ID_QUERY = `#graphql
  query GetCustomerById($id: ID!) {
    customer(id: $id) {
      id
      legacyResourceId
      firstName
      lastName
      email
      phone
      createdAt
      updatedAt
      numberOfOrders
      amountSpent {
        amount
        currencyCode
      }
      state
      tags
      note
      verifiedEmail
      locale
      taxExempt
      defaultAddress {
        id
        firstName
        lastName
        company
        address1
        address2
        city
        province
        provinceCode
        country
        countryCode
        zip
        phone
      }
      addresses(first: 10) {
        id
        firstName
        lastName
        company
        address1
        address2
        city
        province
        provinceCode
        country
        countryCode
        zip
        phone
      }
      orders(first: 20, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            legacyResourceId
            name
            createdAt
            processedAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 5) {
              edges {
                node {
                  name
                  quantity
                  image {
                    url
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
      metafields(first: 10) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
  }
`;

// ============================================
// Types for Admin API
// ============================================

export interface AdminOrder {
  id: string;
  legacyResourceId: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  cancelledAt?: string;
  closedAt?: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  confirmed: boolean;
  test: boolean;
  totalPriceSet: MoneySet;
  subtotalPriceSet: MoneySet;
  totalShippingPriceSet: MoneySet;
  totalTaxSet: MoneySet;
  totalDiscountsSet: MoneySet;
  customer?: AdminCustomerBasic;
  shippingAddress?: AdminAddress;
  billingAddress?: AdminAddress;
  shippingLine?: {
    title: string;
    originalPriceSet: MoneySet;
  };
  lineItems: {
    edges: {
      node: AdminLineItem;
    }[];
  };
  fulfillments: AdminFulfillment[];
  events?: {
    edges: {
      node: {
        id: string;
        message: string;
        createdAt: string;
      };
    }[];
  };
  note?: string;
  tags: string[];
  discountCode?: string;
}

export interface AdminCustomer {
  id: string;
  legacyResourceId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  numberOfOrders?: number;
  amountSpent?: {
    amount: string;
    currencyCode: string;
  };
  state: string;
  tags: string[];
  note?: string;
  verifiedEmail: boolean;
  locale?: string;
  taxExempt?: boolean;
  defaultAddress?: AdminAddress;
  addresses?: AdminAddress[];
  orders?: {
    edges: {
      node: AdminOrderBasic;
    }[];
    pageInfo: {
      hasNextPage: boolean;
    };
  };
  lastOrder?: AdminOrderBasic;
  metafields?: {
    edges: {
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }[];
  };
}

export interface AdminCustomerBasic {
  id: string;
  legacyResourceId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  numberOfOrders?: number;
  amountSpent?: {
    amount: string;
    currencyCode: string;
  };
  createdAt?: string;
  note?: string;
  tags?: string[];
}

export interface AdminOrderBasic {
  id: string;
  legacyResourceId?: string;
  name: string;
  createdAt: string;
  processedAt?: string;
  displayFinancialStatus?: string;
  displayFulfillmentStatus?: string;
  totalPriceSet: MoneySet;
  lineItems?: {
    edges: {
      node: {
        name: string;
        quantity: number;
        image?: { url: string };
      };
    }[];
  };
}

export interface AdminLineItem {
  id: string;
  name: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  originalTotalSet: MoneySet;
  image?: {
    url: string;
    altText?: string;
  };
  customAttributes?: {
    key: string;
    value: string;
  }[];
  product?: {
    id: string;
    handle: string;
  };
  variant?: {
    id: string;
    title: string;
  };
}

export interface AdminFulfillment {
  id: string;
  status: string;
  displayStatus?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryAt?: string;
  trackingInfo?: {
    company?: string;
    number?: string;
    url?: string;
  }[];
  fulfillmentLineItems?: {
    edges: {
      node: {
        lineItem: {
          id: string;
          name: string;
        };
        quantity: number;
      };
    }[];
  };
}

export interface AdminAddress {
  id?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  provinceCode?: string;
  country?: string;
  countryCode?: string;
  zip?: string;
  phone?: string;
}

interface MoneySet {
  shopMoney: {
    amount: string;
    currencyCode: string;
  };
}
