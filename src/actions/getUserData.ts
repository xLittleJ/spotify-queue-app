'use server';

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { compactDecrypt } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET_KEY || '';
const encryptionKey = new TextEncoder().encode(
  process.env.JWT_ENCRYPTION_KEY || '',
);

export default async function getUserData(): Promise<{
  success: boolean;
  message?: string;
  user?: any;
}> {
  const token = await (await cookies()).get('token')?.value;
  if (!token) {
    return { success: false, message: 'You are not signed in' };
  }

  try {
    const { plaintext } = await compactDecrypt(token, encryptionKey);
    const decryptedToken = new TextDecoder().decode(plaintext);
    const decoded = jwt.verify(decryptedToken, JWT_SECRET) as {
      access_token: string;
    };
    if (!decoded.access_token) {
      return { success: false, message: 'Invalid token' };
    }

    const { access_token } = decoded;

    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      return { success: false, message: 'Invalid token' };
    }

    const discordData = await response.json();

    return {
      success: true,
      user: discordData,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, message: 'Invalid token' };
    }
    return { success: false, message: 'Failed to get user data.' };
  }
}
