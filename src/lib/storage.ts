import {
  ARCHIVE_TTL_MS,
  DEFAULT_DRAGGED_TAB_POLICY,
  GROUP_MAP_KEY,
  MAX_TABS_PER_TASK,
  MAX_TASKS,
  PENDING_ADDITIONS_KEY,
  PENDING_RESUME_KEY,
  TAB_GROUP_CACHE_KEY,
  TASKS_KEY,
  emptyState,
  isDraggedTabPolicy,
  type DraggedTabPolicy,
  type PendingAddition,
  type Task,
  type TaskTab,
  type TasksState,
} from './tasks';

type PolicyKind = 'add' | 'remove';
const POLICY_STORAGE_KEYS: Record<PolicyKind, string> = {
  add: 'addDraggedTabPolicy',
  remove: 'removeDraggedTabPolicy',
};

let chain: Promise<unknown> = Promise.resolve();

function isTasksState(v: unknown): v is TasksState {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o.schemaVersion === 1 && typeof o.tasks === 'object' && o.tasks !== null;
}

function pruneAndCap(state: TasksState): TasksState {
  const now = Date.now();
  const kept: Record<string, Task> = {};
  for (const [id, t] of Object.entries(state.tasks)) {
    if (t.archivedAt && now - t.archivedAt > ARCHIVE_TTL_MS) continue;
    kept[id] = t.tabs.length > MAX_TABS_PER_TASK
      ? { ...t, tabs: t.tabs.slice(0, MAX_TABS_PER_TASK) }
      : t;
  }
  const ids = Object.keys(kept);
  if (ids.length > MAX_TASKS) {
    ids
      .sort((a, b) => (kept[a].archivedAt ?? Infinity) - (kept[b].archivedAt ?? Infinity))
      .slice(0, ids.length - MAX_TASKS)
      .forEach((id) => {
        if (kept[id].status === 'archived') delete kept[id];
      });
  }
  return { tasks: kept, schemaVersion: 1 };
}

async function rawRead(): Promise<TasksState> {
  const raw = await chrome.storage.local.get(TASKS_KEY);
  const v = raw[TASKS_KEY];
  return isTasksState(v) ? v : emptyState();
}

async function rawWrite(state: TasksState): Promise<void> {
  await chrome.storage.local.set({ [TASKS_KEY]: state });
}

export async function readTasks(): Promise<TasksState> {
  return withTasksLock(async (state) => ({ next: state, result: state }));
}

