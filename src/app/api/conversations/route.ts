import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    // Get single conversation with messages
    if (id) {
      const conversation = await dbService.conversations.getById(id);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      const messages = await dbService.messages.getByConversationId(id);
      return NextResponse.json({ conversation, messages });
    }

    // Get conversations by email
    if (email) {
      const conversations = await dbService.conversations.getByEmail(email);
      return NextResponse.json({ conversations });
    }

    // Get authenticated user's conversations
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: await headers(),
      });
    } catch {
      // Continue without session
    }

    if (session?.user?.email) {
      const conversations = await dbService.conversations.getByEmail(session.user.email);
      return NextResponse.json({ conversations });
    }

    // Return recent conversations for dashboard
    const conversations = await dbService.conversations.getRecent({ limit: 50 });
    const counts = await dbService.conversations.getStatusCounts();

    return NextResponse.json({
      conversations,
      stats: {
        total: conversations.length,
        ...counts,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerEmail, customerName, channel, orderNumber } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    const conversation = await dbService.conversations.create({
      customerEmail,
      customerName,
      channel: channel || 'web_chat',
      orderNumber,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    return NextResponse.json({ 
      conversationId: conversation.id,
      conversation 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, status } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const conversation = await dbService.conversations.updateStatus(conversationId, status);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
