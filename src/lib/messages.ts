import type { PendingAddition, Task } from './tasks';

export type Message =
  | { type: 'GROUP_TABS'; instruction?: string }
  | { type: 'LIST_TASKS' }
  | { type: 'RESUME_TASK'; taskId: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'UPDATE_TASK_SUMMARY'; taskId: string; summary: string }
  | { type: 'GET_PENDING_RESUME' }
  | { type: 'DISMISS_PENDING'; taskId: string }
  | { type: 'LIST_PENDING_ADDITIONS' }
  | {
      type: 'RESOLVE_PENDING_ADDITION';
      id: string;
      confirm: boolean;
      dontAskAgain: boolean;
    };

export interface PendingAdditionView extends PendingAddition {
  taskName: string;
  taskColor: chrome.tabGroups.ColorEnum;
}

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

export type ListPendingAdditionsResponse =
  | { ok: true; pending: PendingAdditionView[] }
  | { ok: false; error: string };
