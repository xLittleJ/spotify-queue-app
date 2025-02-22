import fetchNowPlaying from '@/actions/fetchNowPlaying';

const clients: Array<ReadableStreamDefaultController> = [];

let lastTrackData: string | null = null;

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
  controller.enqueue(
    `data: ${JSON.stringify({ type: 'heartbeat', message: 'Connected' })}\n\n`,
  );
  if (lastTrackData) controller.enqueue(`data: ${lastTrackData}\n\n`);

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
  lastTrackData = data;
  clients.forEach((client) => {
    client.enqueue(`data: ${data}\n\n`);
  });
}

export function getLastTrackData() {
  return lastTrackData;
}

async function fetchAndBroadcast() {
  const nowPlayingStr = await fetchNowPlaying();
  if (nowPlayingStr && nowPlayingStr !== lastTrackData) {
    broadcastToAllClients(nowPlayingStr);
  }
}

const fetchInterval = setInterval(fetchAndBroadcast, 5000);

async function shutdown() {
  console.log('Shutting down SSE clients and timers...');
  await Promise.all(
    clients.map(
      (controller) =>
        new Promise<void>((resolve) => {
          controller.enqueue(
            `data: ${JSON.stringify({
              message: 'Server connection lost...',
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

  clearInterval(fetchInterval);
}

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
