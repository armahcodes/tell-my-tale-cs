/**
 * Shopify tRPC Router
 * Fetches real data from Shopify APIs
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { shopifyService } from '@/lib/shopify';

export const shopifyRouter = router({
  // ============================================
  // Storefront API Routes (Public)
  // ============================================

  /**
   * Get all products from Shopify Storefront API
   */
  getProducts: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      try {
        const products = await shopifyService.getProducts(input?.limit || 50);
        return { products, success: true };
      } catch (error) {
        console.error('Error fetching products:', error);
        return { products: [], success: false, error: 'Failed to fetch products' };
      }
    }),

  /**
   * Get single product by handle
   */
  getProductByHandle: publicProcedure
    .input(z.object({
      handle: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const product = await shopifyService.getProductByHandle(input.handle);
        return { product, success: true };
      } catch (error) {
        console.error('Error fetching product:', error);
        return { product: null, success: false, error: 'Failed to fetch product' };
      }
    }),

  /**
   * Search products
   */
  searchProducts: publicProcedure
    .input(z.object({
      query: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const products = await shopifyService.searchProducts(input.query);
        return { products, success: true };
      } catch (error) {
        console.error('Error searching products:', error);
        return { products: [], success: false, error: 'Failed to search products' };
      }
    }),

  // ============================================
  // Customer Account API Routes (Requires Auth)
  // ============================================

  /**
   * Get customer orders (requires authentication)
   */
  getCustomerOrders: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      first: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      try {
        const orders = await shopifyService.getCustomerOrders(input.accessToken, input.first);
        return { orders, success: true };
      } catch (error) {
        console.error('Error fetching customer orders:', error);
        return { orders: [], success: false, error: 'Failed to fetch orders' };
      }
    }),

  /**
   * Get single order by ID (requires authentication)
   */
  getOrderById: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      orderId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const order = await shopifyService.getOrderById(input.accessToken, input.orderId);
        return { order, success: true };
      } catch (error) {
        console.error('Error fetching order:', error);
        return { order: null, success: false, error: 'Failed to fetch order' };
      }
    }),

  /**
   * Get customer profile (requires authentication)
   */
  getCustomerProfile: publicProcedure
    .input(z.object({
      accessToken: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const profile = await shopifyService.getCustomerProfile(input.accessToken);
        return { profile, success: true };
      } catch (error) {
        console.error('Error fetching customer profile:', error);
        return { profile: null, success: false, error: 'Failed to fetch profile' };
      }
    }),

  // ============================================
  // Admin API Routes (For Dashboard)
  // ============================================

  /**
   * Get all orders (Admin API)
   */
  getAllOrders: publicProcedure
    .input(z.object({
      first: z.number().min(1).max(100).default(50),
      after: z.string().optional(),
      query: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const result = await shopifyService.getAllOrders(
          input?.first || 50,
          input?.after,
          input?.query
        );
        return { ...result, success: true };
      } catch (error) {
        console.error('Error fetching all orders:', error);
        return { 
          orders: [], 
          pageInfo: { hasNextPage: false },
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch orders' 
        };
      }
    }),

  /**
   * Get order details (Admin API)
   */
  getAdminOrderById: publicProcedure
    .input(z.object({
      orderId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const order = await shopifyService.getAdminOrderById(input.orderId);
        return { order, success: true };
      } catch (error) {
        console.error('Error fetching order:', error);
        return { 
          order: null, 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch order' 
        };
      }
    }),

  /**
   * Get all customers (Admin API)
   */
  getAllCustomers: publicProcedure
    .input(z.object({
      first: z.number().min(1).max(100).default(50),
      after: z.string().optional(),
      query: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const result = await shopifyService.getAllCustomers(
          input?.first || 50,
          input?.after,
          input?.query
        );
        return { ...result, success: true };
      } catch (error) {
        console.error('Error fetching all customers:', error);
        return { 
          customers: [], 
          pageInfo: { hasNextPage: false },
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch customers' 
        };
      }
    }),

  /**
   * Get customer details (Admin API)
   */
  getAdminCustomerById: publicProcedure
    .input(z.object({
      customerId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const customer = await shopifyService.getAdminCustomerById(input.customerId);
        return { customer, success: true };
      } catch (error) {
        console.error('Error fetching customer:', error);
        return { 
          customer: null, 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch customer' 
        };
      }
    }),

  /**
   * Lookup order by number and email (Admin API)
   */
  lookupOrder: publicProcedure
    .input(z.object({
      orderNumber: z.string(),
      email: z.string().email(),
    }))
    .query(async ({ input }) => {
      try {
        const order = await shopifyService.lookupOrderByNumber(input.orderNumber, input.email);
        return { order, success: true };
      } catch (error) {
        console.error('Error looking up order:', error);
        return { 
          order: null, 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to look up order' 
        };
      }
    }),
});
