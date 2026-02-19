/**
 * Response Templates for TellMyTale Customer Success
 * These templates are used by AI agents to respond to common customer scenarios
 */

export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  subject?: string;
  body: string;
  variables: string[];
  tags: string[];
}

export const TEMPLATE_CATEGORIES = {
  ORDER_CANCELLATION: 'order_cancellation',
  ORDER_STATUS: 'order_status',
  RETURNS_REPLACEMENT: 'returns_replacement',
  REVISIONS: 'revisions',
  SHIPPING: 'shipping',
  GENERAL: 'general',
} as const;

export const TEMPLATE_SUBCATEGORIES = {
  // Order Cancellation
  WITHIN_24H: 'within_24h',
  AFTER_24H_NOT_PUSHED: 'after_24h_not_pushed',
  IN_PRODUCTION: 'in_production',
  SHIPPED: 'shipped',
  DUPLICATE: 'duplicate',
  
  // Order Status
  PRE_PUSH: 'pre_push',
  // IN_PRODUCTION (shared)
  // SHIPPED (shared)
  DELIVERED: 'delivered',
  
  // Returns
  WRONG_BOOK: 'wrong_book',
  DISSATISFACTION: 'dissatisfaction',
  QUALITY: 'quality',
  WRONG_ADDRESS: 'wrong_address',
  
  // Revisions
  PENDING: 'pending',
  // IN_PRODUCTION (shared)
} as const;

