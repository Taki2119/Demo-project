import { describe, expect, it } from 'vitest';
import { boardChunk, type ChunkEnv } from './chunk';

function fakeEnv(online = true, withStorage = true) {
  const data = new Map<string, string>();
  let reloads = 0;
  const env: ChunkEnv = {
    online,
    storage: withStorage
      ? { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
      : null,
    reload: () => void (reloads += 1),
  };
  return { env: () => env, data, reloads: () => reloads };
}
const fail = () => Promise.reject(new Error('chunk lost'));
const pending = async (p: Promise<unknown>) => (await Promise.race([p.then(() => 'done', () => 'error'), new Promise((r) => setTimeout(() => r('hang'), 20))])) as string;

describe('boardChunk', () => {
  it('loads ⇒ returns the module and clears the flag', async () => {
    const f = fakeEnv();
    f.data.set('saas-analytics.chunk-reload:x', '1');
    await expect(boardChunk('x', () => Promise.resolve('mod'), f.env)()).resolves.toBe('mod');
    expect(f.data.size).toBe(0);
  });

  it('first failure ⇒ reload EXACTLY once and hang; second failure ⇒ throw', async () => {
    const f = fakeEnv();
    expect(await pending(boardChunk('x', fail, f.env)())).toBe('hang');
    expect(f.reloads()).toBe(1);
    expect(await pending(boardChunk('x', fail, f.env)())).toBe('error');
    expect(f.reloads()).toBe(1);
  });

  it('offline or no storage ⇒ no reload, throws', async () => {
    for (const f of [fakeEnv(false, true), fakeEnv(true, false)]) {
      expect(await pending(boardChunk('x', fail, f.env)())).toBe('error');
      expect(f.reloads()).toBe(0);
    }
  });
});
