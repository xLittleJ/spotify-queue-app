'use server';

import { TokenResponse } from '@/types/types';
import getSpotifyAccessToken from './getSpotifyAccessToken';
import db from '@/lib/db';

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

export default async function refreshAccessToken(): Promise<TokenResponse | null> {
  const spotifyAccessData =
    (await getSpotifyAccessToken()) as unknown as TokenResponse;
  if (!spotifyAccessData) return null;
  const { refresh_token } = spotifyAccessData;
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    });

    const data = await response.json();

    const obj = {
      access_token: data.access_token,
      access_token_expires: Date.now() + data.expires_in * 1000,
      refresh_token: data.refresh_token || refresh_token,
    };
    await db.setting.upsert({
      where: {
        name: 'spotify_access',
      },
      update: {
        json: obj,
      },
      create: {
        name: 'spotify_access',
        json: obj,
      },
    });
    return obj;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}
