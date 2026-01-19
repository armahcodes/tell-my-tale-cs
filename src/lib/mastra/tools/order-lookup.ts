import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { shopifyService } from '@/lib/shopify';

export const orderLookupTool = createTool({
  id: 'order-lookup',
  description: 'Look up order details by order number or customer email. Returns order status, production stage, shipping information, and estimated delivery date. Requires customer access token for authenticated lookups.',
  inputSchema: z.object({
    orderNumber: z.string().optional().describe('The order number (e.g., 1001, 1002)'),
    email: z.string().email().optional().describe('Customer email address to find associated orders'),
    accessToken: z.string().optional().describe('Customer access token for authenticated order lookup'),
    orderId: z.string().optional().describe('Shopify order ID for direct lookup'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    orders: z.array(z.object({
      orderNumber: z.string(),
      orderId: z.string(),
      orderName: z.string(),
      customerName: z.string(),
      status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
      statusDescription: z.string(),
      processedAt: z.string(),
      totalPrice: z.string(),
      currencyCode: z.string(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.string(),
        image: z.string().optional(),
      })),
      shippingAddress: z.object({
        firstName: z.string(),
        lastName: z.string(),
        address1: z.string(),
        city: z.string(),
        province: z.string(),
        country: z.string(),
        zip: z.string(),
      }).optional(),
      tracking: z.object({
        company: z.string().optional(),
        number: z.string().optional(),
        url: z.string().optional(),
      }).optional(),
      estimatedDelivery: z.string().optional(),
      canBeModified: z.boolean(),
    })).optional(),
    message: z.string(),
    requiresAuth: z.boolean().optional(),
  }),
  // v1 signature: (inputData, context) instead of ({ context })
  execute: async (inputData) => {
    const { orderNumber, email, accessToken, orderId } = inputData;
    
    // If no identifiers provided
    if (!orderNumber && !email && !accessToken && !orderId) {
      return {
        found: false,
        message: 'Please provide either an order number, email address, or sign in to view your orders.',
        requiresAuth: true,
      };
    }

    try {
      // If we have an access token, use Customer Account API
      if (accessToken) {
        if (orderId) {
          // Look up specific order
          const order = await shopifyService.getOrderById(accessToken, orderId);
          
          if (!order) {
            return {
              found: false,
              message: `I couldn't find an order with that ID. Please verify the order details and try again.`,
            };
          }

          return {
            found: true,
            orders: [order],
            message: `Found your order!`,
          };
        } else {
          // Get all customer orders
          const orders = await shopifyService.getCustomerOrders(accessToken, 10);
          
          if (orders.length === 0) {
            return {
              found: false,
              message: `I couldn't find any orders associated with your account.`,
            };
          }

          // If looking for specific order number, filter
          if (orderNumber) {
            const filteredOrders = orders.filter(o => 
              o.orderNumber.includes(orderNumber) || 
              o.orderName.includes(orderNumber)
            );

            if (filteredOrders.length === 0) {
              return {
                found: false,
                message: `I couldn't find order #${orderNumber} in your account. Here are your recent orders though!`,
                orders,
              };
            }

            return {
              found: true,
              orders: filteredOrders,
              message: `Found your order #${orderNumber}!`,
            };
          }

          return {
            found: true,
            orders,
            message: `Found ${orders.length} order${orders.length > 1 ? 's' : ''} in your account.`,
          };
        }
      }

      // For non-authenticated users, try order lookup by number + email
      if (orderNumber && email) {
        const order = await shopifyService.lookupOrderByNumber(orderNumber, email);
        
        if (!order) {
          return {
            found: false,
            message: `I couldn't find order #${orderNumber} with that email address. Please double-check your order confirmation email for the correct details, or sign in to your account to view your orders.`,
            requiresAuth: true,
          };
        }

        return {
          found: true,
          orders: [order],
          message: `Found your order!`,
        };
      }

      // Need more information
      return {
        found: false,
        message: orderNumber 
          ? `To look up order #${orderNumber}, I'll need the email address you used when placing the order. Alternatively, you can sign in to your TellMyTale account to view all your orders.`
          : `To find your orders, please provide your order number and email address, or sign in to your TellMyTale account.`,
        requiresAuth: true,
      };

    } catch (error) {
      console.error('Order lookup error:', error);
      return {
        found: false,
        message: 'I encountered an issue looking up your order. Please try again in a moment, or contact us at support@tellmytale.com for assistance.',
      };
    }
  },
});
