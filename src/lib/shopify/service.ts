/**
 * Shopify Service - Unified API for store operations
 * Combines Storefront API, Customer Account API, and Admin API
 * 
 * Documentation: https://shopify.dev/docs/api/customer/2025-10
 */

import { getStorefrontClient, PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY } from './client';
import { 
  customerAccountQuery, 
  CUSTOMER_ORDERS_QUERY, 
  CUSTOMER_ORDER_BY_ID_QUERY,
  CUSTOMER_PROFILE_QUERY,
  type CustomerOrder,
  type CustomerProfile
} from './customer-account';
import {
  adminApiQuery,
  ADMIN_ORDERS_QUERY,
  ADMIN_ORDER_BY_ID_QUERY,
  ADMIN_CUSTOMERS_QUERY,
  ADMIN_CUSTOMER_BY_ID_QUERY,
  type AdminOrder,
  type AdminCustomer,
} from './admin';

// Check if Admin API is available
const ADMIN_API_AVAILABLE = !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && 
  !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.startsWith('shpss_');

// Types
export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  tags: string[];
  price: string;
  compareAtPrice?: string;
  currencyCode: string;
  images: { url: string; altText?: string }[];
  variants: {
    id: string;
    title: string;
    price: string;
    compareAtPrice?: string;
    availableForSale: boolean;
  }[];
  ageRange?: string;
  pageCount?: number;
  productionTime?: string;
}

export type OrderStatusType = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type ProductionStage = 'order_received' | 'in_production' | 'printing' | 'binding' | 'quality_check' | 'ready_to_ship';

export interface OrderStatus {
  orderNumber: string;
  orderId: string;
  orderName: string;
  customerName: string;
  email?: string;
  status: OrderStatusType;
  statusDescription: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  processedAt: string;
  totalPrice: string;
  currencyCode: string;
  items: {
    name: string;
    quantity: number;
    price: string;
    image?: string;
    customAttributes?: { key: string; value: string }[];
  }[];
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  tracking?: {
    company?: string;
    number?: string;
    url?: string;
  };
  estimatedDelivery?: string;
  canBeModified: boolean;
}

