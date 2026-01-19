# TellMyTale - AI Customer Success Platform

An **Agentic AI Customer Success Platform** built for [TellMyTale](https://tellmytale.com), a personalized children's book company. This platform autonomously handles customer inquiries, provides real-time order support, and scales customer service operations while maintaining a warm, family-friendly brand voice.

## 🌟 Features

### Phase 1 (Current)

- **🤖 AI Customer Success Agent**: Powered by Mastra AI and GPT-4o with TellMyTale's brand voice
- **🛒 Shopify Integration**: Real customer data via Customer Account API (2025-10)
- **📦 Order Status Tracking**: Real-time order lookup via Shopify Customer Account API
- **📚 Product Information**: Live product catalog from Shopify Storefront API
- **❓ FAQ & Policy Support**: Comprehensive knowledge base for common questions
- **🚚 Shipping Tracking**: Live shipping updates and carrier tracking
- **🚨 Smart Escalation**: Automatic escalation to human agents when needed
- **💬 Beautiful Chat Widget**: Warm, delightful customer-facing chat interface
- **📊 CS Dashboard**: Real-time monitoring and oversight for customer success managers

### Shopify Integration

Uses multiple Shopify APIs:

- **Admin API**: Full access to orders and customers for the dashboard
- **Customer Account API 2025-10**: Secure customer order lookup with OAuth/PKCE
- **Storefront API**: Public product catalog access

Discovery Endpoints for Customer Account API:
- `/.well-known/openid-configuration` - OAuth endpoints
- `/.well-known/customer-account-api` - GraphQL endpoint

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI Framework**: Mastra AI (`@mastra/core`, `@mastra/ai-sdk`)
- **LLM**: OpenAI GPT-4o
- **E-commerce**: Shopify (Storefront API + Customer Account API)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Language**: TypeScript
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- OpenAI API key
- Shopify store with Customer Account API access

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tellmytale/customer-success-platform.git
   cd customer-success-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local`:
   ```env
   # OpenAI (or Vercel AI Gateway)
   OPENAI_API_KEY=sk-your-api-key-here
   # Or use Vercel AI Gateway:
   # AI_GATEWAY_API_KEY=vck_your-gateway-key
   # OPENAI_BASE_URL=https://gateway.ai.vercel.app/v1

   # Shopify Store
   SHOPIFY_STORE_DOMAIN=tellmytale.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-token

   # Shopify Admin API (Required for Dashboard)
   # Get from: Shopify Admin > Apps > Develop apps > Create app > Admin API access
   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_your-admin-token

   # Shopify Customer Account API (Headless)
   SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID=883bd791-769b-4ef4-802b-937aa650db4b
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to see the customer-facing site with chat widget
7. Visit [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the CS manager dashboard

## 📁 Project Structure

```
tellmytale/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # Chat API endpoint
│   │   │   └── conversations/ # Conversation management API
│   │   ├── dashboard/         # CS Manager Dashboard
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage with chat widget
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── chat/
│   │       └── ChatWidget.tsx # Chat widget component
│   └── lib/
│       ├── mastra/
│       │   ├── agents/        # AI agent definitions
│       │   ├── tools/         # Agent tools (order lookup, FAQ, etc.)
│       │   └── index.ts       # Mastra initialization
│       ├── shopify/
│       │   ├── client.ts      # Storefront API & Discovery
│       │   ├── customer-account.ts  # Customer Account API (OAuth, GraphQL)
│       │   ├── service.ts     # Unified Shopify service
│       │   └── index.ts       # Exports
│       └── data/
│           ├── faq-database.ts   # FAQ knowledge base
│           └── product-catalog.ts # Fallback product data
├── .env.example              # Environment variables template
├── vercel.json               # Vercel deployment config
└── package.json
```

## 🔧 Agent Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `orderLookup` | Retrieve order details by order number or email | Shopify Customer Account API |
| `faqRetrieval` | Search FAQ knowledge base for answers | Local knowledge base |
| `productInfo` | Get product catalog and customization details | Shopify Storefront API |
| `shippingTracker` | Track shipments and delivery status | Shopify + Carrier APIs |
| `escalation` | Create escalation tickets for human review | Internal |

## 🔐 Shopify Customer Account API Flow

Based on [Shopify's 2025-10 documentation](https://shopify.dev/docs/api/customer/2025-10):

1. **Discovery**: Fetch endpoints from `/.well-known/openid-configuration`
2. **Authorization**: Redirect to discovered `authorization_endpoint` with PKCE
3. **Token Exchange**: POST to discovered `token_endpoint` with code + verifier
4. **API Calls**: Use discovered GraphQL endpoint with access token

```typescript
// Example: Get customer orders
const orders = await shopifyService.getCustomerOrders(accessToken);
```

## 📊 Dashboard Features

- **Real-time Stats**: Total conversations, active users, CSAT scores
- **AI Performance Metrics**: Resolution rate, escalation rate, response time
- **Conversation Queue**: Filter by status (active, escalated, resolved)
- **Sentiment Analysis**: Track customer sentiment trends
- **Escalation Management**: Priority queue for human attention

## 🎨 Brand Guidelines

The AI agent follows TellMyTale's brand voice:
- Warm and friendly (like a caring family member)
- Empathetic (understanding the emotional significance of personalized books)
- Patient (explaining things clearly for all tech levels)
- Professional yet personable
- Sparing use of contextual emojis (✨, 📚, 💝)

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN` (for dashboard order/customer data)
   - `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`
4. Deploy!

Or use the Vercel CLI:
```bash
npm i -g vercel
vercel
```

## 📈 Success Metrics (Phase 1 Goals)

| Metric | Target |
|--------|--------|
| First Response Time | < 2 minutes (80% of inquiries) |
| AI Resolution Rate | 70% without human escalation |
| CSAT Score | 4.7+ / 5.0 |
| Escalation Rate | < 30% |
| Availability | 24/7 |

## 🔮 Future Phases

- **Phase 2**: Email integration, autonomous actions (refunds, replacements)
- **Phase 3**: Mobile app, proactive communications, advanced analytics

## 📝 License

Proprietary - TellMyTale © 2026

---

Built with ❤️ for families who believe in the magic of personalized stories.
