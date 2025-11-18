import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { SignJWT } from 'jose';

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer: Buffer): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

export async function GET() {
  const state = base64URLEncode(crypto.randomBytes(32));
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));

  const secretKey = process.env.JWT_SECRET || 'default_secret_change_me_in_prod';
  const encodedKey = new TextEncoder().encode(secretKey);

  // Store state and code_verifier in a signed JWT in a cookie
  const cookiePayload = { state, codeVerifier };
  const token = await new SignJWT(cookiePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m') // Short expiration for login flow
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set('tesla_oauth_state', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TESLA_CLIENT_ID!,
    redirect_uri: process.env.TESLA_REDIRECT_URI!,
    scope: 'openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}