// Shopify Service Class
class ShopifyService {
  /**
   * Get all products from the store using Storefront API
   */
  async getProducts(limit: number = 50): Promise<ShopifyProduct[]> {
    try {
      const client = getStorefrontClient();
      const { data } = await client.request(PRODUCTS_QUERY, {
        variables: { first: limit },
      });

      return data.products.edges.map((edge: any) => this.transformProduct(edge.node));
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  /**
   * Get a single product by handle using Storefront API
   */
  async getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
    try {
      const client = getStorefrontClient();
      const { data } = await client.request(PRODUCT_BY_HANDLE_QUERY, {
        variables: { handle },
      });

      if (!data.productByHandle) return null;
      return this.transformProduct(data.productByHandle);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  /**
   * Search products by name or keyword
   */
  async searchProducts(query: string): Promise<ShopifyProduct[]> {
    const products = await this.getProducts(100);
    const searchLower = query.toLowerCase();
    
    return products.filter(product => 
      product.title.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Get customer orders using Customer Account API
   * Requires valid access token from OAuth flow
   */
  async getCustomerOrders(accessToken: string, first: number = 10): Promise<OrderStatus[]> {
    try {
      const data = await customerAccountQuery<{ customer: { orders: any } }>(
        accessToken,
        CUSTOMER_ORDERS_QUERY,
        { first }
      );

      return data.customer.orders.edges.map((edge: any) => 
        this.transformOrder(edge.node)
      );
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID using Customer Account API
   */
  async getOrderById(accessToken: string, orderId: string): Promise<OrderStatus | null> {
    try {
      const data = await customerAccountQuery<{ customer: { order: any } }>(
        accessToken,
        CUSTOMER_ORDER_BY_ID_QUERY,
        { orderId }
      );

      if (!data.customer.order) return null;
      return this.transformOrder(data.customer.order);
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Get customer profile using Customer Account API
   */
  async getCustomerProfile(accessToken: string): Promise<CustomerProfile | null> {
    try {
      const data = await customerAccountQuery<{ customer: CustomerProfile }>(
        accessToken,
        CUSTOMER_PROFILE_QUERY
      );

      return data.customer;
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      throw error;
    }
  }

  /**
   * Look up order by order number (for non-authenticated users)
   * Uses Admin API to search by order name
   */
  async lookupOrderByNumber(orderNumber: string, email: string): Promise<OrderStatus | null> {
    if (!ADMIN_API_AVAILABLE) {
      console.warn('Admin API not configured - order lookup unavailable');
      return null;
    }

    try {
      const query = `name:${orderNumber} email:${email}`;
      const data = await adminApiQuery<{ orders: { edges: { node: AdminOrder }[] } }>(
        ADMIN_ORDERS_QUERY,
        { first: 1, query }
      );

      if (!data.orders.edges.length) return null;
      
      const order = data.orders.edges[0].node;
      if (order.email?.toLowerCase() !== email.toLowerCase()) {
        return null;
      }
      
      return this.transformAdminOrder(order);
    } catch (error) {
      console.error('Error looking up order:', error);
      return null;
    }
  }

  // ============================================
  // Admin API Methods (for Dashboard)
  // ============================================

  /**
   * Check if Admin API is available
   */
  isAdminApiAvailable(): boolean {
    return ADMIN_API_AVAILABLE;
  }

  /**
   * Get all orders from the store (Admin API)
   */
  async getAllOrders(
    first: number = 50,
    after?: string,
    query?: string
  ): Promise<{ orders: OrderStatus[]; pageInfo: { hasNextPage: boolean; endCursor?: string }; error?: string }> {
    if (!ADMIN_API_AVAILABLE) {
      return {
        orders: [],
        pageInfo: { hasNextPage: false },
        error: 'Shopify Admin API not configured. Set SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables.',
      };
    }

    try {
      const data = await adminApiQuery<{ 
        orders: { 
          edges: { cursor: string; node: AdminOrder }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        } 
      }>(ADMIN_ORDERS_QUERY, { first, after, query });

      return {
        orders: data.orders.edges.map(edge => this.transformAdminOrder(edge.node)),
        pageInfo: data.orders.pageInfo,
      };
    } catch (error) {
      console.error('Error fetching all orders:', error);
      return {
        orders: [],
        pageInfo: { hasNextPage: false },
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      };
    }
  }

  /**
   * Get a single order by ID (Admin API)
   */
  async getAdminOrderById(orderId: string): Promise<AdminOrder | null> {
    if (!ADMIN_API_AVAILABLE) {
      return null;
    }

    try {
      const gid = orderId.startsWith('gid://') 
        ? orderId 
        : `gid://shopify/Order/${orderId}`;
      
      const data = await adminApiQuery<{ order: AdminOrder }>(
        ADMIN_ORDER_BY_ID_QUERY,
        { id: gid }
      );

      return data.order;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Get all customers from the store (Admin API)
   */
  async getAllCustomers(
    first: number = 50,
    after?: string,
    query?: string
  ): Promise<{ customers: AdminCustomer[]; pageInfo: { hasNextPage: boolean; endCursor?: string }; error?: string }> {
    if (!ADMIN_API_AVAILABLE) {
      return {
        customers: [],
        pageInfo: { hasNextPage: false },
        error: 'Shopify Admin API not configured. Set SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables.',
      };
    }

    try {
      const data = await adminApiQuery<{ 
        customers: { 
          edges: { cursor: string; node: AdminCustomer }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        } 
      }>(ADMIN_CUSTOMERS_QUERY, { first, after, query });

      return {
        customers: data.customers.edges.map(edge => edge.node),
        pageInfo: data.customers.pageInfo,
      };
    } catch (error) {
      console.error('Error fetching all customers:', error);
      return {
        customers: [],
        pageInfo: { hasNextPage: false },
        error: error instanceof Error ? error.message : 'Failed to fetch customers',
      };
    }
  }

  /**
   * Get a single customer by ID with their orders (Admin API)
   */
  async getAdminCustomerById(customerId: string): Promise<AdminCustomer | null> {
    if (!ADMIN_API_AVAILABLE) {
      return null;
    }

    try {
      const gid = customerId.startsWith('gid://') 
        ? customerId 
        : `gid://shopify/Customer/${customerId}`;
      
      const data = await adminApiQuery<{ customer: AdminCustomer }>(
        ADMIN_CUSTOMER_BY_ID_QUERY,
        { id: gid }
      );

      return data.customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  }

  // Transform Admin API order to our format
  private transformAdminOrder(adminOrder: AdminOrder): OrderStatus {
    const fulfillment = adminOrder.fulfillments?.[0];
    const tracking = fulfillment?.trackingInfo?.[0];
    
    const { status, statusDescription } = this.determineAdminOrderStatus(adminOrder);

    const processedAt = new Date(adminOrder.processedAt || adminOrder.createdAt);
    const hoursSinceOrder = (Date.now() - processedAt.getTime()) / (1000 * 60 * 60);
    const canBeModified = hoursSinceOrder <= 24 && ['pending', 'processing'].includes(status);

    return {
      orderNumber: adminOrder.legacyResourceId || adminOrder.name.replace('#', ''),
      orderId: adminOrder.id,
      orderName: adminOrder.name,
      customerName: adminOrder.shippingAddress 
        ? `${adminOrder.shippingAddress.firstName || ''} ${adminOrder.shippingAddress.lastName || ''}`.trim()
        : adminOrder.customer?.firstName && adminOrder.customer?.lastName
          ? `${adminOrder.customer.firstName} ${adminOrder.customer.lastName}`
          : 'Customer',
      email: adminOrder.email,
      status,
      statusDescription,
      fulfillmentStatus: adminOrder.displayFulfillmentStatus,
      financialStatus: adminOrder.displayFinancialStatus,
      processedAt: adminOrder.processedAt || adminOrder.createdAt,
      totalPrice: adminOrder.totalPriceSet.shopMoney.amount,
      currencyCode: adminOrder.totalPriceSet.shopMoney.currencyCode,
      items: adminOrder.lineItems.edges.map(e => ({
        name: e.node.name || e.node.title,
        quantity: e.node.quantity,
        price: e.node.originalTotalSet.shopMoney.amount,
        image: e.node.image?.url,
        customAttributes: e.node.customAttributes,
      })),
      shippingAddress: adminOrder.shippingAddress ? {
        firstName: adminOrder.shippingAddress.firstName || '',
        lastName: adminOrder.shippingAddress.lastName || '',
        address1: adminOrder.shippingAddress.address1 || '',
        city: adminOrder.shippingAddress.city || '',
        province: adminOrder.shippingAddress.provinceCode || adminOrder.shippingAddress.province || '',
        country: adminOrder.shippingAddress.countryCode || adminOrder.shippingAddress.country || '',
        zip: adminOrder.shippingAddress.zip || '',
      } : undefined,
      tracking: tracking ? {
        company: tracking.company,
        number: tracking.number,
        url: tracking.url,
      } : undefined,
      estimatedDelivery: fulfillment?.estimatedDeliveryAt,
      canBeModified,
    };
  }

  // Helper to determine admin order status
  private determineAdminOrderStatus(order: AdminOrder): { status: OrderStatusType; statusDescription: string } {
    if (order.cancelledAt) {
      return {
        status: 'cancelled',
        statusDescription: 'This order has been cancelled',
      };
    }

    const fulfillmentStatus = order.displayFulfillmentStatus?.toUpperCase();
    
    if (fulfillmentStatus === 'FULFILLED') {
      const fulfillment = order.fulfillments?.[0];
      if (fulfillment?.displayStatus === 'DELIVERED') {
        return {
          status: 'delivered',
          statusDescription: 'Your book has been delivered!',
        };
      }
      return {
        status: 'shipped',
        statusDescription: 'Your book is on its way!',
      };
    }

    if (fulfillmentStatus === 'IN_PROGRESS' || fulfillmentStatus === 'PARTIALLY_FULFILLED') {
      return {
        status: 'shipped',
        statusDescription: 'Your order is being shipped',
      };
    }

    const processedAt = new Date(order.processedAt || order.createdAt);
    const hoursSinceOrder = (Date.now() - processedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceOrder < 2) {
      return {
        status: 'pending',
        statusDescription: 'Order received and being processed',
      };
    }

    return {
      status: 'processing',
      statusDescription: 'Your personalized book is in production!',
    };
  }

  // Transform Shopify product to our format
  private transformProduct(shopifyProduct: any): ShopifyProduct {
    const metafields = shopifyProduct.metafields || [];
    
    return {
      id: shopifyProduct.id,
      title: shopifyProduct.title,
      description: shopifyProduct.description || '',
      handle: shopifyProduct.handle,
      productType: shopifyProduct.productType || '',
      tags: shopifyProduct.tags || [],
      price: shopifyProduct.priceRange?.minVariantPrice?.amount || '0',
      compareAtPrice: shopifyProduct.compareAtPriceRange?.minVariantPrice?.amount,
      currencyCode: shopifyProduct.priceRange?.minVariantPrice?.currencyCode || 'USD',
      images: shopifyProduct.images?.edges?.map((e: any) => ({
        url: e.node.url,
        altText: e.node.altText,
      })) || [],
      variants: shopifyProduct.variants?.edges?.map((e: any) => ({
        id: e.node.id,
        title: e.node.title,
        price: e.node.price?.amount || '0',
        compareAtPrice: e.node.compareAtPrice?.amount,
        availableForSale: e.node.availableForSale,
      })) || [],
      ageRange: metafields.find((m: any) => m?.key === 'age_range')?.value,
      pageCount: metafields.find((m: any) => m?.key === 'page_count')?.value 
        ? parseInt(metafields.find((m: any) => m?.key === 'page_count')?.value) 
        : undefined,
      productionTime: metafields.find((m: any) => m?.key === 'production_time')?.value,
    };
  }

  // Transform Shopify order to our format
  private transformOrder(shopifyOrder: any): OrderStatus {
    const fulfillment = shopifyOrder.fulfillments?.[0];
    const tracking = fulfillment?.trackingInformation?.[0];
    
    const { status, statusDescription } = this.determineOrderStatus(shopifyOrder, fulfillment);

    const processedAt = new Date(shopifyOrder.processedAt);
    const hoursSinceOrder = (Date.now() - processedAt.getTime()) / (1000 * 60 * 60);
    const canBeModified = hoursSinceOrder <= 24 && ['pending', 'processing'].includes(status);

    return {
      orderNumber: shopifyOrder.number?.toString() || shopifyOrder.name?.replace('#', ''),
      orderId: shopifyOrder.id,
      orderName: shopifyOrder.name,
      customerName: shopifyOrder.shippingAddress 
        ? `${shopifyOrder.shippingAddress.firstName} ${shopifyOrder.shippingAddress.lastName}`
        : 'Customer',
      status,
      statusDescription,
      fulfillmentStatus: fulfillment?.status,
      financialStatus: shopifyOrder.financialStatus,
      processedAt: shopifyOrder.processedAt,
      totalPrice: shopifyOrder.totalPrice?.amount || '0',
      currencyCode: shopifyOrder.totalPrice?.currencyCode || 'USD',
      items: shopifyOrder.lineItems?.edges?.map((e: any) => ({
        name: e.node.name || e.node.title,
        quantity: e.node.quantity,
        price: e.node.totalPrice?.amount || '0',
        image: e.node.image?.url,
      })) || [],
      shippingAddress: shopifyOrder.shippingAddress ? {
        firstName: shopifyOrder.shippingAddress.firstName,
        lastName: shopifyOrder.shippingAddress.lastName,
        address1: shopifyOrder.shippingAddress.address1,
        city: shopifyOrder.shippingAddress.city,
        province: shopifyOrder.shippingAddress.provinceCode || shopifyOrder.shippingAddress.province,
        country: shopifyOrder.shippingAddress.countryCode || shopifyOrder.shippingAddress.country,
        zip: shopifyOrder.shippingAddress.zip,
      } : undefined,
      tracking: tracking ? {
        company: tracking.company,
        number: tracking.number,
        url: tracking.url,
      } : undefined,
      estimatedDelivery: fulfillment?.estimatedDeliveryAt,
      canBeModified,
    };
  }

  // Helper to determine order status
  private determineOrderStatus(
    shopifyOrder: any, 
    fulfillment: any
  ): { status: OrderStatusType; statusDescription: string } {
    if (shopifyOrder.cancelledAt) {
      return {
        status: 'cancelled',
        statusDescription: 'This order has been cancelled',
      };
    }
    
    if (fulfillment) {
      const fulfillmentStatus = fulfillment.latestShipmentStatus?.status || fulfillment.status;
      
      if (fulfillmentStatus === 'DELIVERED') {
        return {
          status: 'delivered',
          statusDescription: 'Your book has been delivered! Enjoy!',
        };
      }
      
      if (fulfillmentStatus === 'IN_TRANSIT' || fulfillmentStatus === 'OUT_FOR_DELIVERY') {
        return {
          status: 'shipped',
          statusDescription: 'Your book is on its way to you!',
        };
      }
      
      if (fulfillmentStatus === 'CONFIRMED' || fulfillmentStatus === 'PICKED_UP') {
        return {
          status: 'shipped',
          statusDescription: 'Your book has been shipped!',
        };
      }
      
      return {
        status: 'processing',
        statusDescription: 'Your book is being lovingly crafted!',
      };
    }
    
    const processedAt = new Date(shopifyOrder.processedAt);
    const hoursSinceOrder = (Date.now() - processedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceOrder < 2) {
      return {
        status: 'pending',
        statusDescription: 'Order received and being processed',
      };
    }
    
    return {
      status: 'processing',
      statusDescription: 'Your personalized book is in production!',
    };
  }
}

// Export singleton instance
export const shopifyService = new ShopifyService();

// Re-export types
export type { CustomerOrder, CustomerProfile, AdminOrder, AdminCustomer };
