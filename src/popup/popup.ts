import '../fonts.css';
import type {
  GroupTabsResponse,
  ListTasksResponse,
  Message,
  PendingResumeResponse,
  ResumeTaskResponse,
  SimpleResponse,
} from '../lib/messages';
import type { Task } from '../lib/tasks';

const btn = document.getElementById('group-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const tasksStatusEl = document.getElementById('tasks-status') as HTMLParagraphElement;
const optionsLink = document.getElementById('options-link') as HTMLAnchorElement;
const instructionEl = document.getElementById('instruction') as HTMLTextAreaElement;
const versionEl = document.getElementById('version') as HTMLSpanElement;
const taskListEl = document.getElementById('task-list') as HTMLUListElement;
const tasksEmptyEl = document.getElementById('tasks-empty') as HTMLParagraphElement;
const groupView = document.getElementById('view-group') as HTMLElement;
const tasksView = document.getElementById('view-tasks') as HTMLElement;
const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab');
const banner = document.getElementById('resume-banner') as HTMLElement;
const bannerText = document.getElementById('resume-banner-text') as HTMLParagraphElement;
const bannerBtn = document.getElementById('resume-banner-btn') as HTMLButtonElement;
const bannerDismiss = document.getElementById('resume-banner-dismiss') as HTMLButtonElement;

versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

const INSTRUCTION_KEY = 'lastInstruction';
const { [INSTRUCTION_KEY]: lastInstruction } = await chrome.storage.local.get(INSTRUCTION_KEY);
if (typeof lastInstruction === 'string') instructionEl.value = lastInstruction;

const STATUS_KINDS = ['success', 'error'] as const;
type StatusKind = 'info' | (typeof STATUS_KINDS)[number];

function send<T>(msg: Message): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus(statusEl, '分析中，請稍候…', 'info');
  const instruction = instructionEl.value.trim();
  await chrome.storage.local.set({ [INSTRUCTION_KEY]: instruction });
  try {
    const res = await send<GroupTabsResponse>({
      type: 'GROUP_TABS',
      instruction: instruction || undefined,
    });
    if (res.ok) {
      setStatus(
        statusEl,
        `已建立 ${res.groupCount} 個群組，整理了 ${res.groupedTabCount} 個分頁`,
        'success',
      );
      void loadTasks();
    } else {
      setStatus(statusEl, `錯誤：${res.error}`, 'error');
    }
  } catch (err) {
    setStatus(statusEl, `錯誤：${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

tabButtons.forEach((b) => {
  b.addEventListener('click', () => {
    tabButtons.forEach((x) => x.classList.toggle('is-active', x === b));
    const view = b.dataset.view;
    groupView.hidden = view !== 'group';
    tasksView.hidden = view !== 'tasks';
    if (view === 'tasks') void loadTasks();
  });
});

async function loadTasks(): Promise<void> {
  taskListEl.replaceChildren();
  setStatus(tasksStatusEl, '', 'info');
  const res = await send<ListTasksResponse>({ type: 'LIST_TASKS' });
  if (!res.ok) {
    setStatus(tasksStatusEl, `錯誤：${res.error}`, 'error');
    return;
  }
  if (res.tasks.length === 0) {
    tasksEmptyEl.hidden = false;
    return;
  }
  tasksEmptyEl.hidden = true;
  for (const t of res.tasks) {
    taskListEl.appendChild(renderTask(t));
  }
}

function renderTask(t: Task): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `task-row task-row--${t.color}`;
  li.dataset.taskId = t.id;

  const head = document.createElement('div');
  head.className = 'task-head';

  const dot = document.createElement('span');
  dot.className = `task-dot task-dot--${t.color}`;
  head.appendChild(dot);

  const name = document.createElement('span');
  name.className = 'task-name';
  name.textContent = t.name;
  head.appendChild(name);

  if (t.status === 'archived') {
    const tag = document.createElement('span');
    tag.className = 'task-tag';
    tag.textContent = '已封存';
    head.appendChild(tag);
  }
  li.appendChild(head);

  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = `${t.tabs.length} 個分頁 · ${formatRelative(t.updatedAt)}`;
  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.textContent = t.status === 'archived' ? '恢復' : '補齊缺少分頁';
  resumeBtn.addEventListener('click', () => void onResume(t));
  actions.appendChild(resumeBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'ghost';
  delBtn.textContent = '刪除';
  delBtn.addEventListener('click', () => void onDelete(t));
  actions.appendChild(delBtn);

  li.appendChild(actions);
  return li;
}

async function onResume(t: Task): Promise<void> {
  setStatus(tasksStatusEl, `恢復中：${t.name}…`, 'info');
  const res = await send<ResumeTaskResponse>({ type: 'RESUME_TASK', taskId: t.id });
  if (res.ok) {
    setStatus(
      tasksStatusEl,
      `已恢復「${t.name}」：新開 ${res.openedCount} 個、沿用 ${res.reusedCount} 個分頁`,
      'success',
    );
    hideBannerFor(t.id);
    void loadTasks();
  } else {
    setStatus(tasksStatusEl, `錯誤：${res.error}`, 'error');
  }
}

async function onDelete(t: Task): Promise<void> {
  if (!confirm(`確定刪除任務「${t.name}」？`)) return;
  const res = await send<SimpleResponse>({ type: 'DELETE_TASK', taskId: t.id });
  if (res.ok) {
    hideBannerFor(t.id);
    void loadTasks();
  } else {
    setStatus(tasksStatusEl, `錯誤：${res.error}`, 'error');
  }
}

let bannerTaskId: string | undefined;

async function loadBanner(): Promise<void> {
  const res = await send<PendingResumeResponse>({ type: 'GET_PENDING_RESUME' });
  if (!res.ok || res.tasks.length === 0) {
    banner.hidden = true;
    return;
  }
  const task = res.tasks[0];
  bannerTaskId = task.id;
  bannerText.textContent = `恢復「${task.name}」研究？（${task.tabs.length} 個分頁）`;
  banner.hidden = false;
}

bannerBtn.addEventListener('click', async () => {
  if (!bannerTaskId) return;
  const id = bannerTaskId;
  const list = await send<ListTasksResponse>({ type: 'LIST_TASKS' });
  if (!list.ok) {
    setStatus(statusEl, `錯誤：${list.error}`, 'error');
    return;
  }
  const t = list.tasks.find((x) => x.id === id);
  if (!t) return;
  await onResume(t);
});

bannerDismiss.addEventListener('click', async () => {
  if (!bannerTaskId) return;
  await send<SimpleResponse>({ type: 'DISMISS_PENDING', taskId: bannerTaskId });
  banner.hidden = true;
  bannerTaskId = undefined;
});

function hideBannerFor(taskId: string): void {
  if (bannerTaskId === taskId) {
    banner.hidden = true;
    bannerTaskId = undefined;
  }
}

function setStatus(el: HTMLElement, text: string, kind: StatusKind): void {
  el.textContent = text;
  el.classList.remove(...STATUS_KINDS);
  if (kind !== 'info') el.classList.add(kind);
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.round(hr / 24);
  return `${day} 天前`;
}

void loadBanner();
