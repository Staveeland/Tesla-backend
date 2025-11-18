import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'default_secret_change_me_in_prod';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days session
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as { userId: string };
  } catch (error) {
    return null;
  }
}

