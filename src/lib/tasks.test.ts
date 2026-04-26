import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeArea {
  get: (k?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (obj: Record<string, unknown>) => Promise<void>;
  remove: (k: string | string[]) => Promise<void>;
}

function makeArea(): FakeArea & { _store: Record<string, unknown> } {
  const store: Record<string, unknown> = {};
  return {
    _store: store,
    get: vi.fn(async (k?: string | string[] | null) => {
      if (k == null) return { ...store };
      if (typeof k === 'string') return k in store ? { [k]: store[k] } : {};
      const out: Record<string, unknown> = {};
      for (const key of k) if (key in store) out[key] = store[key];
      return out;
    }),
    set: vi.fn(async (obj) => {
      Object.assign(store, obj);
    }),
    remove: vi.fn(async (k) => {
      const keys = Array.isArray(k) ? k : [k];
      for (const key of keys) delete store[key];
    }),
  };
}

beforeEach(() => {
  vi.resetModules();
  const local = makeArea();
  const session = makeArea();
  vi.stubGlobal('chrome', { storage: { local, session } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function importModules() {
  const tasks = await import('./tasks');
  const storage = await import('./storage');
  return { tasks, storage };
}

function makeTask(overrides: Partial<import('./tasks').Task> = {}): import('./tasks').Task {
  const now = Date.now();
  return {
    id: 'tsk_a',
    name: 'Demo',
    color: 'blue',
    tabs: [{ url: 'https://a.com', title: 'a' }],
    createdAt: now,
    updatedAt: now,
    status: 'live',
    version: 1,
    ...overrides,
  };
}

describe('storage', () => {
  it('round-trip read after add', async () => {
    const { storage } = await importModules();
    await storage.addTask(makeTask({ id: 'tsk_a' }));
    const state = await storage.readTasks();
    expect(state.tasks['tsk_a']?.name).toBe('Demo');
  });

  it('mutateTask increments version', async () => {
    const { storage } = await importModules();
    await storage.addTask(makeTask({ id: 'tsk_a', version: 1 }));
    await storage.mutateTask('tsk_a', (t) => ({ ...t, name: 'Renamed' }));
    const state = await storage.readTasks();
    expect(state.tasks['tsk_a'].name).toBe('Renamed');
    expect(state.tasks['tsk_a'].version).toBe(2);
  });

  it('withTasksLock serialises concurrent mutations (no lost updates)', async () => {
    const { storage } = await importModules();
    await storage.addTask(makeTask({ id: 'tsk_a', tabs: [] }));
    const ops = Array.from({ length: 50 }, (_, i) =>
      storage.mutateTask('tsk_a', (t) => ({
        ...t,
        tabs: [...t.tabs, { url: `https://x.com/${i}`, title: `${i}` }],
      })),
    );
    await Promise.all(ops);
    const state = await storage.readTasks();
    expect(state.tasks['tsk_a'].tabs).toHaveLength(50);
    expect(state.tasks['tsk_a'].version).toBe(51);
  });

  it('deleteTask removes entry', async () => {
    const { storage } = await importModules();
    await storage.addTask(makeTask({ id: 'tsk_a' }));
    await storage.deleteTask('tsk_a');
    const state = await storage.readTasks();
    expect(state.tasks['tsk_a']).toBeUndefined();
  });

  it('lazy prune removes archived tasks older than 7 days on read', async () => {
    const { storage, tasks } = await importModules();
    const stale = Date.now() - tasks.ARCHIVE_TTL_MS - 1000;
    await storage.addTask(
      makeTask({ id: 'old', status: 'archived', archivedAt: stale }),
    );
    await storage.addTask(
      makeTask({ id: 'fresh', status: 'archived', archivedAt: Date.now() }),
    );
    const state = await storage.readTasks();
    expect(state.tasks['old']).toBeUndefined();
    expect(state.tasks['fresh']).toBeDefined();
  });

  it('group↔task map round-trip via session storage', async () => {
    const { storage } = await importModules();
    await storage.setTaskIdForGroup(42, 'tsk_a');
    expect(await storage.getTaskIdForGroup(42)).toBe('tsk_a');
    await storage.clearGroupBinding(42);
    expect(await storage.getTaskIdForGroup(42)).toBeUndefined();
  });
});
