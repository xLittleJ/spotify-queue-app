'use server';

import { redirect } from 'next/navigation';
import { URLSearchParams } from 'url';
import { cookies } from 'next/headers';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? (process.env.DOMAIN as string) + process.env.DISCORD_REDIRECT_URI || ''
    : 'http://localhost:3000' + process.env.DISCORD_REDIRECT_URI || '';

export async function Login() {
  const queryParams = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    prompt: 'none',
  });

  const discordLoginUrl = `${DISCORD_AUTH_URL}?${queryParams.toString()}`;
  return redirect(discordLoginUrl);
}

export async function Logout() {
  await (await cookies()).delete('token');
  return redirect('/');
}
