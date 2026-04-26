import { isGroupableTab, pickColor } from './lib/grouping';
import {
  archiveGroup,
  bindNewGroup,
  detectPendingResumes,
  dismissPendingResume,
  rebuildGroupTaskMap,
  syncTaskNameAndColor,
} from './lib/groupSync';
import { classifyTabs, DEFAULT_MODEL, type TabInfo } from './lib/openrouter';
import { resumeTask } from './lib/resume';
import {
  addTask,
  deleteTask as deleteTaskRecord,
  getTaskIdForGroup,
  readTasks,
} from './lib/storage';
import { newTaskId, type Task } from './lib/tasks';
import type {
  GroupTabsResponse,
  ListTasksResponse,
  Message,
  PendingResumeResponse,
  ResumeTaskResponse,
  SimpleResponse,
} from './lib/messages';

type AnyResponse =
  | GroupTabsResponse
  | ListTasksResponse
  | ResumeTaskResponse
  | SimpleResponse
  | PendingResumeResponse;

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse: (r: AnyResponse) => void) => {
    handleMessage(msg)
      .then((r) => sendResponse(r))
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      );
    return true;
  },
);

async function handleMessage(msg: Message): Promise<AnyResponse> {
  switch (msg.type) {
    case 'GROUP_TABS':
      return handleGroupTabs(msg.instruction);
    case 'LIST_TASKS':
      return handleListTasks();
    case 'RESUME_TASK':
      return handleResumeTask(msg.taskId);
    case 'DELETE_TASK':
      return handleDeleteTask(msg.taskId);
    case 'GET_PENDING_RESUME':
      return handleGetPendingResume();
    case 'DISMISS_PENDING':
      return handleDismissPending(msg.taskId);
  }
}

async function handleGroupTabs(instruction?: string): Promise<GroupTabsResponse> {
  const { apiKey, model } = (await chrome.storage.sync.get(['apiKey', 'model'])) as {
    apiKey?: string;
    model?: string;
  };
  if (!apiKey) {
    return { ok: false, error: '尚未設定 API Key，請先打開設定頁' };
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidates: TabInfo[] = tabs
    .filter(isGroupableTab)
    .map((t) => ({ id: t.id, title: t.title ?? '', url: t.url }));

  if (candidates.length < 2) {
    return { ok: false, error: '可分組的分頁少於 2 個' };
  }

  const groups = await classifyTabs(apiKey, model || DEFAULT_MODEL, candidates, instruction);

  if (groups.length === 0) {
    return { ok: false, error: 'AI 未找到可歸類的主題群組' };
  }

  const tabById = new Map<number, chrome.tabs.Tab>();
  for (const t of tabs) if (typeof t.id === 'number') tabById.set(t.id, t);

  const counts = await Promise.all(
    groups.map(async (g) => {
      const color = pickColor(g.groupName);
      const groupId = await chrome.tabs.group({ tabIds: g.tabIds });
      await chrome.tabGroups.update(groupId, { title: g.groupName, color });

      const now = Date.now();
      const task: Task = {
        id: newTaskId(),
        name: g.groupName,
        color,
        tabs: g.tabIds
          .map((id) => tabById.get(id))
          .filter((t): t is chrome.tabs.Tab => !!t)
          .filter(isGroupableTab)
          .map((t) => ({ url: t.url, title: t.title ?? '', favIconUrl: t.favIconUrl })),
        instruction,
        createdAt: now,
        updatedAt: now,
        status: 'live',
        version: 1,
      };
      await addTask(task);
      await bindNewGroup(groupId, task);
      return g.tabIds.length;
    }),
  );

  return {
    ok: true,
    groupCount: groups.length,
    groupedTabCount: counts.reduce((a, b) => a + b, 0),
  };
}

async function handleListTasks(): Promise<ListTasksResponse> {
  const state = await readTasks();
  const tasks = Object.values(state.tasks).sort((a, b) => b.updatedAt - a.updatedAt);
  return { ok: true, tasks };
}

async function handleResumeTask(taskId: string): Promise<ResumeTaskResponse> {
  try {
    const r = await resumeTask(taskId);
    return { ok: true, openedCount: r.openedCount, reusedCount: r.reusedCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleDeleteTask(taskId: string): Promise<SimpleResponse> {
  await deleteTaskRecord(taskId);
  return { ok: true };
}

async function handleGetPendingResume(): Promise<PendingResumeResponse> {
  const ids = await detectPendingResumes();
  const state = await readTasks();
  const tasks = ids
    .map((id) => state.tasks[id])
    .filter((t): t is Task => !!t);
  return { ok: true, tasks };
}

async function handleDismissPending(taskId: string): Promise<SimpleResponse> {
  await dismissPendingResume(taskId);
  return { ok: true };
}

chrome.runtime.onInstalled.addListener(() => {
  void readTasks();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await rebuildGroupTaskMap();
    await detectPendingResumes();
  })();
});

chrome.tabGroups.onUpdated.addListener((group) => {
  void (async () => {
    const taskId = await getTaskIdForGroup(group.id);
    if (!taskId) return;
    await syncTaskNameAndColor(group.id, taskId, group);
  })();
});

chrome.tabGroups.onRemoved.addListener((group) => {
  void (async () => {
    const taskId = await getTaskIdForGroup(group.id);
    if (!taskId) return;
    await archiveGroup(group.id, taskId);
  })();
});
