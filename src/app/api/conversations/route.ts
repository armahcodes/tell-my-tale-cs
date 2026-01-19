import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demo - in production, use a database
const conversations = new Map<string, {
  id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
      result?: unknown;
    }>;
  }>;
  metadata: {
    customerEmail?: string;
    customerName?: string;
    orderNumber?: string;
    startedAt: string;
    lastActivity: string;
    status: 'active' | 'escalated' | 'resolved';
    sentiment?: 'positive' | 'neutral' | 'negative';
    resolvedWithoutEscalation: boolean;
  };
}>();

export async function GET() {
  // Return all conversations for dashboard
  const allConversations = Array.from(conversations.values())
    .sort((a, b) => 
      new Date(b.metadata.lastActivity).getTime() - 
      new Date(a.metadata.lastActivity).getTime()
    );

  return NextResponse.json({
    conversations: allConversations,
    stats: {
      total: allConversations.length,
      active: allConversations.filter(c => c.metadata.status === 'active').length,
      escalated: allConversations.filter(c => c.metadata.status === 'escalated').length,
      resolved: allConversations.filter(c => c.metadata.status === 'resolved').length,
      resolvedWithoutEscalation: allConversations.filter(c => c.metadata.resolvedWithoutEscalation).length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, metadata } = await req.json();

    const id = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!conversations.has(id)) {
      conversations.set(id, {
        id,
        messages: [],
        metadata: {
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          status: 'active',
          resolvedWithoutEscalation: false,
          ...metadata,
        },
      });
    }

    const conversation = conversations.get(id)!;
    
    if (message) {
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        ...message,
        timestamp: new Date().toISOString(),
      });
      conversation.metadata.lastActivity = new Date().toISOString();
    }

    if (metadata) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
    }

    return NextResponse.json({ 
      conversationId: id,
      conversation 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { conversationId, status, metadata } = await req.json();

    if (!conversations.has(conversationId)) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const conversation = conversations.get(conversationId)!;
    
    if (status) {
      conversation.metadata.status = status;
    }
    
    if (metadata) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