export function withTasksLock<T>(
  fn: (state: TasksState) => Promise<{ next: TasksState; result: T }>,
): Promise<T> {
  const run = chain.then(async () => {
    const cur = pruneAndCap(await rawRead());
    const { next, result } = await fn(cur);
    const pruned = pruneAndCap(next);
    if (JSON.stringify(pruned) !== JSON.stringify(cur)) {
      await rawWrite(pruned);
    }
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
}

export async function mutateTask(id: string, fn: (t: Task) => Task): Promise<void> {
  await withTasksLock(async (state) => {
    const cur = state.tasks[id];
    if (!cur) return { next: state, result: undefined };
    const updated = { ...fn(cur) };
    updated.version = cur.version + 1;
    return {
      next: { ...state, tasks: { ...state.tasks, [id]: updated } },
      result: undefined,
    };
  });
}

export async function addTask(t: Task): Promise<void> {
  await withTasksLock(async (state) => ({
    next: { ...state, tasks: { ...state.tasks, [t.id]: t } },
    result: undefined,
  }));
}

export async function deleteTask(id: string): Promise<void> {
  await withTasksLock(async (state) => {
    if (!state.tasks[id]) return { next: state, result: undefined };
    const tasks = { ...state.tasks };
    delete tasks[id];
    return { next: { ...state, tasks }, result: undefined };
  });
}

export async function getTaskIdForGroup(groupId: number): Promise<string | undefined> {
  const map = await readGroupTaskMap();
  return map[groupId];
}

export async function setTaskIdForGroup(groupId: number, taskId: string): Promise<void> {
  const map = await readGroupTaskMap();
  map[groupId] = taskId;
  await chrome.storage.session.set({ [GROUP_MAP_KEY]: map });
}

export async function clearGroupBinding(groupId: number): Promise<void> {
  const map = await readGroupTaskMap();
  if (!(groupId in map)) return;
  delete map[groupId];
  await chrome.storage.session.set({ [GROUP_MAP_KEY]: map });
}

export async function readGroupTaskMap(): Promise<Record<number, string>> {
  const raw = await chrome.storage.session.get(GROUP_MAP_KEY);
  const v = raw[GROUP_MAP_KEY];
  if (typeof v !== 'object' || v === null) return {};
  return { ...(v as Record<number, string>) };
}

export async function replaceGroupTaskMap(map: Record<number, string>): Promise<void> {
  await chrome.storage.session.set({ [GROUP_MAP_KEY]: map });
}

export async function readPendingResume(): Promise<string[]> {
  const raw = await chrome.storage.session.get(PENDING_RESUME_KEY);
  const v = raw[PENDING_RESUME_KEY];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export async function setPendingResume(ids: string[]): Promise<void> {
  await chrome.storage.session.set({ [PENDING_RESUME_KEY]: ids });
}

function isPendingAddition(v: unknown): v is PendingAddition {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.kind === 'add' || o.kind === 'remove') &&
    typeof o.taskId === 'string' &&
    typeof o.tabId === 'number' &&
    typeof o.url === 'string' &&
    typeof o.title === 'string' &&
    typeof o.addedAt === 'number'
  );
}

export async function readPendingAdditions(): Promise<PendingAddition[]> {
  const raw = await chrome.storage.session.get(PENDING_ADDITIONS_KEY);
  const v = raw[PENDING_ADDITIONS_KEY];
  return Array.isArray(v) ? v.filter(isPendingAddition) : [];
}

export async function setPendingAdditions(list: PendingAddition[]): Promise<void> {
  await chrome.storage.session.set({ [PENDING_ADDITIONS_KEY]: list });
}

export async function addPendingAddition(entry: PendingAddition): Promise<void> {
  const list = await readPendingAdditions();
  const filtered = list.filter(
    (e) => !(e.taskId === entry.taskId && (e.tabId === entry.tabId || e.url === entry.url)),
  );
  filtered.push(entry);
  await setPendingAdditions(filtered);
}

export async function removePendingAdditionById(id: string): Promise<PendingAddition | undefined> {
  const list = await readPendingAdditions();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return undefined;
  const [removed] = list.splice(idx, 1);
  await setPendingAdditions(list);
  return removed;
}

export async function removePendingAdditionsByTab(tabId: number): Promise<void> {
  const list = await readPendingAdditions();
  const next = list.filter((e) => e.tabId !== tabId);
  if (next.length !== list.length) await setPendingAdditions(next);
}

export async function removePendingAdditionsByTask(taskId: string): Promise<void> {
  const list = await readPendingAdditions();
  const next = list.filter((e) => e.taskId !== taskId);
  if (next.length !== list.length) await setPendingAdditions(next);
}

export async function getDraggedTabPolicy(kind: PolicyKind): Promise<DraggedTabPolicy> {
  const key = POLICY_STORAGE_KEYS[kind];
  const raw = await chrome.storage.sync.get(key);
  return isDraggedTabPolicy(raw[key]) ? raw[key] : DEFAULT_DRAGGED_TAB_POLICY;
}

export async function setDraggedTabPolicy(
  kind: PolicyKind,
  policy: DraggedTabPolicy,
): Promise<void> {
  await chrome.storage.sync.set({ [POLICY_STORAGE_KEYS[kind]]: policy });
}

export async function addTabToTask(taskId: string, tab: TaskTab): Promise<void> {
  await mutateTask(taskId, (t) => {
    if (t.tabs.some((x) => x.url === tab.url)) return t;
    return { ...t, tabs: [...t.tabs, tab], updatedAt: Date.now() };
  });
}

export async function removeTabFromTaskByUrl(taskId: string, url: string): Promise<void> {
  await mutateTask(taskId, (t) => {
    if (!t.tabs.some((x) => x.url === url)) return t;
    return { ...t, tabs: t.tabs.filter((x) => x.url !== url), updatedAt: Date.now() };
  });
}

export async function readTabGroupCache(): Promise<Record<number, number>> {
  const raw = await chrome.storage.session.get(TAB_GROUP_CACHE_KEY);
  const v = raw[TAB_GROUP_CACHE_KEY];
  if (typeof v !== 'object' || v === null) return {};
  const out: Record<number, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const id = Number(k);
    if (Number.isInteger(id) && typeof val === 'number') out[id] = val;
  }
  return out;
}

export async function replaceTabGroupCache(
  cache: Record<number, number>,
): Promise<void> {
  await chrome.storage.session.set({ [TAB_GROUP_CACHE_KEY]: cache });
}

export async function setCachedGroupForTab(
  tabId: number,
  groupId: number,
): Promise<void> {
  const cache = await readTabGroupCache();
  cache[tabId] = groupId;
  await replaceTabGroupCache(cache);
}

export async function deleteCachedTab(tabId: number): Promise<void> {
  const cache = await readTabGroupCache();
  if (!(tabId in cache)) return;
  delete cache[tabId];
  await replaceTabGroupCache(cache);
}

export async function getCachedGroupForTab(tabId: number): Promise<number | undefined> {
  const cache = await readTabGroupCache();
  return cache[tabId];
}
