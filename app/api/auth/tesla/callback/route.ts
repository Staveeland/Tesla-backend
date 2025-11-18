import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, decodeJwt } from 'jose';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/authSession';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const oauthCookie = cookieStore.get('tesla_oauth_state');

  if (!oauthCookie) {
    return NextResponse.json({ error: 'Missing OAuth cookie' }, { status: 400 });
  }

  const secretKey = process.env.JWT_SECRET || 'default_secret_change_me_in_prod';
  const encodedKey = new TextEncoder().encode(secretKey);

  let storedState: string;
  let codeVerifier: string;

  try {
    const { payload } = await jwtVerify(oauthCookie.value, encodedKey);
    storedState = payload.state as string;
    codeVerifier = payload.codeVerifier as string;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired OAuth cookie' }, { status: 400 });
  }

  if (state !== storedState) {
    return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://auth.tesla.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TESLA_CLIENT_ID!,
      client_secret: process.env.TESLA_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.TESLA_REDIRECT_URI!,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error('Token exchange failed:', errText);
    return NextResponse.json({ error: 'Failed to exchange token', details: errText }, { status: 400 });
  }

  const tokenData = await tokenResponse.json();
  const { access_token, refresh_token, expires_in, id_token } = tokenData;

  let teslaSub: string | null = null;

  if (id_token) {
    const decoded = decodeJwt(id_token);
    if (decoded.sub) {
      teslaSub = decoded.sub;
    }
  }

  if (!teslaSub) {
    // Fallback to userinfo
    const userResponse = await fetch('https://auth.tesla.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      teslaSub = userData.sub;
    }
  }

  if (!teslaSub) {
    return NextResponse.json({ error: 'Could not determine user subject' }, { status: 400 });
  }

  // Database operations
  const user = await prisma.user.upsert({
    where: { teslaSub },
    update: {},
    create: { teslaSub },
  });

  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.teslaToken.upsert({
    where: { userId: user.id },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    },
    create: {
      userId: user.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    },
  });

  // Create session
  const sessionJwt = await createSessionToken(user.id);

  // Clean up cookie
  cookieStore.delete('tesla_oauth_state');

  // Redirect to success page
  return NextResponse.redirect(`https://petterstaveland.com/auth/success?token=${sessionJwt}`);
}

