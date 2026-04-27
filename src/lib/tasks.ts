export interface TaskTab {
  url: string;
  title: string;
  favIconUrl?: string;
}

export type TaskStatus = 'live' | 'archived';

export interface Task {
  id: string;
  name: string;
  color: chrome.tabGroups.ColorEnum;
  tabs: TaskTab[];
  instruction?: string;
  summary?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  status: TaskStatus;
  version: number;
}

export const MAX_AI_SUMMARY_LEN = 200;
export const MAX_TASK_SUMMARY_LEN = 500;

export interface TasksState {
  tasks: Record<string, Task>;
  schemaVersion: 1;
}

export const TASKS_KEY = 'tabby:tasks:v1';
export const GROUP_MAP_KEY = 'tabby:groupTaskMap';
export const PENDING_RESUME_KEY = 'tabby:pendingResume';
export const PENDING_ADDITIONS_KEY = 'tabby:pendingAdditions';
export const TAB_GROUP_CACHE_KEY = 'tabby:tabGroupCache';

export const DRAGGED_TAB_POLICIES = ['ask', 'always', 'never'] as const;
export type DraggedTabPolicy = (typeof DRAGGED_TAB_POLICIES)[number];
export const DEFAULT_DRAGGED_TAB_POLICY: DraggedTabPolicy = 'always';

export function isDraggedTabPolicy(v: unknown): v is DraggedTabPolicy {
  return (DRAGGED_TAB_POLICIES as readonly unknown[]).includes(v);
}

export type PendingKind = 'add' | 'remove';

export interface PendingAddition {
  id: string;
  kind: PendingKind;
  taskId: string;
  tabId: number;
  url: string;
  title: string;
  favIconUrl?: string;
  addedAt: number;
}

export const ARCHIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_TASKS = 200;
export const MAX_TABS_PER_TASK = 200;

export function emptyState(): TasksState {
  return { tasks: {}, schemaVersion: 1 };
}

function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export const newTaskId = (): string => newId('tsk');
export const newPendingAdditionId = (): string => newId('pa');
