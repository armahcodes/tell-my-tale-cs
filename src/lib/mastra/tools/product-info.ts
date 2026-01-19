import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { shopifyService } from '@/lib/shopify';

export const productInfoTool = createTool({
  id: 'product-info',
  description: 'Get detailed information about TellMyTale personalized books, including customization options, pricing, photo requirements, and production times.',
  inputSchema: z.object({
    productName: z.string().optional().describe('Name or partial name of the product to look up'),
    productHandle: z.string().optional().describe('Product handle/slug for direct lookup'),
    listAll: z.boolean().optional().describe('Set to true to list all available products'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    products: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      handle: z.string(),
      price: z.string(),
      compareAtPrice: z.string().optional(),
      currencyCode: z.string(),
      images: z.array(z.object({
        url: z.string(),
        altText: z.string().optional(),
      })),
      availableForSale: z.boolean(),
      ageRange: z.string().optional(),
      pageCount: z.number().optional(),
      productionTime: z.string().optional(),
    })).optional(),
    message: z.string(),
    customizationInfo: z.string().optional(),
    photoRequirements: z.string().optional(),
  }),
  // v1 signature: (inputData, context) instead of ({ context })
  execute: async (inputData) => {
    const { productName, productHandle, listAll } = inputData;

    // Standard customization and photo info (same for all books)
    const customizationInfo = `Each book can be personalized with:
• Your child's name (featured throughout the story)
• A custom dedication message
• Character appearance (hair color, eye color, skin tone)
• Your child's photo (transformed into AI-style illustration)`;

    const photoRequirements = `For best results:
• Resolution: At least 1000x1000 pixels
• Format: JPG or PNG
• Tips: Clear, front-facing photo with good lighting
• Avoid: Sunglasses, hats, or anything covering the face
• Best: Smiling photos create the best illustrations!`;

    try {
      // If looking up by handle
      if (productHandle) {
        const product = await shopifyService.getProductByHandle(productHandle);
        
        if (!product) {
          return {
            found: false,
            message: `I couldn't find a book with that name. Would you like me to show you all our available books?`,
            customizationInfo,
            photoRequirements,
          };
        }

        return {
          found: true,
          products: [{
            ...product,
            availableForSale: product.variants.some(v => v.availableForSale),
          }],
          message: `Here's the information about "${product.title}"!`,
          customizationInfo,
          photoRequirements,
        };
      }

      // Get all products
      const allProducts = await shopifyService.getProducts(50);

      // If list all requested
      if (listAll || !productName) {
        return {
          found: true,
          products: allProducts.map(p => ({
            ...p,
            availableForSale: p.variants.some(v => v.availableForSale),
          })),
          message: `We have ${allProducts.length} personalized books available! Each one is specially designed to make your child the star of their own story. All books are currently on sale at $39.99 (regularly $59.99)!`,
          customizationInfo,
          photoRequirements,
        };
      }

      // Search by name
      const searchResults = await shopifyService.searchProducts(productName);

      if (searchResults.length === 0) {
        // Return all products with a helpful message
        return {
          found: false,
          products: allProducts.slice(0, 5).map(p => ({
            ...p,
            availableForSale: p.variants.some(v => v.availableForSale),
          })),
          message: `I couldn't find a book matching "${productName}", but here are some of our popular titles! Would you like more details about any of these?`,
          customizationInfo,
          photoRequirements,
        };
      }

      return {
        found: true,
        products: searchResults.map(p => ({
          ...p,
          availableForSale: p.variants.some(v => v.availableForSale),
        })),
        message: `Found ${searchResults.length} book${searchResults.length > 1 ? 's' : ''} matching "${productName}"!`,
        customizationInfo,
        photoRequirements,
      };

    } catch (error) {
      console.error('Product lookup error:', error);
      
      // Return fallback product info based on known catalog
      return {
        found: true,
        message: `I'm having trouble loading our full catalog right now, but I can tell you about our books! We have over 20 personalized titles including:

**Adventure Stories**: The Princess Inside, Superhero, Animal Adventure, The World of Dinosaurs, Space Adventure

**Family Love**: How Much I Love Mommy, How Much I Love Daddy, My Heart Will Always Love You

**Special Themes**: Happy Birthday, Rainbow Unicorn Valley, The Championship Court, Child Dream Big

All books are currently on sale at $39.99 (regularly $59.99) and include FREE shipping!`,
        customizationInfo,
        photoRequirements,
      };
    }
  },
});
