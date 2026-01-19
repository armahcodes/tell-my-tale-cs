import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { faqDatabase } from '@/lib/data/faq-database';

export const faqRetrievalTool = createTool({
  id: 'faq-retrieval',
  description: 'Search the FAQ knowledge base to answer common customer questions about orders, shipping, returns, customization, and policies.',
  inputSchema: z.object({
    query: z.string().describe('The customer question or topic to search for'),
    category: z.enum(['orders', 'shipping', 'returns', 'customization', 'payment', 'general']).optional()
      .describe('Optional category to narrow down the search'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    results: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      category: z.string(),
      relevanceScore: z.number(),
    })).optional(),
    message: z.string(),
  }),
  // v1 signature: (inputData, context) instead of ({ context })
  execute: async (inputData) => {
    const { query, category } = inputData;
    const queryLower = query.toLowerCase();
    
    // Simple keyword matching for demo - in production, use embeddings/vector search
    const keywords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    let searchPool = faqDatabase;
    if (category) {
      searchPool = faqDatabase.filter(faq => faq.category === category);
    }

    const scoredResults = searchPool.map(faq => {
      const questionLower = faq.question.toLowerCase();
      const answerLower = faq.answer.toLowerCase();
      
      let score = 0;
      
      // Exact phrase match in question
      if (questionLower.includes(queryLower)) {
        score += 10;
      }
      
      // Keyword matches
      keywords.forEach(keyword => {
        if (questionLower.includes(keyword)) score += 3;
        if (answerLower.includes(keyword)) score += 1;
      });
      
      // Boost for specific high-value keywords
      const highValueKeywords = ['refund', 'cancel', 'shipping', 'track', 'delivery', 'photo', 'revision', 'change', 'edit'];
      highValueKeywords.forEach(hvk => {
        if (queryLower.includes(hvk) && (questionLower.includes(hvk) || answerLower.includes(hvk))) {
          score += 5;
        }
      });

      return {
        ...faq,
        relevanceScore: score,
      };
    });

    const relevantResults = scoredResults
      .filter(r => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);

    if (relevantResults.length === 0) {
      return {
        found: false,
        message: 'I couldn\'t find a specific FAQ for that question. You might want to escalate to a human agent for more detailed assistance.',
      };
    }

    return {
      found: true,
      results: relevantResults.map(r => ({
        question: r.question,
        answer: r.answer,
        category: r.category,
        relevanceScore: r.relevanceScore,
      })),
      message: `Found ${relevantResults.length} relevant FAQ${relevantResults.length > 1 ? 's' : ''}.`,
    };
  },
});
