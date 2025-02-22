'use server';

import db from '@/lib/db';
import getUserData from './getUserData';

const { DISCORD_DEVELOPER_ID } = process.env;

export async function toggleQueue(): Promise<{
  success: boolean;
  message?: string;
  queueEnabled?: boolean;
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };

  const isQueueEnabled =
    (await db.setting
      .findFirst({
        where: {
          name: 'queueEnabled',
        },
        select: {
          boolean: true,
        },
      })
      .then((r) => r?.boolean ?? null)) ?? true;

  await db.setting.upsert({
    where: {
      name: 'queueEnabled',
    },
    create: {
      name: 'queueEnabled',
      boolean: !isQueueEnabled,
    },
    update: {
      boolean: !isQueueEnabled,
    },
  });

  return { success: true, queueEnabled: !isQueueEnabled };
}

export async function toggleListener(): Promise<{
  success: boolean;
  message?: string;
  listenerEnabled?: boolean;
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };

  const isListenerEnabled =
    (await db.setting
      .findFirst({
        where: {
          name: 'listenerEnabled',
        },
        select: {
          boolean: true,
        },
      })
      .then((r) => r?.boolean ?? null)) ?? true;

  await db.setting.upsert({
    where: {
      name: 'listenerEnabled',
    },
    create: {
      name: 'listenerEnabled',
      boolean: !isListenerEnabled,
    },
    update: {
      boolean: !isListenerEnabled,
    },
  });

  return { success: true, listenerEnabled: !isListenerEnabled };
}
