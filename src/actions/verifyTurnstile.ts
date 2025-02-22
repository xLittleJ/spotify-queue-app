'use server';

const { TURNSTILE_SECRET_KEY } = process.env;
const keyArr: string[] = [];

export default async function verifyTurnstile(
  turnstileToken: string,
): Promise<{ success: boolean; message: string }> {
  if (!turnstileToken)
    return { success: false, message: 'No Cloudflare token provided' };

  if (keyArr.includes(turnstileToken))
    return { success: false, message: 'Cloudflare token already used' };

  keyArr.push(turnstileToken);

  try {
    const response = await fetch(
      `https://challenges.cloudflare.com/turnstile/v0/siteverify`,

      {
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'Cloudflare token verified',
      };
    } else {
      return {
        success: false,
        message: 'Cloudflare token verification failed',
      };
    }
  } catch (error) {
    console.error('Error verifying Turnstile:', error);
    return { success: false, message: 'Internal server error' };
  }
}
