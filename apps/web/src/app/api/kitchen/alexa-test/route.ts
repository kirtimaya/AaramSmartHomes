import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.ALEXA_TEST_SECRET) {
    return NextResponse.json(
      { error: 'ALEXA_TEST_SECRET is not configured. Set it in your environment variables.' },
      { status: 503 }
    );
  }

  // Verify admin via bearer token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { utterance, sessionId, sessionAttributes = {}, isLaunch = false } = await req.json() as {
    utterance?: string;
    sessionId: string;
    sessionAttributes?: Record<string, unknown>;
    isLaunch?: boolean;
  };

  const timestamp = new Date().toISOString();
  const appId     = process.env.ALEXA_SKILL_ID ?? 'amzn1.ask.skill.test';

  const alexaBody = isLaunch
    ? {
        version: '1.0',
        session: {
          new: true, sessionId,
          application: { applicationId: appId },
          attributes: {},
          user: { userId: `web-test-${user.id}` },
        },
        request: { type: 'LaunchRequest', requestId: 'web-test', timestamp, locale: 'hi-IN' },
      }
    : {
        version: '1.0',
        session: {
          new: false, sessionId,
          application: { applicationId: appId },
          attributes: sessionAttributes,
          user: { userId: `web-test-${user.id}` },
        },
        request: {
          type: 'IntentRequest', requestId: 'web-test', timestamp, locale: 'hi-IN',
          intent: {
            name: 'ConversationIntent',
            confirmationStatus: 'NONE',
            slots: { Query: { name: 'Query', value: utterance ?? '', confirmationStatus: 'NONE' } },
          },
        },
      };

  // Forward to /api/alexa using the request host
  const host     = req.headers.get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  const alexaRes = await fetch(`${protocol}://${host}/api/alexa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-alexa-test-secret': process.env.ALEXA_TEST_SECRET,
    },
    body: JSON.stringify(alexaBody),
  });

  if (!alexaRes.ok) {
    return NextResponse.json({ error: 'Alexa handler returned an error' }, { status: 500 });
  }

  const data = await alexaRes.json() as {
    sessionAttributes?: Record<string, unknown>;
    response?: { outputSpeech?: { ssml?: string }; shouldEndSession?: boolean };
  };

  const ssml  = data.response?.outputSpeech?.ssml ?? '';
  const reply = ssml.replace(/<[^>]+>/g, '').trim();

  return NextResponse.json({
    reply,
    sessionAttributes: data.sessionAttributes ?? {},
    endSession: data.response?.shouldEndSession ?? false,
  });
}
