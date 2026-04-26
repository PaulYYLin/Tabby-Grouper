import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeArea() {
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
    set: vi.fn(async (obj: Record<string, unknown>) => {
      Object.assign(store, obj);
    }),
    remove: vi.fn(async (k: string | string[]) => {
      const keys = Array.isArray(k) ? k : [k];
      for (const key of keys) delete store[key];
    }),
  };
}

interface FakeChromeOpts {
  existingTabs?: Partial<chrome.tabs.Tab>[];
  liveGroups?: Partial<chrome.tabGroups.TabGroup>[];
  createFails?: Set<string>;
}

function makeChrome(opts: FakeChromeOpts = {}) {
  const existing = opts.existingTabs ?? [];
  const live = opts.liveGroups ?? [];
  const createFails = opts.createFails ?? new Set<string>();
  let nextTabId = 1000;
  let nextGroupId = 5000;
  const created: { url: string; id: number; windowId: number }[] = [];
  const groupCalls: { args: chrome.tabs.GroupOptions; resultGroupId: number }[] = [];
  const groupUpdates: { groupId: number; props: chrome.tabGroups.UpdateProperties }[] = [];

  return {
    storage: { local: makeArea(), session: makeArea() },
    tabs: {
      query: vi.fn(async (q: chrome.tabs.QueryInfo) => {
        if (q.windowId != null) return existing.filter((t) => t.windowId === q.windowId);
        if (q.groupId != null) return existing.filter((t) => t.groupId === q.groupId);
        return existing;
      }),
      create: vi.fn(async (props: chrome.tabs.CreateProperties) => {
        const url = props.url ?? '';
        if (createFails.has(url)) throw new Error('create failed');
        const id = nextTabId++;
        const tab = { id, url, windowId: props.windowId };
        created.push({ url, id, windowId: props.windowId ?? 0 });
        return tab as chrome.tabs.Tab;
      }),
      group: vi.fn(async (opts: chrome.tabs.GroupOptions) => {
        const gid = opts.groupId ?? nextGroupId++;
        groupCalls.push({ args: opts, resultGroupId: gid });
        return gid;
      }),
    },
    tabGroups: {
      query: vi.fn(async () => live),
      update: vi.fn(async (groupId: number, props: chrome.tabGroups.UpdateProperties) => {
        groupUpdates.push({ groupId, props });
        return { id: groupId, title: props.title ?? '', color: props.color ?? 'grey' };
      }),
    },
    windows: {
      get: vi.fn(async (id: number) => ({ id })),
      getLastFocused: vi.fn(async () => ({ id: 1 })),
      getAll: vi.fn(async () => [{ id: 1 }]),
    },
    runtime: {},
    _spies: { created, groupCalls, groupUpdates },
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function setupWithTask(
  chromeMock: ReturnType<typeof makeChrome>,
  task: import('./tasks').Task,
) {
  vi.stubGlobal('chrome', chromeMock);
  const storage = await import('./storage');
  await storage.addTask(task);
  const resume = await import('./resume');
  return { storage, resume };
}

function baseTask(): import('./tasks').Task {
  return {
    id: 'tsk_x',
    name: 'Tokyo trip',
    color: 'blue',
    tabs: [
      { url: 'https://a.com/', title: 'A' },
      { url: 'https://b.com/', title: 'B' },
      { url: 'https://c.com/', title: 'C' },
    ],
    createdAt: 0,
    updatedAt: 0,
    status: 'archived',
    archivedAt: Date.now(),
    version: 1,
  };
}

describe('resumeTask', () => {
  it('opens missing tabs and reuses existing ones', async () => {
    const chromeMock = makeChrome({
      existingTabs: [{ id: 1, url: 'https://b.com/', windowId: 1 }],
    });
    const { resume } = await setupWithTask(chromeMock, baseTask());
    const r = await resume.resumeTask('tsk_x');
    expect(r.openedCount).toBe(2);
    expect(r.reusedCount).toBe(1);
    expect(chromeMock._spies.created.map((c) => c.url)).toEqual([
      'https://a.com/',
      'https://c.com/',
    ]);
    expect(chromeMock._spies.groupCalls[0].args.tabIds).toHaveLength(3);
  });

  it('reuses same-name same-color group', async () => {
    const chromeMock = makeChrome({
      liveGroups: [{ id: 9001, title: 'Tokyo trip', color: 'blue', windowId: 1 }],
    });
    const { resume } = await setupWithTask(chromeMock, baseTask());
    const r = await resume.resumeTask('tsk_x');
    expect(r.groupId).toBe(9001);
    expect(chromeMock._spies.groupCalls[0].args.groupId).toBe(9001);
  });

  it('does NOT reuse same-name different-color group', async () => {
    const chromeMock = makeChrome({
      liveGroups: [{ id: 9001, title: 'Tokyo trip', color: 'red', windowId: 1 }],
    });
    const { resume } = await setupWithTask(chromeMock, baseTask());
    const r = await resume.resumeTask('tsk_x');
    expect(r.groupId).not.toBe(9001);
    expect(chromeMock._spies.groupCalls[0].args.groupId).toBeUndefined();
  });

  it('errors when task has no tabs', async () => {
    const chromeMock = makeChrome();
    const { resume } = await setupWithTask(chromeMock, { ...baseTask(), tabs: [] });
    await expect(resume.resumeTask('tsk_x')).rejects.toThrow(/沒有可恢復/);
  });

  it('still groups partially when some tabs.create fail', async () => {
    const chromeMock = makeChrome({
      createFails: new Set(['https://a.com/']),
    });
    const { resume } = await setupWithTask(chromeMock, baseTask());
    const r = await resume.resumeTask('tsk_x');
    expect(r.openedCount).toBe(2);
    expect(chromeMock._spies.groupCalls[0].args.tabIds).toHaveLength(2);
  });

  it('errors when nothing succeeded', async () => {
    const chromeMock = makeChrome({
      createFails: new Set(['https://a.com/', 'https://b.com/', 'https://c.com/']),
    });
    const { resume } = await setupWithTask(chromeMock, baseTask());
    await expect(resume.resumeTask('tsk_x')).rejects.toThrow(/沒有任何分頁/);
  });
});
