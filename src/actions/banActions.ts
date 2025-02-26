'use server';

import db from '@/lib/db';
import getUserData from './getUserData';
import { BannedUser } from '@prisma/client';
const { DISCORD_BOT_TOKEN, DISCORD_DEVELOPER_ID } = process.env;

function isSnowflake(id: string) {
  return /^\d+$/.test(id);
}

export async function getBanned(): Promise<{
  success: boolean;
  message?: string;
  bannedDiscordIds?: BannedUser[];
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };
  const bannedDiscordIds = await db.bannedUser.findMany();
  return {
    success: true,
    bannedDiscordIds,
  };
}

export async function banUser(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  bannedDiscordIds?: BannedUser[];
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };

  const { id, reason } = Object.fromEntries(formData) as {
    id: string;
    reason: string;
  };

  if (!id || !isSnowflake(id))
    return {
      success: false,
      message: 'Invalid Discord ID',
    };
  const bannedDiscordIds = await db.bannedUser.findMany();

  const alreadyBanned = bannedDiscordIds.find((u: BannedUser) => u.id === id);

  if (alreadyBanned)
    return {
      success: false,
      message: alreadyBanned.username + ' is already banned',
    };

  const userDataResponse = await fetch(
    `https://canary.discord.com/api/v10/users/${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    },
  );
  const userDataResponseData = await userDataResponse.json();

  if (!userDataResponseData.id) {
    return { success: false, message: 'Invalid Discord ID' };
  }

  const obj = {
    id: userDataResponseData.id,
    global_name:
      userDataResponseData.global_name || userDataResponseData.username,
    username: userDataResponseData.username,
    avatar: userDataResponseData.avatar
      ? `https://cdn.discordapp.com/avatars/${userDataResponseData.id}/${
          userDataResponseData.avatar
        }.${userDataResponseData.avatar.startsWith('a_') ? 'gif' : 'png'}`
      : `https://cdn.discordapp.com/embed/avatars/${
          userDataResponseData.discriminator % 5
        }.png`,
    reason: reason || null,
  };

  bannedDiscordIds.push(obj);
  await db.bannedUser.create({
    data: obj,
  });

  return { success: true, bannedDiscordIds };
}

export async function unbanUser(id: string): Promise<{
  success: boolean;
  message?: string;
  bannedDiscordIds?: BannedUser[];
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };
  if (!id || !isSnowflake(id))
    return {
      success: false,
      message: 'Invalid Discord ID',
    };
  const bannedDiscordIds = await db.bannedUser.findMany();

  const alreadyBanned = bannedDiscordIds.find((u: BannedUser) => u.id === id);

  if (!alreadyBanned)
    return {
      success: false,
      message: 'User is not banned',
    };

  await db.bannedUser.deleteMany({
    where: {
      id: id,
    },
  });

  return {
    success: true,
    bannedDiscordIds: bannedDiscordIds.filter((u) => u.id !== id),
  };
}

export async function updateBannedUser(id: string): Promise<{
  success: boolean;
  message?: string;
  bannedDiscordIds?: BannedUser[];
}> {
  const userData = await getUserData();

  if (userData?.user?.id !== DISCORD_DEVELOPER_ID)
    return {
      success: false,
      message: 'Unauthorised',
    };
  if (!id || !isSnowflake(id))
    return {
      success: false,
      message: 'Invalid Discord ID',
    };
  const bannedDiscordIds = await db.bannedUser.findMany();

  const alreadyBanned = bannedDiscordIds.find((u: BannedUser) => u.id === id);

  if (!alreadyBanned)
    return {
      success: false,
      message: 'User is not banned',
    };

  const userDataResponse = await fetch(
    `https://canary.discord.com/api/v10/users/${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    },
  );
  if (!userDataResponse.ok) {
    return { success: false, message: 'Internal Server Error' };
  }

  const userDataResponseData = await userDataResponse.json();

  await db.bannedUser.deleteMany({
    where: {
      id: id,
    },
  });

  if (!userDataResponseData.id) {
    return {
      success: false,
      bannedDiscordIds: bannedDiscordIds.filter((u) => u.id !== id),
    };
  }

  const obj = {
    id: userDataResponseData.id,
    global_name:
      userDataResponseData.global_name || userDataResponseData.username,
    username: userDataResponseData.username,
    avatar: userDataResponseData.avatar
      ? `https://cdn.discordapp.com/avatars/${userDataResponseData.id}/${
          userDataResponseData.avatar
        }.${userDataResponseData.avatar.startsWith('a_') ? 'gif' : 'png'}`
      : `https://cdn.discordapp.com/embed/avatars/${
          userDataResponseData.discriminator % 5
        }.png`,
    reason: alreadyBanned.reason,
  };

  bannedDiscordIds.push(obj);
  await db.bannedUser.create({
    data: obj,
  });

  return { success: true, bannedDiscordIds };
}
