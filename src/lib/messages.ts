import type { Lang } from './i18n';
import type { MemoryField } from './userPrefs';
import type { PendingAddition, Task } from './tasks';

export type Message =
  | { type: 'GROUP_TABS'; instruction?: string }
  | { type: 'LIST_TASKS' }
  | { type: 'RESUME_TASK'; taskId: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'UPDATE_TASK_SUMMARY'; taskId: string; summary: string }
  | { type: 'UPDATE_TASK_NAME'; taskId: string; name: string }
  | { type: 'LIST_PENDING_ADDITIONS' }
  | {
      type: 'RESOLVE_PENDING_ADDITION';
      id: string;
      confirm: boolean;
      dontAskAgain: boolean;
    }
  | { type: 'GET_MEMORY' }
  | { type: 'UPDATE_DISTILLED'; text: string }
  | { type: 'REMOVE_MEMORY_SAMPLE'; field: MemoryField; value: string }
  | { type: 'CLEAR_MEMORY_SAMPLES'; field: MemoryField }
  | { type: 'CLEAR_MEMORY_ALL' }
  | { type: 'RUN_AUTO_LEARN' };

export interface MemoryView {
  distilled: string;
  distilledAt: number;
  distilledLang: Lang | '';
  autoLearnPaused: boolean;
  instructions: string[];
  userNames: string[];
  aiNames: string[];
}

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

export type ListPendingAdditionsResponse =
  | { ok: true; pending: PendingAdditionView[] }
  | { ok: false; error: string };

export type GetMemoryResponse =
  | { ok: true; memory: MemoryView }
  | { ok: false; error: string };
