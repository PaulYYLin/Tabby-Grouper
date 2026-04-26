import { dismissPendingResume, syncTaskNameAndColor } from './groupSync';
import { mutateTask, readTasks, setTaskIdForGroup } from './storage';

const CREATE_BATCH = 10;

export interface ResumeResult {
  openedCount: number;
  reusedCount: number;
  groupId: number;
}

export async function resumeTask(taskId: string, hintWindowId?: number): Promise<ResumeResult> {
  const state = await readTasks();
  const task = state.tasks[taskId];
  if (!task) throw new Error('找不到要恢復的任務');
  if (task.tabs.length === 0) throw new Error('該任務沒有可恢復的分頁');

  const targetWindowId = await resolveWindowId(hintWindowId);

  const existing = await chrome.tabs.query({ windowId: targetWindowId });
  const urlToTabId = new Map<string, number>();
  for (const t of existing) {
    if (typeof t.id === 'number' && t.url) urlToTabId.set(t.url, t.id);
  }

  const orderedIds: number[] = [];
  let reusedCount = 0;
  let openedCount = 0;
  const pendingCreate: { url: string; index: number }[] = [];

  task.tabs.forEach((tab, index) => {
    const existingId = urlToTabId.get(tab.url);
    if (typeof existingId === 'number') {
      orderedIds[index] = existingId;
      reusedCount++;
    } else {
      pendingCreate.push({ url: tab.url, index });
    }
  });

  for (let i = 0; i < pendingCreate.length; i += CREATE_BATCH) {
    const slice = pendingCreate.slice(i, i + CREATE_BATCH);
    const created = await Promise.allSettled(
      slice.map(({ url }) =>
        chrome.tabs.create({ windowId: targetWindowId, url, active: false }),
      ),
    );
    created.forEach((r, k) => {
      if (r.status === 'fulfilled' && typeof r.value.id === 'number') {
        orderedIds[slice[k].index] = r.value.id;
        openedCount++;
      }
    });
  }

  const tabIds = orderedIds.filter((id): id is number => typeof id === 'number');
  if (tabIds.length === 0) throw new Error('沒有任何分頁可加入群組');

  const liveGroups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const sameNameSameColor = liveGroups.find(
    (g) => (g.title ?? '') === task.name && g.color === task.color,
  );

  let groupId: number;
  if (sameNameSameColor) {
    groupId = await chrome.tabs.group({ groupId: sameNameSameColor.id, tabIds });
  } else {
    groupId = await chrome.tabs.group({ createProperties: { windowId: targetWindowId }, tabIds });
  }

  const updated = await chrome.tabGroups.update(groupId, {
    title: task.name,
    color: task.color,
  });

  await setTaskIdForGroup(groupId, task.id);
  await mutateTask(task.id, (t) => ({
    ...t,
    status: 'live',
    archivedAt: undefined,
    updatedAt: Date.now(),
  }));
  await dismissPendingResume(task.id);
  await syncTaskNameAndColor(groupId, task.id, updated);

  return { openedCount, reusedCount, groupId };
}

async function resolveWindowId(hint?: number): Promise<number> {
  if (typeof hint === 'number') {
    try {
      const w = await chrome.windows.get(hint);
      if (typeof w.id === 'number') return w.id;
    } catch {
      // fall through
    }
  }
  const last = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
  if (typeof last?.id === 'number') return last.id;
  const all = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const first = all.find((w) => typeof w.id === 'number');
  if (!first || typeof first.id !== 'number') throw new Error('找不到可用視窗');
  return first.id;
}
