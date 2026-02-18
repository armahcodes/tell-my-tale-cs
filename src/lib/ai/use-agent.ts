'use client';

import { useChat, Message } from 'ai/react';

interface UseAgentOptions {
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for using the AI agent
 * 
 * @example
 * ```tsx
 * const { messages, input, handleInputChange, handleSubmit, isLoading } = useAgent();
 * 
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <input value={input} onChange={handleInputChange} />
 *     <button type="submit" disabled={isLoading}>Send</button>
 *   </form>
 * );
 * ```
 */
export function useAgent(options: UseAgentOptions = {}) {
  const { onFinish, onError } = options;

  const chat = useChat({
    api: '/api/agent',
    onFinish,
    onError,
  });

  return {
    ...chat,
    // Alias for clarity
    sendMessage: chat.handleSubmit,
    clearMessages: () => chat.setMessages([]),
  };
}

export type { Message };
