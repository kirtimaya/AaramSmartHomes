import type { AgentEvent } from '@aaram/core/aara/server';

/** Encodes one SSE frame: `event: <type>\ndata: <json>\n\n`. */
export function encodeSSE(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Builds a ReadableStream<Uint8Array> that emits agent events as they're produced. */
export function createSSEStream(
  run: (onEvent: (event: AgentEvent) => void) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        await run((event) => controller.enqueue(encoder.encode(encodeSSE(event))));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Stream failed';
        controller.enqueue(encoder.encode(encodeSSE({ type: 'error', message })));
      } finally {
        controller.close();
      }
    },
  });
}
