import { NextResponse } from 'next/server';
import { addClient, removeClient } from '@/lib/sse';

export async function GET() {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      addClient(controller);
    },
    cancel() {
      removeClient(controller);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
