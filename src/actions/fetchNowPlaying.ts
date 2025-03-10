'use server';

import {
  NowPlaying,
  QueueItemUser,
  TokenResponse,
  TrackObject,
} from '@/types/types';
import getSpotifyAccessToken from './getSpotifyAccessToken';
import refreshAccessToken from './refreshAccessToken';
import db from '@/lib/db';

export default async function fetchNowPlaying(): Promise<
  NowPlaying | null | number
> {
  let queue = await db.queueItem.findMany();
  let songsAdded = await db.addedSong.findMany();
  let recentlyPlayedTracks = await db.recentlyPlayedTrack.findMany();

  const spotifyAccessData =
    (await getSpotifyAccessToken()) as unknown as TokenResponse;
  if (!spotifyAccessData) return null;
  let { access_token_expires, access_token: spotify_access_token } =
    spotifyAccessData;

  if (spotify_access_token?.length > 0 && Date.now() >= access_token_expires) {
    const refreshedTokens = await refreshAccessToken();
    access_token_expires =
      refreshedTokens?.access_token_expires || access_token_expires;
    spotify_access_token =
      refreshedTokens?.access_token || spotify_access_token;
  }
  let nowPlaying: NowPlaying = {
    isPlaying: false,
  };
  try {
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
    if (spotify_access_token?.length > 0 && isListenerEnabled) {
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/currently-playing',
        {
          headers: {
            Authorization: `Bearer ${spotify_access_token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          return parseInt(
            (response.headers.get('Retry-After') as string) ?? '5',
          );
        }
        const data = await response.json();
        console.error('Error fetching now playing:', data);
        return null;
      }

      if (response.status === 204) {
        return nowPlaying;
      }

      const data = await response.json();

      const queueResponse = await fetch(
        'https://api.spotify.com/v1/me/player/queue',
        {
          headers: {
            Authorization: `Bearer ${spotify_access_token}`,
          },
        },
      );

      if (!queueResponse.ok) {
        const data = await queueResponse.json();
        if (queueResponse.status === 429) {
          return parseInt(
            (queueResponse.headers.get('Retry-After') as string) ?? '5',
          );
        } else {
          console.error('Error fetching queue:', data);
          return null;
        }
      }

      const queueData = await queueResponse.json();

      if (data?.item?.id) {
        const index = queue.findIndex((i) => i.id === data.item.id);
        if (index !== -1) queue.splice(index, 1);
      }

      if (queueData.queue.length !== 0) {
        if (queue.some((track) => track.id === data?.item?.id)) {
          queue = queue.filter((track) => track.id !== data.item.id);
          await db.queueItem.deleteMany({
            where: {
              id: data.item.id,
            },
          });
        }

        for (let i = 0; i < queue.length; i++) {
          const track = queue[i];
          if (!queueData.queue.some((q: { id: string }) => q.id === track.id)) {
            queue = queue.filter((t) => t.id !== track.id);
            await db.queueItem.deleteMany({
              where: {
                id: track.id,
              },
            });
          }
        }
      }
      queue = await db.queueItem.findMany();

      if (data && data.item?.name) {
        const trackId = data?.item?.id;

        songsAdded = await db.addedSong.findMany();

        if (
          trackId &&
          (!recentlyPlayedTracks.length ||
            trackId !==
              recentlyPlayedTracks[recentlyPlayedTracks.length - 1].id)
        ) {
          recentlyPlayedTracks = recentlyPlayedTracks.filter(
            (t) => Date.now() - t.time.getTime() < 3600000,
          );
          recentlyPlayedTracks.push({ id: trackId, time: new Date() });

          if (recentlyPlayedTracks.length > 20) {
            recentlyPlayedTracks.shift();
          }

          recentlyPlayedTracks = recentlyPlayedTracks.reduce<
            typeof recentlyPlayedTracks
          >((unique, item) => {
            const index = unique.findIndex((i) => i.id === item.id);
            if (index === -1) {
              return [...unique, item];
            }
            unique.splice(index, 1, item);
            return unique;
          }, []);

          await db.$transaction([
            db.recentlyPlayedTrack.deleteMany(),
            db.recentlyPlayedTrack.createMany({
              data: recentlyPlayedTracks,
            }),
          ]);
        }
        for (const obj of songsAdded) {
          if (
            obj.id !== data.item?.id &&
            !queue.some((track) => track.id === obj.id)
          ) {
            songsAdded = songsAdded.filter((o) => o.id !== obj.id);
            await db.addedSong.delete({
              where: {
                id: obj.id,
              },
            });
          }
        }
        nowPlaying = {
          data: {
            isPlaying: data.is_playing,
            title: data.item?.name,
            album: data.item?.album,
            artists: data.item?.artists,
            albumImageUrl: data.item?.album?.images[0].url,
            songUrl: data.item?.external_urls?.spotify,
            progressMs: data.progress_ms,
            durationMs: data.item?.duration_ms,
          },
          queue: queueData.queue
            .filter((track: TrackObject) =>
              queue.some((q) => q.id === track.id),
            )
            .map((track: { id: string; user: QueueItemUser }) => {
              track.user =
                (queue.find((q) => q.id === track.id)
                  ?.user as unknown as QueueItemUser) || null;
              return track;
            }),
          queueEnabled:
            (await db.setting
              .findFirst({
                where: {
                  name: 'queueEnabled',
                },
                select: {
                  boolean: true,
                },
              })
              .then((r) => r?.boolean ?? null)) ?? true,
        };
        if (songsAdded.some((s) => s.id === data.item?.id) && nowPlaying.data)
          nowPlaying.data.user = songsAdded.find((s) => s.id === data.item?.id);
      }
    }
  } catch (error) {
    console.error('Error fetching now playing track:', error);
  }
  return nowPlaying;
}
