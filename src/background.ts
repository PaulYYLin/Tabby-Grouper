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
  addPendingAddition,
  addTabToTask,
  addTask,
  deleteCachedTab,
  deleteTask as deleteTaskRecord,
  getCachedGroupForTab,
  getDraggedTabPolicy,
  getTaskIdForGroup,
  mutateTask,
  readPendingAdditions,
  readTasks,
  removePendingAdditionById,
  removePendingAdditionsByTab,
  removePendingAdditionsByTask,
  removeTabFromTaskByUrl,
  replaceTabGroupCache,
  setCachedGroupForTab,
  setDraggedTabPolicy,
  setPendingAdditions,
} from './lib/storage';
import {
  GROUP_MAP_KEY,
  MAX_TASK_SUMMARY_LEN,
  TAB_GROUP_CACHE_KEY,
  newPendingAdditionId,
  newTaskId,
  type PendingAddition,
  type Task,
} from './lib/tasks';
import type {
  GroupTabsResponse,
  ListPendingAdditionsResponse,
  ListTasksResponse,
  Message,
  PendingAdditionView,
  PendingResumeResponse,
  ResumeTaskResponse,
  SimpleResponse,
} from './lib/messages';

type AnyResponse =
  | GroupTabsResponse
  | ListTasksResponse
  | ResumeTaskResponse
  | SimpleResponse
  | PendingResumeResponse
  | ListPendingAdditionsResponse;

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
    case 'UPDATE_TASK_SUMMARY':
      return handleUpdateTaskSummary(msg.taskId, msg.summary);
    case 'GET_PENDING_RESUME':
      return handleGetPendingResume();
    case 'DISMISS_PENDING':
      return handleDismissPending(msg.taskId);
    case 'LIST_PENDING_ADDITIONS':
      return handleListPendingAdditions();
    case 'RESOLVE_PENDING_ADDITION':
      return handleResolvePendingAddition(msg.id, msg.confirm, msg.dontAskAgain);
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
        summary: g.summary || undefined,
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
  await removePendingAdditionsByTask(taskId);
  await updateBadge();
  return { ok: true };
}

async function handleUpdateTaskSummary(
  taskId: string,
  summary: string,
): Promise<SimpleResponse> {
  const trimmed = summary.trim().slice(0, MAX_TASK_SUMMARY_LEN);
  await mutateTask(taskId, (t) => ({
    ...t,
    summary: trimmed || undefined,
    updatedAt: Date.now(),
  }));
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

async function handleListPendingAdditions(): Promise<ListPendingAdditionsResponse> {
  const [list, state] = await Promise.all([readPendingAdditions(), readTasks()]);
  const live = list.filter((e) => state.tasks[e.taskId]);
  if (live.length !== list.length) await setPendingAdditions(live);
  const pending: PendingAdditionView[] = live.map((e) => {
    const task = state.tasks[e.taskId];
    return { ...e, taskName: task.name, taskColor: task.color };
  });
  await updateBadge(live);
  return { ok: true, pending };
}

async function handleResolvePendingAddition(
  id: string,
  confirm: boolean,
  dontAskAgain: boolean,
): Promise<SimpleResponse> {
  void chrome.notifications.clear(NOTIFICATION_PREFIX + id);
  const entry = await removePendingAdditionById(id);
  if (entry && confirm) {
    if (entry.kind === 'add') {
      let url = entry.url;
      let title = entry.title;
      let favIconUrl = entry.favIconUrl;
      try {
        const tab = await chrome.tabs.get(entry.tabId);
        if (tab.url) url = tab.url;
        if (typeof tab.title === 'string' && tab.title.length > 0) title = tab.title;
        if (tab.favIconUrl) favIconUrl = tab.favIconUrl;
      } catch {
        // tab may be closed; fall back to stored snapshot
      }
      await addTabToTask(entry.taskId, { url, title, favIconUrl });
    } else {
      await removeTabFromTaskByUrl(entry.taskId, entry.url);
    }
  }
  if (dontAskAgain && entry) {
    await setDraggedTabPolicy(entry.kind, confirm ? 'always' : 'never');
  }
  await updateBadge();
  return { ok: true };
}

async function updateBadge(list?: PendingAddition[]): Promise<void> {
  const items = list ?? (await readPendingAdditions());
  const text = items.length > 0 ? String(items.length) : '';
  await chrome.action.setBadgeText({ text });
  if (items.length > 0) {
    await chrome.action.setBadgeBackgroundColor({ color: '#ff751f' });
  }
}

async function resolveTaskIdForGroup(groupId: number): Promise<string | undefined> {
  let taskId = await getTaskIdForGroup(groupId);
  if (taskId) return taskId;
  await rebuildGroupTaskMap();
  taskId = await getTaskIdForGroup(groupId);
  return taskId;
}

async function onTabJoinedGroup(tabId: number, groupId: number): Promise<void> {
  const taskId = await resolveTaskIdForGroup(groupId);
  if (!taskId) return;

  const [tabRes, state, policy] = await Promise.all([
    chrome.tabs.get(tabId).catch(() => undefined),
    readTasks(),
    getDraggedTabPolicy('add'),
  ]);
  if (!tabRes) return;
  if (!isGroupableTab(tabRes)) return;
  if (tabRes.groupId !== groupId) return;

  const task = state.tasks[taskId];
  if (!task) return;
  if (task.tabs.some((x) => x.url === tabRes.url)) return;
  if (policy === 'never') return;

  const newTab = {
    url: tabRes.url!,
    title: tabRes.title ?? '',
    favIconUrl: tabRes.favIconUrl,
  };
  if (policy === 'always') {
    await addTabToTask(taskId, newTab);
    return;
  }

  const pendingId = newPendingAdditionId();
  await addPendingAddition({
    id: pendingId,
    kind: 'add',
    taskId,
    tabId,
    ...newTab,
    addedAt: Date.now(),
  });
  await updateBadge();
  await showDecisionNotification('add', pendingId, newTab.title || newTab.url, task.name);
}

async function onTabLeftGroup(tabId: number, oldGroupId: number): Promise<void> {
  const taskId = await resolveTaskIdForGroup(oldGroupId);
  if (!taskId) return;

  const [tabRes, state, policy] = await Promise.all([
    chrome.tabs.get(tabId).catch(() => undefined),
    readTasks(),
    getDraggedTabPolicy('remove'),
  ]);
  if (!tabRes?.url) return;
  const url = tabRes.url;
  const title = tabRes.title ?? '';
  const favIconUrl = tabRes.favIconUrl;

  const task = state.tasks[taskId];
  if (!task) return;
  const tracked = task.tabs.find((x) => x.url === url);
  if (!tracked) return;
  if (policy === 'never') return;

  if (policy === 'always') {
    await removeTabFromTaskByUrl(taskId, url);
    return;
  }

  const pendingId = newPendingAdditionId();
  await addPendingAddition({
    id: pendingId,
    kind: 'remove',
    taskId,
    tabId,
    url,
    title: title || tracked.title,
    favIconUrl: favIconUrl ?? tracked.favIconUrl,
    addedAt: Date.now(),
  });
  await updateBadge();
  await showDecisionNotification(
    'remove',
    pendingId,
    title || tracked.title || url,
    task.name,
  );
}

const NOTIFICATION_PREFIX = 'tabby-decide:';

async function showDecisionNotification(
  kind: 'add' | 'remove',
  pendingId: string,
  tabTitle: string,
  taskName: string,
): Promise<void> {
  const iconUrl = chrome.runtime.getURL('icons/128.png');
  const isAdd = kind === 'add';
  await chrome.notifications.create(NOTIFICATION_PREFIX + pendingId, {
    type: 'basic',
    iconUrl,
    title: isAdd ? `加入「${taskName}」？` : `從「${taskName}」移除？`,
    message: tabTitle,
    contextMessage: isAdd
      ? '剛剛拖入的分頁是否要記錄到此任務？'
      : '剛剛拖出的分頁是否要從此任務移除？',
    buttons: isAdd
      ? [{ title: '加入' }, { title: '略過' }]
      : [{ title: '移除' }, { title: '保留' }],
    requireInteraction: true,
    priority: 1,
  });
}

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (!notifId.startsWith(NOTIFICATION_PREFIX)) return;
  const pendingId = notifId.slice(NOTIFICATION_PREFIX.length);
  void (async () => {
    await handleResolvePendingAddition(pendingId, btnIdx === 0, false);
    await chrome.notifications.clear(notifId);
  })();
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (!notifId.startsWith(NOTIFICATION_PREFIX)) return;
  void chrome.notifications.clear(notifId);
});

