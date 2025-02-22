// Import necessary libraries and components
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SiSpotify } from 'react-icons/si';
import { BsDiscord } from 'react-icons/bs';
import Turnstile, { useTurnstile } from 'react-turnstile';
import { Id, toast } from 'react-toastify';
import addToQueueServer from '@/actions/addToQueue';
import { Login, Logout } from '@/actions/authActions';

// Define the main MusicComponent function
export default function MusicComponent({
  user,
  error,
  currentlyPlaying,
}: {
  user?: {
    avatar: string;
    username: string;
    globalName: string;
  } | null;
  error: string | null;
  currentlyPlaying: string | null;
}) {
  const router = useRouter();

  // Parse currently playing data from the string
  const currentlyPlayingData = currentlyPlaying && JSON.parse(currentlyPlaying);

  // Show error toast if there is an error
  useEffect(() => {
    if (!error) return;

    toast.error(error, {
      closeOnClick: true,
      toastId: 'error',
      theme: 'dark',
    });
  }, [error]);

  // Define the NowPlayingType interface for type safety
  interface Artist {
    name: string;
    external_urls: {
      spotify: string;
    };
  }

  interface Album {
    name: string;
    images: { url: string }[];
    external_urls: {
      spotify: string;
    };
  }

  interface User {
    name: string;
    id: string;
  }

  interface NowPlayingType {
    name: string;
    title: string;
    artists: Artist[];
    album: Album;
    albumImageUrl: string;
    songUrl: string;
    external_urls: {
      spotify: string;
    };
    user: User;
    progressMs: number;
    durationMs: number;
    isPlaying: boolean;
  }

  // State variables for managing the music component
  const [nowPlaying, setNowPlaying] = useState<NowPlayingType | null>(
    currentlyPlayingData?.data,
  );
  const [progressMs, setProgressMs] = useState<number>(
    currentlyPlayingData?.progressMs || 0,
  );
  const [queue, setQueue] = useState<NowPlayingType[]>(
    currentlyPlayingData?.queue || [],
  );
  const [queueEnabled, setQueueEnabled] = useState<boolean>(
    currentlyPlayingData?.queueEnabled || false,
  );

  const [serverToastId, setServerToastId] = useState<Id>('');

  const [spotifyUrl, setSpotifyUrl] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [token, setToken] = useState('');
  const turnstile = useTurnstile();

  // Establish a connection to the SSE server
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      console.log('Connecting to SSE server...');
      eventSource = new EventSource('/api/sse' as string);

      // Handle successful connection
      eventSource.onopen = () => {
        console.log('SSE connection established');
        router.refresh();
        if (serverToastId) {
          toast.update(serverToastId, {
            render: 'Server connection re-established',
            type: 'success',
            isLoading: false,
            autoClose: 2000,
            closeOnClick: true,
          });
        }
      };

      // Handle incoming messages from the server
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'heartbeat') return;

        if (data.message) {
          setServerToastId(
            toast.loading(data.message, {
              theme: 'dark',
            }),
          );
        }

        // Update state with new data
        setNowPlaying(data?.data);
        setProgressMs((prevProgressMs) => {
          const newProgressMs = data?.data?.progressMs || 0;
          if (
            Math.abs(newProgressMs - prevProgressMs) > 1500 ||
            !data?.data?.isPlaying
          ) {
            return newProgressMs;
          }
          return prevProgressMs;
        });
        setQueue(data?.queue || []);
        setQueueEnabled(data?.queueEnabled || false);
      };

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.log('SSE connection error:', error);
        if (
          eventSource &&
          (eventSource.readyState === EventSource.CLOSED ||
            eventSource.readyState === EventSource.CONNECTING)
        ) {
          setTimeout(connectSSE, 3000);
        }
      };
    };

    connectSSE();

    // Cleanup function to close the connection
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [serverToastId, router]);

  // Increment progress of the currently playing song
  useEffect(() => {
    if (nowPlaying?.isPlaying) {
      const incrementProgress = () => {
        setProgressMs((prevProgress) => {
          if (prevProgress + 1000 < nowPlaying?.durationMs) {
            return prevProgress + 1000;
          }
          return nowPlaying?.durationMs;
        });
      };

      const interval = setInterval(incrementProgress, 1000);

      // Cleanup function to clear the interval
      return () => {
        clearInterval(interval);
      };
    }
  }, [nowPlaying?.isPlaying, nowPlaying?.durationMs]);

  // Function to format time in mm:ss
  const getFormattedTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Function to close the keyboard
  const closeKeyboard = () => {
    const inputElement = document.activeElement as HTMLInputElement;
    if (inputElement) {
      inputElement.blur();
    }
  };

  // Function to add a song to the queue
  const addToQueue = async () => {
    closeKeyboard();
    const toastId = toast.loading('Adding to queue...', {
      theme: 'dark',
      closeOnClick: true,
    });
    if (!turnstileLoaded) {
      toast.update(toastId, {
        render: 'Turnstile script not loaded',
        type: 'error',
        isLoading: false,
        autoClose: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        toast.update(toastId, {
          render: 'You must complete the Cloudflare verification first',
          type: 'error',
          isLoading: false,
          autoClose: 2000,
        });
        return;
      }

      const data = await addToQueueServer(token, spotifyUrl);

      // Reset state after adding to queue
      setSpotifyUrl('');
      turnstile.reset();
      setToken('');
      if (data.success) {
        toast.update(toastId, {
          render: data.message,
          type: 'success',
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        toast.update(toastId, {
          render: data.message,
          type: 'error',
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (error: unknown) {
      router.refresh();
      toast.update(toastId, {
        render: 'A connection error has occurred',
        type: 'error',
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center w-[95%]'>
      <div>
        <div className='pl-[15px] pr-[15px]'>
          <h3 className='text-[24px] font-bold text-white text-center mb-[30px]'>
            Listening To
          </h3>
          <div className='relative flex w-72 items-center space-x-4 rounded-md border p-5 transition-shadow border-white'>
            <div className='w-16'>
              {nowPlaying?.albumImageUrl ? (
                <img
                  className='w-16 shadow-sm'
                  src={nowPlaying?.albumImageUrl}
                  alt={nowPlaying?.album?.name || 'Album Cover'}
                />
              ) : (
                <SiSpotify size={64} color={'#1ED760'} />
              )}
            </div>

            <div className='flex-1'>
              {nowPlaying?.title ? (
                <a
                  target='_blank'
                  rel='noopener noreferrer'
                  href={
                    nowPlaying?.songUrl
                      ? nowPlaying.songUrl
                      : 'https://open.spotify.com/'
                  }
                  className='component font-bold text-[#e9e9e9] hover:underline hover:text-[#f6f6f6]'
                >
                  {' '}
                  {nowPlaying.title}
                </a>
              ) : (
                <p className='component font-bold text-[#e9e9e9]'>
                  Not Listening
                </p>
              )}
              <p className='font-dark text-xs text-[#e9e9e9]'>
                {nowPlaying?.artists && 'by '}
                <span className='font-bold'>
                  {nowPlaying?.artists
                    ? nowPlaying.artists.map(
                        (artist: Artist, index: number) => (
                          <span key={index}>
                            <a
                              href={artist.external_urls.spotify}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-[#e9e9e9] hover:underline hover:text-[#f6f6f6]'
                            >
                              {artist.name}
                            </a>
                            {index < nowPlaying.artists.length - 1 ? ', ' : ''}
                          </span>
                        ),
                      )
                    : 'Spotify is closed'}
                </span>
              </p>

              {nowPlaying?.album?.name && (
                <p className='font-dark text-xs text-[#e9e9e9]'>
                  on{' '}
                  <a
                    target='_blank'
                    rel='noopener noreferrer'
                    href={
                      nowPlaying?.album
                        ? nowPlaying.album.external_urls.spotify
                        : 'https://open.spotify.com/'
                    }
                    className='component font-bold text-[#e9e9e9] hover:underline hover:text-[#f6f6f6]'
                  >
                    {nowPlaying.album.name}
                  </a>
                </p>
              )}
              {nowPlaying?.user && (
                <p className='font-dark text-xs text-[#e9e9e9] mt-3'>
                  Added by:{' '}
                  <a
                    target='_blank'
                    rel='noopener noreferrer'
                    href={`https://discord.com/users/${nowPlaying.user.id}`}
                    className='component font-bold text-[#e9e9e9] hover:underline hover:text-[#f6f6f6]'
                  >
                    {nowPlaying.user.name}
                  </a>
                </p>
              )}
              {nowPlaying && !nowPlaying?.isPlaying && nowPlaying.title && (
                <p className='text-xs text-[#e9e9e9] mt-4 font-bold'>Paused</p>
              )}
            </div>
            <div className='absolute bottom-1.5 right-1.5'>
              <a
                target='_blank'
                rel='noopener noreferrer'
                href='https://open.spotify.com'
                className='hover:brightness-125'
              >
                <SiSpotify size={20} color={'#1ED760'} />
              </a>
            </div>
          </div>

          {nowPlaying?.title && (
            <>
              <div className='progress-bar-container mt-2 w-72 h-2 bg-gray-300 rounded-full overflow-hidden'>
                <div
                  className='progress-bar h-full bg-green-500'
                  style={{
                    width: `${(progressMs / nowPlaying.durationMs) * 100}%`,
                    transition: 'width 0.2s ease',
                  }}
                ></div>
              </div>

              <div className='flex justify-between w-72 text-xs text-[#e9e9e9] mt-1'>
                <span>{getFormattedTime(progressMs)}</span>
                <span>{getFormattedTime(nowPlaying.durationMs)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {nowPlaying?.title && (
        <div className='mt-6 w-full'>
          <h3 className='text-[24px] font-bold text-white text-center'>
            Queue
          </h3>
          <div className='border border-white rounded-md p-3 mt-3 overflow-y-scroll max-h-[200px]'>
            {queue.length > 0 ? (
              <ul className='queue-list'>
                {queue.map((track: NowPlayingType, index: number) => (
                  <li key={index} className='flex items-center mb-2'>
                    <span className='text-sm font-bold mr-2'>{index + 1}.</span>{' '}
                    <img
                      src={track.album.images[2]?.url}
                      alt={track.name}
                      className='w-10 h-10 mr-3'
                    />
                    <div>
                      <a
                        href={track.external_urls.spotify}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-[#e9e9e9] hover:underline hover:text-[#f6f6f6] font-bold'
                      >
                        {track.name}
                      </a>
                      <p className='text-xs text-[#e9e9e9]'>
                        by{' '}
                        {track.artists.map((artist: Artist, index: number) => (
                          <span key={index}>
                            <a
                              href={artist.external_urls.spotify}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-[#e9e9e9] font-bold hover:underline hover:text-[#f6f6f6]'
                            >
                              {artist.name}
                            </a>
                            {index < track.artists.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </p>
                      {track.user && (
                        <p className='text-xs text-[#e9e9e9] mt-2'>
                          Added by:{' '}
                          <a
                            href={`https://discord.com/users/${track.user.id}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-[#e9e9e9] font-bold hover:underline hover:text-[#f6f6f6]'
                          >
                            {track.user.name}
                          </a>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-sm text-center text-[#e9e9e9]'>
                Queue is Empty
              </p>
            )}
          </div>
        </div>
      )}

      {nowPlaying?.title && (
        <div className='mt-6'>
          <h3 className='text-[24px] font-bold text-white text-center'>
            Add Songs to Queue
          </h3>
          {user ? (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addToQueue();
                }}
              >
                <input
                  type='text'
                  placeholder={
                    queueEnabled
                      ? 'Enter Spotify URL'
                      : 'Queue submissions are disabled'
                  }
                  pattern='^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:\?.*)?$'
                  onInput={(e) =>
                    (e.target as HTMLInputElement).setCustomValidity('')
                  }
                  onInvalid={(e) =>
                    (e.target as HTMLInputElement).setCustomValidity(
                      'Must be a valid Spotify URL',
                    )
                  }
                  value={spotifyUrl}
                  disabled={!queueEnabled}
                  onChange={(e) => {
                    e.preventDefault();
                    setSpotifyUrl(e.target.value);
                  }}
                  className={`border p-2 mb-2 w-full rounded-md border-white text-white ${
                    !queueEnabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                />
                <div>
                  {queueEnabled && (
                    <div className='w-full mt-2 mb-2'>
                      <Turnstile
                        sitekey={
                          process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string
                        }
                        onLoad={() => {
                          setToken('');
                          setTurnstileLoaded(true);
                        }}
                        onExpire={() => {
                          turnstile.reset();
                          setToken('');
                        }}
                        onError={() => {
                          turnstile.reset();
                          setToken('');
                        }}
                        size='normal'
                        theme='dark'
                        onVerify={setToken}
                      />
                    </div>
                  )}
                  <button
                    type='submit'
                    disabled={loading || !queueEnabled}
                    className={`px-4 py-2 bg-green-500 text-white rounded-md transition ${
                      loading || !queueEnabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-green-600'
                    }`}
                  >
                    Add to Queue
                  </button>
                </div>
              </form>
              <div className='flex items-center mt-4'>
                <button
                  onClick={() => {
                    Logout();
                  }}
                  className='px-4 py-2 bg-red-500 rounded-md text-white hover:bg-red-600'
                >
                  Logout
                </button>
                {user && (
                  <span className='ml-4 text-sm text-[#e9e9e9] flex items-center flex-none'>
                    Logged in as{' '}
                    {user.avatar && (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className='w-6 h-6 rounded-full mx-2'
                      />
                    )}
                    <span className='font-bold'>{user.globalName} </span> (
                    <span className='font-bold'>{user.username}</span>)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className='mt-4 flex flex-col items-center justify-center w-screen'>
              <button
                onClick={() => Login()}
                className='inline-flex items-center px-6 py-3 bg-[#5865f2] hover:bg-[#4555ff] text-white font-semibold rounded-md'
              >
                <BsDiscord className='mr-2' />
                Login with Discord to add songs
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
