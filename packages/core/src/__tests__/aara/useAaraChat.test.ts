import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAaraChat } from '../../aara/useAaraChat';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAaraChat', () => {
  it('initialises with Aara greeting message', () => {
    const { result } = renderHook(() => useAaraChat(vi.fn()));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('assistant');
    expect(result.current.messages[0].text).toMatch(/namaste/i);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('appends user message then assistant reply on send', async () => {
    const sendMessage = vi.fn().mockResolvedValue('The pool is open 6am–10pm.');
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('What are the pool hours?'); });

    expect(result.current.messages).toHaveLength(3); // greeting + user + assistant
    expect(result.current.messages[1].role).toBe('user');
    expect(result.current.messages[1].text).toBe('What are the pool hours?');
    expect(result.current.messages[2].role).toBe('assistant');
    expect(result.current.messages[2].text).toBe('The pool is open 6am–10pm.');
  });

  it('passes trimmed text to sendMessage', async () => {
    const sendMessage = vi.fn().mockResolvedValue('Trimmed ok.');
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('  hello world  '); });

    expect(sendMessage).toHaveBeenCalledWith('hello world');
  });

  it('does not call sendMessage for empty/whitespace input', async () => {
    const sendMessage = vi.fn();
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('   '); });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1); // only greeting
  });

  it('sets loading=true while awaiting reply, false after', async () => {
    let resolve!: (v: string) => void;
    const sendMessage = vi.fn().mockReturnValue(new Promise<string>(r => { resolve = r; }));
    const { result } = renderHook(() => useAaraChat(sendMessage));

    // Start the send without awaiting
    act(() => { result.current.send('hello'); });
    await waitFor(() => expect(result.current.loading).toBe(true));

    // Resolve
    await act(async () => { resolve('Hi there!'); });
    expect(result.current.loading).toBe(false);
  });

  it('appends error recovery message and sets error on sendMessage failure', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('API unavailable'));
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('Tell me about rooms'); });

    expect(result.current.error).toBe('API unavailable');
    expect(result.current.loading).toBe(false);
    // greeting + user + error-recovery assistant
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].role).toBe('assistant');
    expect(result.current.messages[2].text).toMatch(/trouble connecting/i);
  });

  it('clears history back to just the greeting', async () => {
    const sendMessage = vi.fn().mockResolvedValue('Fine.');
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('hello'); });
    expect(result.current.messages).toHaveLength(3);

    act(() => { result.current.clearHistory(); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('assistant');
  });

  it('multiple sends accumulate messages', async () => {
    const sendMessage = vi.fn()
      .mockResolvedValueOnce('Reply 1')
      .mockResolvedValueOnce('Reply 2');
    const { result } = renderHook(() => useAaraChat(sendMessage));

    await act(async () => { await result.current.send('First'); });
    await act(async () => { await result.current.send('Second'); });

    // greeting + (user + assistant) × 2 = 5
    expect(result.current.messages).toHaveLength(5);
    expect(result.current.messages[4].text).toBe('Reply 2');
  });
});
