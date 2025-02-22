import MusicComponent from '@/components/MusicComponent';
import { ToastContainer } from 'react-toastify';
import getMe from '@/actions/getMe';
import Management from '@/components/Management';
import { getLastTrackData } from '@/lib/sse';
import { FaGithub } from 'react-icons/fa';
import Link from 'next/link';

const { DISCORD_DEVELOPER_ID } = process.env;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error = null, reason = null } = await searchParams;

  let errorMsg = null;

  if (error) {
    switch (error) {
      case 'banned':
        errorMsg = `You are banned from using this service.${
          reason ? ` Reason: ${reason}` : ''
        }`;
        break;
      case 'OAuth':
        errorMsg = 'An error occurred during the OAuth process.';
        break;
      default:
        errorMsg = 'An unknown error has occurred.';
    }
  }

  const userData = await getMe();

  const user = userData?.user;

  return (
    <main className='h-full'>
      <ToastContainer
        position='top-center'
        closeButton={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
      />
      <div className='flex flex-col min-h-full items-center justify-center p-24'>
        <h1 className='text-6xl font-bold mb-6'>Spotify Queue App</h1>
        <MusicComponent
          user={user}
          error={errorMsg}
          currentlyPlaying={getLastTrackData()}
        />
        {user?.id === DISCORD_DEVELOPER_ID && <Management />}
      </div>
      <Link
        href='https://github.com/xlittlej/spotify-queue-app'
        target='_blank'
        rel='noopener noreferrer'
        className='fixed bottom-2 right-2 text-2xl text-white'
      >
        <FaGithub />
      </Link>
    </main>
  );
}
