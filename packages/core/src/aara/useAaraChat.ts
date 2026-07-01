import { useState, useCallback } from 'react';

export type AaraChatRole = 'user' | 'assistant';

export type AaraChatMessage = {
  id: string;
  role: AaraChatRole;
  text: string;
  timestamp: Date;
};

export type AaraChatState = {
  messages: AaraChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clearHistory: () => void;
};

const INITIAL_MESSAGE: AaraChatMessage = {
  id: '0',
  role: 'assistant',
  text: "Namaste! I'm Aara, your Aaram Smart Homes assistant. Ask me about your home, schedule a visit, or raise a support request.",
  timestamp: new Date(0),
};

export function useAaraChat(
  sendMessage: (userText: string) => Promise<string>,
): AaraChatState {
  const [messages, setMessages] = useState<AaraChatMessage[]>([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: AaraChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const reply = await sendMessage(trimmed);
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply, timestamp: new Date() },
      ]);
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Unknown error';
      setError(errText);
      setMessages(prev => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sendMessage]);

  const clearHistory = useCallback(() => setMessages([INITIAL_MESSAGE]), []);

  return { messages, loading, error, send, clearHistory };
}
