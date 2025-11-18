import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySessionToken } from '@/lib/authSession';
import { getValidTeslaAccessToken } from '@/lib/teslaAuth';

export async function GET() {
  const headersList = await headers();
  const authHeader = headersList.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
  }

  try {
    const teslaAccessToken = await getValidTeslaAccessToken(session.userId);

    const fleetApiBase = process.env.TESLA_FLEET_AUDIENCE || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';
    // Ensure no double slashes if base ends with /
    const baseUrl = fleetApiBase.replace(/\/$/, '');
    const url = `${baseUrl}/api/1/vehicles`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${teslaAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tesla Fleet API error:', response.status, errorText);
      return NextResponse.json({ error: 'Tesla Fleet API error', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/vehicles:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}

