import { NextResponse } from 'next/server';
import { CompactEncrypt } from 'jose';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import db from '@/lib/db';

const DISCORD_OAUTH_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_OAUTH_TOKEN_URL_PARAMS = new URLSearchParams({
  client_id: process.env.DISCORD_CLIENT_ID || '',
  client_secret: process.env.DISCORD_CLIENT_SECRET || '',
  grant_type: 'authorization_code',
  code: '',
  redirect_uri:
    process.env.NODE_ENV === 'production'
      ? (process.env.DOMAIN as string) + process.env.DISCORD_REDIRECT_URI || ''
      : 'http://localhost:3000' + process.env.DISCORD_REDIRECT_URI || '',
});

const encryptionKey = new TextEncoder().encode(process.env.JWT_ENCRYPTION_KEY);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain =
    process.env.NODE_ENV === 'production'
      ? process.env.DOMAIN
      : `${url.protocol}//${url.host}`;

  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${domain}/?error=OAuth`);
  }
  DISCORD_OAUTH_TOKEN_URL_PARAMS.set('code', code);

  const response = await fetch(DISCORD_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: DISCORD_OAUTH_TOKEN_URL_PARAMS,
  });

  if (!response.ok) {
    return NextResponse.redirect(`${domain}/?error=OAuth`);
  }

  const data = await response.json();

  const { access_token } = data;
  const newResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!newResponse.ok) {
    return NextResponse.redirect(`${domain}/?error=OAuth`);
  }

  const discordData = await newResponse.json();

  const banned = await db.bannedUser.findFirst({
    where: {
      id: discordData.id,
    },
  });

  if (banned) {
    return NextResponse.redirect(
      `${domain}/?error=banned${
        banned.reason ? `&reason=${encodeURIComponent(banned.reason)}` : ''
      }`,
    );
  }

  const token = jwt.sign(data, process.env.JWT_SECRET_KEY || '', {
    expiresIn: '1w',
  });

  const encryptedToken = await new CompactEncrypt(
    new TextEncoder().encode(token),
  )
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(encryptionKey);

  await (
    await cookies()
  ).set({
    name: 'token',
    value: encryptedToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  });

  return NextResponse.redirect(`${domain}/`);
}
