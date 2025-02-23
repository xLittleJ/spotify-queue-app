'use server';

import verifyTurnstile from './verifyTurnstile';
import { isBanned } from './banActions';
import getMe from './getMe';
import db from '@/lib/db';
import getSpotifyAccessToken from './getSpotifyAccessToken';
import refreshAccessToken from './refreshAccessToken';
import { getLastTrackData } from '@/lib/sse';
import { TokenResponse } from '@/types/types';

const { DISCORD_BOT_TOKEN, DISCORD_QUEUE_LOGS_CHANNEL_ID, BANNED_WORDS } =
  process.env;

const bannedWords = BANNED_WORDS
  ? BANNED_WORDS.split(',').map((word) => word.trim())
  : [];
const bannedWordsRegex = bannedWords.length
  ? new RegExp(`\\b(${bannedWords.join('|')})\\b`, 'i')
  : /(?!)^/;

export default async function addToQueue(
  turnstileToken: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  const turnstileResponse = await verifyTurnstile(turnstileToken);

  if (!turnstileResponse.success) {
    return turnstileResponse;
  }

  const userData = await getMe();

  if (!userData?.user) {
    return {
      success: false,
      message: 'You are not logged in',
    };
  }

  const { user } = userData;

  const banned = await isBanned(user.id);

  if (banned)
    return {
      success: false,
      message:
        'You are banned from using this service.' +
        (banned.reason ? ` Reason: ${banned.reason}` : ''),
    };

  if (!url) {
    return {
      success: false,
      message: 'No URL provided',
    };
  }
  const lastTrackData = getLastTrackData();
  if (!lastTrackData || !JSON.parse(lastTrackData).data?.title)
    return {
      success: false,
      message: 'I am not currently listening to any music.',
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

  if (!isQueueEnabled)
    return {
      success: false,
      message: 'Queue submissions are currently disabled.',
    };

  const trackIdRegex =
    /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:\?.*)?$/;

  const match = url.match(trackIdRegex);
  if (!match) {
    return { success: false, message: 'Invalid Spotify URL' };
  }

  const trackId = match[1];

  const queue = await db.queueItem.findMany();
  const songsAdded = await db.addedSong.findMany();
  const recentlyPlayedTracks = await db.recentlyPlayedTrack.findMany();

  const spotifyAccessData =
    (await getSpotifyAccessToken()) as unknown as TokenResponse;
  if (!spotifyAccessData)
    return { success: false, message: 'Internal server error' };
  let { access_token_expires, access_token: spotify_access_token } =
    spotifyAccessData;

  if (queue.length >= 20)
    return {
      success: false,
      message: 'Queue is full (20 max queued songs at a time)',
    };

  if (spotify_access_token?.length > 0 && Date.now() >= access_token_expires) {
    const refreshedTokens = await refreshAccessToken();
    access_token_expires =
      refreshedTokens?.access_token_expires || access_token_expires;
    spotify_access_token =
      refreshedTokens?.access_token || spotify_access_token;
  }

  try {
    const queueResponse = await fetch(
      'https://api.spotify.com/v1/me/player/queue',
      {
        headers: {
          Authorization: `Bearer ${spotify_access_token}`,
        },
      },
    );

    if (!queueResponse.ok) {
      return {
        success: false,
        message: 'Unable to queue track, please try again',
      };
    }

    const queueData = await queueResponse.json();
    const queueTrackIds = queueData.queue.map(
      (track: { id: string }) => track.id,
    );
    const currentlyPlayingTrackId = queueData?.currently_playing?.id;

    if (currentlyPlayingTrackId === trackId) {
      return {
        success: false,
        message: 'That track is currently playing',
      };
    } else if (queue.some((track) => track.id === trackId)) {
      return {
        success: false,
        message: 'That track is already in the queue',
      };
    } else if (queueTrackIds.includes(trackId)) {
      return {
        success: false,
        message: 'That track is already in my personal queue',
      };
    } else if (
      recentlyPlayedTracks.some(
        (t) => t.id === trackId && Date.now() - t.time.getTime() < 3600000,
      )
    ) {
      return {
        success: false,
        message: 'That track has been played recently',
      };
    }

    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      { headers: { Authorization: `Bearer ${spotify_access_token}` } },
    );

    const trackData = await trackResponse.json();

    if (!trackData.name) return { success: false, message: 'Song not found' };

    const match = trackData.name.match(bannedWordsRegex);

    if (match)
      return {
        success: false,
        message: 'Unable to queue that track, please try another',
      };

    await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=spotify:track:${trackId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${spotify_access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    queue.push({
      id: trackId,
      ...(user && { user: { id: user.id, name: user.globalName } }),
    });
    await db.queueItem
      .create({
        data: {
          id: trackId,
          ...(user && { user: { id: user.id, name: user.globalName } }),
        },
      })
      .catch((err) => console.error(err));

    if (user) {
      const obj = {
        id: trackId,
        userId: user.id,
        name: user.globalName,
        username: user.username,
      };
      songsAdded.push(obj);
      await db.addedSong.create({
        data: obj,
      });
    }

    console.log(
      `${user.globalName} (${user.username}) (${user.id}) queued ${
        trackData.name
      } - ${trackData.artists
        .map((artist: { name: string }) => artist.name)
        .join(', ')}`,
    );

    const embed = {
      title: '**Track Added to Queue**',
      description: `[${
        trackData.name
      }](https://open.spotify.com/track/${trackId}) by ${trackData.artists
        .map(
          (artist: { name: string; id: string }) =>
            `[${artist.name}](https://open.spotify.com/artist/${artist.id})`,
        )
        .join(', ')}`,
      color: 0x1db954,
      thumbnail: {
        url: trackData.album.images[0]?.url,
      },
      fields: [
        {
          name: 'Queued by',
          value: `[${user.globalName}](https://discord.com/users/${user.id}) (${user.username}) (${user.id})`,
        },
      ],
      timestamp: new Date().toISOString(),
    };
    if (DISCORD_QUEUE_LOGS_CHANNEL_ID) {
      await fetch(
        `https://discord.com/api/v10/channels/${DISCORD_QUEUE_LOGS_CHANNEL_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            embeds: [embed],
          }),
        },
      ).catch((err) => {
        console.error('Failed to log track to discord channel:', err);
      });
    }
    return {
      success: true,
      message: `${trackData.name} - ${trackData.artists
        .map((artist: { name: string }) => artist.name)
        .join(', ')} added to queue`,
    };
  } catch (error) {
    console.error('Error queuing track:', error);
    return { success: false, message: 'Failed to queue track' };
  }
}
