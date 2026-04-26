import type { Task } from './tasks';

export type Message =
  | { type: 'GROUP_TABS'; instruction?: string }
  | { type: 'LIST_TASKS' }
  | { type: 'RESUME_TASK'; taskId: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'GET_PENDING_RESUME' }
  | { type: 'DISMISS_PENDING'; taskId: string };

export type GroupTabsResponse =
  | { ok: true; groupCount: number; groupedTabCount: number }
  | { ok: false; error: string };

export type ListTasksResponse =
  | { ok: true; tasks: Task[] }
  | { ok: false; error: string };

export type ResumeTaskResponse =
  | { ok: true; openedCount: number; reusedCount: number }
  | { ok: false; error: string };

export type SimpleResponse = { ok: true } | { ok: false; error: string };

export type PendingResumeResponse =
  | { ok: true; tasks: Task[] }
  | { ok: false; error: string };
