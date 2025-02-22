import { NextResponse } from 'next/server';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? (process.env.DOMAIN as string) + process.env.SPOTIFY_REDIRECT_URI || ''
    : 'http://localhost:3000' + process.env.SPOTIFY_REDIRECT_URI || '';
export async function GET(req: Request) {
  const queryParams = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope:
      'user-read-currently-playing user-read-recently-played user-read-playback-state user-modify-playback-state',
    prompt: 'none',
  });

  const spotifyLoginUrl = `${SPOTIFY_AUTH_URL}?${queryParams.toString()}`;

  return NextResponse.redirect(spotifyLoginUrl);
}
