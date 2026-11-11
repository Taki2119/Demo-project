// Lazy-loading the chart chunk (kit 01 §1): a new deploy deletes old chunks ⇒ an open tab's import() fails.
//   · error ⇒ reload the page EXACTLY once (flag in sessionStorage);
//   · no reload when offline or without storage (avoids an infinite loop) ⇒ throw to the ErrorBoundary;
//   · once reload is decided ⇒ return a never-settling promise so <Suspense> keeps the spinner.
// The environment is passed via `env` (kit 04 pitfall #13: pure functions don't read globals directly).

export interface ChunkEnv {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  online: boolean;
  reload: () => void;
}

const FLAG = 'saas-analytics.chunk-reload';

function browserEnv(): ChunkEnv {
  let storage: ChunkEnv['storage'] = null;
  try {
    storage = window.sessionStorage;
    storage.getItem(FLAG);
  } catch {
    storage = null;
  }
  return { storage, online: navigator.onLine, reload: () => window.location.reload() };
}

export function boardChunk<T>(key: string, load: () => Promise<T>, env: () => ChunkEnv = browserEnv): () => Promise<T> {
  const flag = `${FLAG}:${key}`;
  return () =>
    load().then(
      (mod) => {
        env().storage?.removeItem(flag);
        return mod;
      },
      (err: unknown) => {
        const e = env();
        if (!e.online || !e.storage || e.storage.getItem(flag)) throw err;
        e.storage.setItem(flag, '1');
        e.reload();
        return new Promise<T>(() => {});
      },
    );
}