export const responseTemplates: ResponseTemplate[] = [
  // ============================================
  // ORDER CANCELLATION TEMPLATES
  // ============================================
  {
    id: 'cancel-within-24h',
    name: 'Order Cancellation - Within 24 Hours',
    category: TEMPLATE_CATEGORIES.ORDER_CANCELLATION,
    subcategory: TEMPLATE_SUBCATEGORIES.WITHIN_24H,
    body: `Hi [Customer Name],

Thanks for letting me know and I completely understand.

I've cancelled your order within the 24-hour window and processed your refund, so everything is taken care of.

You should see the full amount back on your original payment method within 3–5 business days, depending on your bank.

If you need anything else, I'm here and happy to help.

Yours truly,`,
    variables: ['customer_name'],
    tags: ['cancellation', 'refund', 'within_24h'],
  },
  {
    id: 'cancel-after-24h-not-pushed',
    name: 'Order Cancellation - After 24h (Not in Production)',
    category: TEMPLATE_CATEGORIES.ORDER_CANCELLATION,
    subcategory: TEMPLATE_SUBCATEGORIES.AFTER_24H_NOT_PUSHED,
    body: `Hi [Customer Name],

I can confirm with you that your order hasn't been sent to production yet so I can still cancel this for you.

Please know that I will take care of your refund request and it will reflect on your end within 1 - 3 business days.

If there is anything else I can help with, feel free to respond back. Otherwise, there is no need to reply.

Hope you have a good day ahead. 🤗`,
    variables: ['customer_name'],
    tags: ['cancellation', 'refund', 'pre_production'],
  },
  {
    id: 'cancel-in-production',
    name: 'Order Cancellation - In Production',
    category: TEMPLATE_CATEGORIES.ORDER_CANCELLATION,
    subcategory: TEMPLATE_SUBCATEGORIES.IN_PRODUCTION,
    body: `Hi [Customer Name],

Thank you for reaching out.

I checked on your order, and it has already moved into production, which means I'm no longer able to stop or cancel it at this stage.

That said, I've got you covered under our Happiness Guarantee, and I want to make this right for you. I took the initiative to contact my manager, and he approved this solution especially for you!

Here's what I can offer immediately:
• Your current canvas will still be completed and shipped as planned
• I've created a Personal Discount Code for you to use on a future order, as a goodwill gesture, which has a value of [Discount Amount]
• The code can be used on any book, whenever you're ready

Your discount code is: [Discount Code]
(There's no rush — it doesn't expire.)

Your satisfaction truly matters to me, and I appreciate you giving me the chance to help.

Yours truly,`,
    variables: ['customer_name', 'discount_amount', 'discount_code'],
    tags: ['cancellation', 'in_production', 'discount', 'happiness_guarantee'],
  },
  {
    id: 'cancel-shipped',
    name: 'Order Cancellation - Already Shipped/Delivered',
    category: TEMPLATE_CATEGORIES.ORDER_CANCELLATION,
    subcategory: TEMPLATE_SUBCATEGORIES.SHIPPED,
    body: `Hi [Customer Name],

Thanks for reaching out. I've checked the tracking for your order, and it does show as delivered as of [Delivery Date].

[Screenshot Placeholder]

That said, I want to help you figure out what happened. In many cases, packages are marked delivered a bit early or are left in a secure spot nearby.

As a next step, I recommend:
• Checking around the delivery area (front desk, porch, mailbox, or with neighbors)
• Allowing up to 24 hours, as carriers sometimes update delivery scans before the package is physically placed

If it still doesn't turn up after that, please let me know and I'll look into the available options from here. I'll stay on this with you and help however I can.

Respectfully,`,
    variables: ['customer_name', 'delivery_date'],
    tags: ['cancellation', 'shipped', 'delivered', 'tracking'],
  },
  {
    id: 'cancel-duplicate',
    name: 'Order Cancellation - Duplicate Order',
    category: TEMPLATE_CATEGORIES.ORDER_CANCELLATION,
    subcategory: TEMPLATE_SUBCATEGORIES.DUPLICATE,
    body: `Hi [Customer Name],

Thanks for letting me know and I completely understand.

I've cancelled the duplicate order and processed the refund, so everything is taken care of.

You should see the refund back on your original payment method within 3–5 business days, depending on your bank.

If you need help with anything else or want me to double-check the remaining order, I'm here and happy to help.

Yours truly,`,
    variables: ['customer_name'],
    tags: ['cancellation', 'duplicate', 'refund'],
  },

  // ============================================
  // ORDER STATUS TEMPLATES
  // ============================================
  {
    id: 'status-pre-push',
    name: 'Order Status - Pre-Push/Pending Approval',
    category: TEMPLATE_CATEGORIES.ORDER_STATUS,
    subcategory: TEMPLATE_SUBCATEGORIES.PRE_PUSH,
    body: `Hi [Customer Name],

Thanks for reaching out.

Please know that your order is still [Order Status]. Once the order is approved, it will immediately be pushed to production. Our production timeline is [Production Timeline] and additional [Shipping Timeline] for shipment. You will receive an email for your tracking details once your order is packed and ready to ship.

I appreciate your patience and understanding.

Kind regards,`,
    variables: ['customer_name', 'order_status', 'production_timeline', 'shipping_timeline'],
    tags: ['status', 'pre_production', 'pending'],
  },
  {
    id: 'status-in-production',
    name: 'Order Status - In Production',
    category: TEMPLATE_CATEGORIES.ORDER_STATUS,
    subcategory: TEMPLATE_SUBCATEGORIES.IN_PRODUCTION,
    body: `Hi [Customer Name],

Thanks for reaching out.

Upon reviewing your order, I can confirm that it is now in production. Please allow [Production Timeline] for your order to be produced, once completed shipping will take an additional [Shipping Timeline]. You will receive an email for your tracking details once your order is packed and ready to ship.

I appreciate your patience and understanding.

Kind regards,`,
    variables: ['customer_name', 'production_timeline', 'shipping_timeline'],
    tags: ['status', 'in_production'],
  },
  {
    id: 'status-shipped',
    name: 'Order Status - Shipped/In Transit',
    category: TEMPLATE_CATEGORIES.ORDER_STATUS,
    subcategory: TEMPLATE_SUBCATEGORIES.SHIPPED,
    body: `Hi [Customer Name],

Thanks for reaching out.

Upon reviewing your order, I can confirm that it is now in transit and expected to be delivered [Expected Delivery Date]. You can track your package through the tracking details below.

[Tracking Number]
[Tracking Link]

I appreciate your patience and understanding.

Kind regards,`,
    variables: ['customer_name', 'expected_delivery_date', 'tracking_number', 'tracking_link'],
    tags: ['status', 'shipped', 'tracking'],
  },
  {
    id: 'status-delivered',
    name: 'Order Status - Delivered (Package Not Received)',
    category: TEMPLATE_CATEGORIES.ORDER_STATUS,
    subcategory: TEMPLATE_SUBCATEGORIES.DELIVERED,
    body: `Hi [Customer Name],

Thank you for reaching out to us regarding your recent order.

I apologize for the inconvenience that you are facing with the delivery of your package.

Your tracking information shows that the package was delivered on [Delivery Date].

However, if you still have not received the package, I would advise you to file a claim with UPS.

You can find more information and start the claim process by visiting the following link: https://www.ups.com/us/en/support/file-a-claim.page

If you have any further questions or concerns, please don't hesitate to reach out.

Best regards,`,
    variables: ['customer_name', 'delivery_date'],
    tags: ['status', 'delivered', 'missing_package', 'ups_claim'],
  },

  // ============================================
  // RETURNS/REPLACEMENT TEMPLATES
  // ============================================
  {
    id: 'return-wrong-book',
    name: 'Return/Replacement - Wrong Book Received',
    category: TEMPLATE_CATEGORIES.RETURNS_REPLACEMENT,
    subcategory: TEMPLATE_SUBCATEGORIES.WRONG_BOOK,
    body: `Hi [Customer Name],

Thank you for reaching out and I'm so sorry to hear you received the wrong book.

This is definitely not the experience we want for you, and I want to make this right immediately.

I've already initiated a replacement order with the correct book, and it will be shipped to you as soon as possible. You don't need to return the incorrect book.

Here are the details:
• Replacement Order Number: [Replacement Order Number]
• Expected Ship Date: [Ship Date]
• You'll receive tracking information via email once it ships

If you have any other concerns or need anything else, please let me know. I'm here to help.

Sincerely,`,
    variables: ['customer_name', 'replacement_order_number', 'ship_date'],
    tags: ['return', 'replacement', 'wrong_item'],
  },
  {
    id: 'return-dissatisfaction',
    name: 'Return/Replacement - Customer Dissatisfaction',
    category: TEMPLATE_CATEGORIES.RETURNS_REPLACEMENT,
    subcategory: TEMPLATE_SUBCATEGORIES.DISSATISFACTION,
    body: `Hi [Customer Name],

Thank you for taking the time to share your feedback with us.

I'm truly sorry to hear that your experience didn't meet your expectations. Your satisfaction is incredibly important to us, and I want to understand better what went wrong so we can make it right.

Could you please share more details about what specifically you were unhappy with? This will help me find the best solution for you.

In the meantime, here are some options we can explore:
• A full replacement with any adjustments you'd like
• A partial or full refund
• A discount code for a future order

Please let me know which option works best for you, or if there's something else you had in mind.

I'm committed to turning this around for you.

Warm regards,`,
    variables: ['customer_name'],
    tags: ['return', 'dissatisfaction', 'feedback', 'resolution'],
  },
  {
    id: 'return-quality-issue',
    name: 'Return/Replacement - Quality Issue',
    category: TEMPLATE_CATEGORIES.RETURNS_REPLACEMENT,
    subcategory: TEMPLATE_SUBCATEGORIES.QUALITY,
    body: `Hi [Customer Name],

Thank you for reaching out and I'm so sorry to hear about the quality issue with your order.

We take pride in our products, and this falls short of our standards. I want to make this right for you.

To help me resolve this quickly, could you please send a few photos of the issue? This will help our quality team investigate and ensure it doesn't happen again.

Once I receive the photos, I'll immediately process a replacement for you at no additional cost.

Thank you for your patience and for bringing this to our attention.

Best regards,`,
    variables: ['customer_name'],
    tags: ['return', 'quality', 'photos_needed', 'replacement'],
  },
  {
    id: 'return-wrong-address',
    name: 'Return/Replacement - Wrong Address',
    category: TEMPLATE_CATEGORIES.RETURNS_REPLACEMENT,
    subcategory: TEMPLATE_SUBCATEGORIES.WRONG_ADDRESS,
    body: `Hi [Customer Name],

Thank you for reaching out.

I understand you've noticed the shipping address needs to be corrected. Let me help you with that.

[If not yet shipped:]
I've updated the shipping address to:
[New Address]

Your order will be shipped to this corrected address.

[If already shipped:]
Unfortunately, the order has already been shipped. Here's what we can do:
• Contact the carrier to attempt a redirect (additional fees may apply)
• Wait to see if it's returned to us, then reship to the correct address
• If neither works, we can discuss a reorder at a discounted rate

Please let me know which option works best for you, and I'll take care of it right away.

Kind regards,`,
    variables: ['customer_name', 'new_address'],
    tags: ['return', 'address', 'shipping_update'],
  },

  // ============================================
  // REVISIONS TEMPLATES
  // ============================================
  {
    id: 'revision-pending',
    name: 'Revision - Pending (Acknowledgment)',
    category: TEMPLATE_CATEGORIES.REVISIONS,
    subcategory: TEMPLATE_SUBCATEGORIES.PENDING,
    body: `Hi [Customer Name],

I will take note of the changes you want.

Please expect your revised preview to be sent to your email inbox within 24-48 hours.

It will have the subject line "Your Personalized Book is Ready". If you wish, you can also request more changes by clicking the REQUEST CHANGES option.

Kind regards,`,
    variables: ['customer_name'],
    tags: ['revision', 'pending', 'preview'],
  },
  {
    id: 'revision-in-production',
    name: 'Revision - Already in Production',
    category: TEMPLATE_CATEGORIES.REVISIONS,
    subcategory: TEMPLATE_SUBCATEGORIES.IN_PRODUCTION,
    body: `Hi [Customer Name],

Thank you for reaching out about the revision request.

I've checked on your order and unfortunately it has already entered production, which means we're unable to make changes at this point.

However, I want to make sure you're happy with your purchase. Here's what I can offer:
• Once you receive your book, if the issue significantly affects your satisfaction, we can discuss a reprint or partial refund
• I've noted your requested changes in case we need to create a replacement

I sincerely apologize for any inconvenience this may cause. Please let me know if there's anything else I can help with.

Kind regards,`,
    variables: ['customer_name'],
    tags: ['revision', 'in_production', 'unable_to_modify'],
  },

  // ============================================
  // GENERAL TEMPLATES
  // ============================================
  {
    id: 'general-greeting',
    name: 'General - Initial Greeting',
    category: TEMPLATE_CATEGORIES.GENERAL,
    subcategory: 'greeting',
    body: `Hi [Customer Name],

Thank you for reaching out to TellMyTale! I'm here to help you with any questions or concerns you may have.

Could you please provide me with more details about your inquiry? If you have an order number, that would be very helpful.

I look forward to assisting you!

Best regards,`,
    variables: ['customer_name'],
    tags: ['general', 'greeting', 'initial_contact'],
  },
  {
    id: 'general-thank-you',
    name: 'General - Thank You / Closing',
    category: TEMPLATE_CATEGORIES.GENERAL,
    subcategory: 'closing',
    body: `Hi [Customer Name],

Thank you so much for your patience and for choosing TellMyTale!

If you have any other questions in the future, please don't hesitate to reach out. We're always here to help.

Have a wonderful day!

Warm regards,`,
    variables: ['customer_name'],
    tags: ['general', 'closing', 'thank_you'],
  },
  {
    id: 'general-escalation',
    name: 'General - Escalation to Human Agent',
    category: TEMPLATE_CATEGORIES.GENERAL,
    subcategory: 'escalation',
    body: `Hi [Customer Name],

Thank you for your patience.

I want to make sure you get the best possible assistance for your inquiry. I'm going to connect you with one of our specialized team members who will be able to help you further.

They'll be reaching out to you shortly, typically within [Response Time].

In the meantime, if you have any additional details or documents related to your request, please feel free to share them here.

Thank you for your understanding!

Best regards,`,
    variables: ['customer_name', 'response_time'],
    tags: ['general', 'escalation', 'handoff'],
  },
];

// Helper functions
export function getTemplatesByCategory(category: string): ResponseTemplate[] {
  return responseTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string): ResponseTemplate | undefined {
  return responseTemplates.find(t => t.id === id);
}

export function getTemplateBySubcategory(category: string, subcategory: string): ResponseTemplate | undefined {
  return responseTemplates.find(t => t.category === category && t.subcategory === subcategory);
}

export function searchTemplates(query: string): ResponseTemplate[] {
  const lowerQuery = query.toLowerCase();
  return responseTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.body.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function fillTemplate(template: ResponseTemplate, values: Record<string, string>): string {
  let result = template.body;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `[${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}]`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  return result;
}