async function rebuildTabGroupCache(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const cache: Record<number, number> = {};
  for (const t of tabs) {
    if (typeof t.id === 'number' && typeof t.groupId === 'number') {
      cache[t.id] = t.groupId;
    }
  }
  await replaceTabGroupCache(cache);
}

let cachesReady: Promise<void> | undefined;
function ensureCachesReady(): Promise<void> {
  if (!cachesReady) {
    cachesReady = (async () => {
      const stored = await chrome.storage.session.get([GROUP_MAP_KEY, TAB_GROUP_CACHE_KEY]);
      const tasks: Promise<unknown>[] = [];
      if (!stored[GROUP_MAP_KEY]) tasks.push(rebuildGroupTaskMap());
      if (!stored[TAB_GROUP_CACHE_KEY]) tasks.push(rebuildTabGroupCache());
      await Promise.all(tasks);
    })();
  }
  return cachesReady;
}

function fullInit(): Promise<void> {
  cachesReady = (async () => {
    await Promise.all([rebuildGroupTaskMap(), rebuildTabGroupCache()]);
  })();
  return (async () => {
    await readTasks();
    await cachesReady;
    await detectPendingResumes();
    await updateBadge();
  })();
}

chrome.runtime.onInstalled.addListener(() => {
  void fullInit();
});

chrome.runtime.onStartup.addListener(() => {
  void fullInit();
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
    await removePendingAdditionsByTask(taskId);
    await updateBadge();
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.groupId === undefined) return;
  const newGroupId = changeInfo.groupId;
  void (async () => {
    await ensureCachesReady();
    const oldGroupId = await getCachedGroupForTab(tabId);
    await setCachedGroupForTab(tabId, newGroupId);

    if (
      typeof oldGroupId === 'number' &&
      oldGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
      oldGroupId !== newGroupId
    ) {
      await onTabLeftGroup(tabId, oldGroupId);
    }

    if (newGroupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return;

    await onTabJoinedGroup(tabId, newGroupId);
  })();
});

chrome.tabs.onCreated.addListener((tab) => {
  if (typeof tab.id !== 'number' || typeof tab.groupId !== 'number') return;
  const tabId = tab.id;
  const groupId = tab.groupId;
  void (async () => {
    await ensureCachesReady();
    await setCachedGroupForTab(tabId, groupId);
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    await ensureCachesReady();
    await removePendingAdditionsByTab(tabId);
    await deleteCachedTab(tabId);
    await updateBadge();
  })();
});
