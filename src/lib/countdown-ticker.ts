type TickListener = (now: number) => void;

let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<TickListener>();

function broadcastTick() {
  const now = Date.now();
  listeners.forEach((listener) => listener(now));
}

/** One shared 1s interval for all demo countdowns on screen. */
export function subscribeCountdownTick(listener: TickListener): () => void {
  listeners.add(listener);
  listener(Date.now());

  if (!intervalId) {
    intervalId = setInterval(broadcastTick, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
