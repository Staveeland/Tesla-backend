import { prisma } from './prisma';

export async function getValidTeslaAccessToken(userId: string): Promise<string> {
  const tokenRecord = await prisma.teslaToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    throw new Error('No Tesla token found for user');
  }

  // Check if expired or expiring in less than 60 seconds
  const now = new Date();
  const expiresAt = new Date(tokenRecord.expiresAt);
  const timeDiff = expiresAt.getTime() - now.getTime();

  if (timeDiff > 60 * 1000) {
    return tokenRecord.accessToken;
  }

  // Refresh token
  console.log('Refreshing Tesla access token...');
  const response = await fetch('https://auth.tesla.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.TESLA_CLIENT_ID!,
      client_secret: process.env.TESLA_CLIENT_SECRET!,
      refresh_token: tokenRecord.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to refresh Tesla token:', errorText);
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_in } = data;

  const newExpiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.teslaToken.update({
    where: { userId },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token, // API might return a new refresh token
      expiresAt: newExpiresAt,
    },
  });

  return access_token;
}

