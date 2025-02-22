'use server';

import getUserData from './getUserData';

export default async function getMe(): Promise<{
  success: boolean;
  message?: any;
  user?: any;
}> {
  const userData = await getUserData();

  if (!userData.user) {
    return {
      success: false,
      message: 'You are not logged in.',
    };
  }

  const user = {
    id: userData.user.id,
    username: userData.user.username,
    globalName: userData.user.global_name || userData.user.username,
    avatar: userData.user.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.user.id}/${
          userData.user.avatar
        }.${userData.user.avatar.startsWith('a_') ? 'gif' : 'png'}`
      : `https://cdn.discordapp.com/embed/avatars/${
          userData.user.discriminator % 5
        }.png`,
  };

  return {
    success: true,
    user,
  };
}
