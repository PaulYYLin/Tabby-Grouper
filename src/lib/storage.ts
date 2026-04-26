import {
  ARCHIVE_TTL_MS,
  GROUP_MAP_KEY,
  MAX_TABS_PER_TASK,
  MAX_TASKS,
  PENDING_RESUME_KEY,
  TASKS_KEY,
  emptyState,
  type Task,
  type TasksState,
} from './tasks';

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
