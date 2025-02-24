import fetchNowPlaying from '@/actions/fetchNowPlaying';
import { NowPlaying } from '@/types/types';

const FETCH_INTERVAL_MS = 3000;

const clients: Array<ReadableStreamDefaultController> = [];

let lastTrackData: NowPlaying | null = null;

let fetchTimeout: NodeJS.Timeout | null;

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
  controller.enqueue(`data: ${JSON.stringify({ message: 'Connected' })}\n\n`);
  if (lastTrackData)
    controller.enqueue(`data: ${JSON.stringify(lastTrackData)}\n\n`);

  const originalClose = controller.close;
  controller.close = () => {
    const index = clients.indexOf(controller);
    if (index > -1) clients.splice(index, 1);
    if (originalClose) originalClose.call(controller);
  };
}

export function removeClient(controller: ReadableStreamDefaultController) {
  const index = clients.indexOf(controller);
  if (index > -1) clients.splice(index, 1);
}

export function broadcastToAllClients(data: string) {
  clients.forEach((client) => {
    client.enqueue(`data: ${data}\n\n`);
  });
}

export function getLastTrackData() {
  return lastTrackData;
}

async function fetchAndBroadcast() {
  const nowPlaying = await fetchNowPlaying();
  if (typeof nowPlaying === 'number') {
    console.log(`Spotify rate limit hit, retrying in ${nowPlaying} seconds.`);
    return nowPlaying;
  }
  if (
    !nowPlaying ||
    (lastTrackData &&
      JSON.stringify(lastTrackData) === JSON.stringify(nowPlaying))
  )
    return;
  lastTrackData = nowPlaying;
  broadcastToAllClients(JSON.stringify(nowPlaying));
}

async function scheduleNextFetch() {
  const rateLimit = await fetchAndBroadcast();
  if (rateLimit) {
    await new Promise((resolve) => setTimeout(resolve, rateLimit * 1000));
    scheduleNextFetch();
  } else {
    fetchTimeout = setTimeout(scheduleNextFetch, FETCH_INTERVAL_MS);
  }
}

scheduleNextFetch();

async function shutdown() {
  console.log('Shutting down SSE clients and timers...');
  await Promise.all(
    clients.map(
      (controller) =>
        new Promise<void>((resolve) => {
          controller.enqueue(
            `data: ${JSON.stringify({
              message: 'Server shutting down',
            })}\n\n`,
          );
          const originalClose = controller.close;
          controller.close = () => {
            originalClose.call(controller);
            resolve();
          };
          controller.close();
        }),
    ),
  );
  clients.length = 0;

  if (fetchTimeout) clearTimeout(fetchTimeout);
}

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
