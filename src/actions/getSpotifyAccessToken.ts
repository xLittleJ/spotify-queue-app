'use server';

import db from '@/lib/db';

export default async function getSpotifyAccessToken() {
  const spotify_access = await db.setting
    .findFirst({
      where: {
        name: 'spotify_access',
      },
      select: {
        json: true,
      },
    })
    .then((r) => r?.json || null);
  return spotify_access;
}
