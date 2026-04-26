import { isGroupableTab } from './grouping';
import {
  clearGroupBinding,
  mutateTask,
  readPendingResume,
  readTasks,
  replaceGroupTaskMap,
  setPendingResume,
  setTaskIdForGroup,
} from './storage';
import type { Task, TaskTab } from './tasks';

export async function tabsForGroup(groupId: number): Promise<TaskTab[]> {
  const tabs = await chrome.tabs.query({ groupId });
  return tabs.filter(isGroupableTab).map((t) => ({
    url: t.url,
    title: t.title ?? '',
    favIconUrl: t.favIconUrl,
  }));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export async function rebuildGroupTaskMap(): Promise<void> {
  const liveGroups = await chrome.tabGroups.query({});
  const state = await readTasks();
  const tasks = Object.values(state.tasks);
  const map: Record<number, string> = {};
  const usedTaskIds = new Set<string>();

  for (const g of liveGroups) {
    const liveTabs = await tabsForGroup(g.id);
    const liveUrls = new Set(liveTabs.map((t) => t.url));
    let best: { taskId: string; score: number; updatedAt: number } | undefined;

    for (const t of tasks) {
      if (usedTaskIds.has(t.id)) continue;
      if ((g.title ?? '') !== t.name) continue;
      if (g.color !== t.color) continue;
      const score = jaccard(liveUrls, new Set(t.tabs.map((x) => x.url)));
      if (score < 0.5) continue;
      if (!best || score > best.score || (score === best.score && t.updatedAt > best.updatedAt)) {
        best = { taskId: t.id, score, updatedAt: t.updatedAt };
      }
    }

    if (best) {
      map[g.id] = best.taskId;
      usedTaskIds.add(best.taskId);
      await mutateTask(best.taskId, (curr) => ({
        ...curr,
        status: 'live',
        archivedAt: undefined,
      }));
    }
  }

  await replaceGroupTaskMap(map);
}

export async function archiveGroup(groupId: number, taskId: string): Promise<void> {
  await mutateTask(taskId, (t) => ({
    ...t,
    status: 'archived',
    archivedAt: Date.now(),
  }));
  await clearGroupBinding(groupId);
}

export async function bindNewGroup(groupId: number, task: Task): Promise<void> {
  await setTaskIdForGroup(groupId, task.id);
}

export async function detectPendingResumes(): Promise<string[]> {
  const state = await readTasks();
  const tasks = Object.values(state.tasks);
  if (tasks.length === 0) {
    await setPendingResume([]);
    return [];
  }

  const allTabs = await chrome.tabs.query({});
  const liveUrls = new Set(allTabs.map((t) => t.url).filter((u): u is string => !!u));
  const liveGroups = await chrome.tabGroups.query({});
  const liveGroupNames = new Set(liveGroups.map((g) => g.title ?? ''));

  const pending: string[] = [];
  for (const t of tasks) {
    if (t.status !== 'archived') continue;
    if (liveGroupNames.has(t.name)) continue;
    const anyOpen = t.tabs.some((tab) => liveUrls.has(tab.url));
    if (anyOpen) continue;
    pending.push(t.id);
  }
  pending.sort((a, b) => {
    const ta = state.tasks[a].archivedAt ?? 0;
    const tb = state.tasks[b].archivedAt ?? 0;
    return tb - ta;
  });
  await setPendingResume(pending);
  return pending;
}

export async function syncTaskNameAndColor(
  groupId: number,
  taskId: string,
  group: chrome.tabGroups.TabGroup,
): Promise<void> {
  const newTabs = await tabsForGroup(groupId);
  await mutateTask(taskId, (t) => ({
    ...t,
    name: group.title && group.title.length > 0 ? group.title : t.name,
    color: group.color,
    tabs: newTabs.length > 0 ? newTabs : t.tabs,
    updatedAt: Date.now(),
  }));
}

export async function dismissPendingResume(taskId: string): Promise<void> {
  const cur = await readPendingResume();
  await setPendingResume(cur.filter((id) => id !== taskId));
}
