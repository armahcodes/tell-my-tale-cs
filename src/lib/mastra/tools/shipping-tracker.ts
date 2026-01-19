import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { shopifyService } from '@/lib/shopify';

// Define the valid status types
type ShipmentStatusType = 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'processing' | 'pending';

export const shippingTrackerTool = createTool({
  id: 'shipping-tracker',
  description: 'Track shipment status for TellMyTale orders. Provides real-time shipping updates and estimated delivery information.',
  inputSchema: z.object({
    trackingNumber: z.string().optional().describe('The carrier tracking number'),
    orderNumber: z.string().optional().describe('The TellMyTale order number'),
    accessToken: z.string().optional().describe('Customer access token for authenticated lookup'),
    orderId: z.string().optional().describe('Shopify order ID for direct lookup'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    shipment: z.object({
      orderNumber: z.string(),
      orderName: z.string(),
      status: z.enum(['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'processing', 'pending']),
      statusDescription: z.string(),
      carrier: z.string().optional(),
      trackingNumber: z.string().optional(),
      trackingUrl: z.string().optional(),
      estimatedDelivery: z.string().optional(),
      shippingAddress: z.object({
        city: z.string(),
        province: z.string(),
        country: z.string(),
      }).optional(),
    }).optional(),
    message: z.string(),
    requiresAuth: z.boolean().optional(),
  }),
  // v1 signature: (inputData, context) instead of ({ context })
  execute: async (inputData) => {
    const { trackingNumber, orderNumber, accessToken, orderId } = inputData;

    if (!trackingNumber && !orderNumber && !accessToken && !orderId) {
      return {
        found: false,
        message: 'Please provide a tracking number or order number to track your shipment. You can also sign in to your account to see tracking for all your orders.',
        requiresAuth: true,
      };
    }

    try {
      // If we have an access token, look up through Customer Account API
      if (accessToken && (orderId || orderNumber)) {
        let order;
        
        if (orderId) {
          order = await shopifyService.getOrderById(accessToken, orderId);
        } else if (orderNumber) {
          const orders = await shopifyService.getCustomerOrders(accessToken, 20);
          order = orders.find(o => 
            o.orderNumber.includes(orderNumber) || 
            o.orderName.includes(orderNumber)
          );
        }

        if (!order) {
          return {
            found: false,
            message: `I couldn't find shipping information for that order. The order might not have shipped yet, or please verify the order number.`,
          };
        }

        // Map order status to shipment status
        let shipmentStatus: ShipmentStatusType = 'pending';
        let statusDescription = 'Your order is being processed';

        switch (order.status) {
          case 'delivered':
            shipmentStatus = 'delivered';
            statusDescription = 'Your book has been delivered! We hope your little one loves it!';
            break;
          case 'shipped':
            if (order.tracking?.number) {
              shipmentStatus = 'in_transit';
              statusDescription = 'Your book is on its way! It\'s traveling to your location right now.';
            } else {
              shipmentStatus = 'label_created';
              statusDescription = 'Shipping label has been created. Your package will be picked up soon!';
            }
            break;
          case 'processing':
            shipmentStatus = 'processing';
            statusDescription = 'Your personalized book is being lovingly crafted by our team!';
            break;
          case 'pending':
            shipmentStatus = 'pending';
            statusDescription = 'Your order has been received and is in the queue for production.';
            break;
          case 'cancelled':
            return {
              found: true,
              shipment: {
                orderNumber: order.orderNumber,
                orderName: order.orderName,
                status: 'pending' as const,
                statusDescription: 'This order has been cancelled.',
              },
              message: 'This order has been cancelled.',
            };
        }

        return {
          found: true,
          shipment: {
            orderNumber: order.orderNumber,
            orderName: order.orderName,
            status: shipmentStatus,
            statusDescription,
            carrier: order.tracking?.company,
            trackingNumber: order.tracking?.number,
            trackingUrl: order.tracking?.url,
            estimatedDelivery: order.estimatedDelivery,
            shippingAddress: order.shippingAddress ? {
              city: order.shippingAddress.city,
              province: order.shippingAddress.province,
              country: order.shippingAddress.country,
            } : undefined,
          },
          message: order.tracking?.number 
            ? `Found tracking information for your order!`
            : `Found your order! ${shipmentStatus === 'processing' ? 'Your book is still being made - tracking will be available once it ships.' : ''}`,
        };
      }

      // For tracking number only lookups
      if (trackingNumber) {
        // Provide helpful information about tracking
        const carrierInfo = detectCarrier(trackingNumber);
        
        return {
          found: true,
          shipment: {
            orderNumber: orderNumber || 'Unknown',
            orderName: orderNumber ? `#${orderNumber}` : 'Your Order',
            status: 'in_transit' as const,
            statusDescription: 'Package is in transit. For detailed tracking, please visit the carrier website.',
            carrier: carrierInfo.carrier,
            trackingNumber,
            trackingUrl: carrierInfo.url,
          },
          message: `I found your tracking number! For real-time updates, you can track directly with ${carrierInfo.carrier} using the link provided.`,
        };
      }

      // Need authentication for order lookup without tracking number
      return {
        found: false,
        message: `To look up tracking for order #${orderNumber}, please sign in to your TellMyTale account, or provide the tracking number from your shipping confirmation email.`,
        requiresAuth: true,
      };

    } catch (error) {
      console.error('Shipping tracker error:', error);
      return {
        found: false,
        message: 'I encountered an issue looking up tracking information. Please try again in a moment, or contact us at support@tellmytale.com for assistance.',
      };
    }
  },
});

// Helper to detect carrier from tracking number format
function detectCarrier(trackingNumber: string): { carrier: string; url: string } {
  const num = trackingNumber.toUpperCase().replace(/\s/g, '');
  
  // UPS: Starts with 1Z
  if (num.startsWith('1Z')) {
    return {
      carrier: 'UPS',
      url: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    };
  }
  
  // FedEx: 12-15 digits or starts with specific patterns
  if (/^\d{12,15}$/.test(num) || num.startsWith('6')) {
    return {
      carrier: 'FedEx',
      url: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    };
  }
  
  // USPS: 20-22 digits or starts with 94
  if (/^94\d{18,20}$/.test(num) || /^\d{20,22}$/.test(num)) {
    return {
      carrier: 'USPS',
      url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    };
  }
  
  // DHL: 10 digits
  if (/^\d{10}$/.test(num)) {
    return {
      carrier: 'DHL',
      url: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    };
  }
  
  // Default
  return {
    carrier: 'Carrier',
    url: `https://www.google.com/search?q=track+package+${trackingNumber}`,
  };
}
