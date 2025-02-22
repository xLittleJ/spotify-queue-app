import { NextResponse } from 'next/server';
import db from '@/lib/db';

const {
  DOMAIN,
  NODE_ENV,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_USER_ID,
} = process.env;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain =
    NODE_ENV === 'production' ? DOMAIN : `${url.protocol}//${url.host}`;

  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.json({
      success: false,
      message: 'No code provided',
    });
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET,
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      redirect_uri:
        NODE_ENV === 'production'
          ? (DOMAIN as string) + SPOTIFY_REDIRECT_URI || ''
          : 'http://localhost:3000' + SPOTIFY_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get access token',
    });
  }

  const data = await response.json();

  const accessToken = data.access_token;
  const response2 = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response2.ok) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get user data',
    });
  }

  const userData = await response2.json();
  const { id } = userData;

  if (id !== SPOTIFY_USER_ID) {
    return NextResponse.json({
      success: false,
      message: "You aren't authorised to use this endpoint",
    });
  }

  await db.setting.upsert({
    where: {
      name: 'spotify_access',
    },
    update: {
      json: {
        access_token: accessToken,
        refresh_token: data.refresh_token,
        access_token_expires: Date.now() + data.expires_in * 1000,
      },
    },
    create: {
      name: 'spotify_access',
      json: {
        access_token: accessToken,
        refresh_token: data.refresh_token,
        access_token_expires: Date.now() + data.expires_in * 1000,
      },
    },
  });

  return NextResponse.redirect(domain + '/');
}
