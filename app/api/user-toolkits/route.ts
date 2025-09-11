import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getUserEnabledToolkits, setUserEnabledToolkits } from '@/lib/db/user-toolkits';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();
  const data = await getUserEnabledToolkits(session.user.id);
  return NextResponse.json({ toolkits: data });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();
  const body = await request.json().catch(() => null) as { slugs: string[] } | null;
  if (!body || !Array.isArray(body.slugs)) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
  await setUserEnabledToolkits(session.user.id, body.slugs);
  return NextResponse.json({ ok: true });
}

