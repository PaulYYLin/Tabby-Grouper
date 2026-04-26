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
const tasksCountEl = document.getElementById('tasks-count') as HTMLSpanElement;
const taskSearchEl = document.getElementById('task-search') as HTMLInputElement;
const tasksNoMatchEl = document.getElementById('tasks-no-match') as HTMLParagraphElement;
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

let allTasks: Task[] = [];

async function loadTasks(): Promise<void> {
  taskListEl.replaceChildren();
  setStatus(tasksStatusEl, '', 'info');
  const res = await send<ListTasksResponse>({ type: 'LIST_TASKS' });
  if (!res.ok) {
    setStatus(tasksStatusEl, `錯誤：${res.error}`, 'error');
    return;
  }
  allTasks = res.tasks;
  if (allTasks.length === 0) {
    tasksEmptyEl.hidden = false;
    tasksCountEl.hidden = true;
    taskSearchEl.hidden = true;
    tasksNoMatchEl.hidden = true;
    return;
  }
  tasksEmptyEl.hidden = true;
  taskSearchEl.hidden = false;
  renderTaskList();
}

function renderTaskList(): void {
  const query = taskSearchEl.value.trim().toLowerCase();
  const filtered = query
    ? allTasks.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.summary?.toLowerCase().includes(query) ?? false) ||
          t.tabs.some((tab) => tab.title.toLowerCase().includes(query)),
      )
    : allTasks;

  taskListEl.replaceChildren();
  tasksCountEl.hidden = false;
  tasksCountEl.textContent = query
    ? `${filtered.length}/${allTasks.length} 個`
    : `${allTasks.length} 個`;
  tasksNoMatchEl.hidden = filtered.length > 0;

  for (const t of filtered) {
    taskListEl.appendChild(renderTask(t));
  }
}

taskSearchEl.addEventListener('input', renderTaskList);

function renderTask(t: Task): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `task-row task-row--${t.color}`;
  li.dataset.taskId = t.id;

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'task-head';
  head.setAttribute('aria-expanded', 'false');

  const openBtn = document.createElement('span');
  openBtn.setAttribute('role', 'button');
  openBtn.tabIndex = 0;
  openBtn.className = 'icon-btn task-open';
  const openLabel = t.status === 'archived' ? '恢復並開啟分頁' : '開啟群組分頁';
  openBtn.setAttribute('aria-label', openLabel);
  openBtn.title = openLabel;
  openBtn.innerHTML = OPEN_ICON_SVG;
  const handleOpen = (e: Event) => {
    e.stopPropagation();
    void onResume(t);
  };
  openBtn.addEventListener('click', handleOpen);
  openBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen(e);
    }
  });
  head.appendChild(openBtn);

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

  const chevron = document.createElement('span');
  chevron.className = 'task-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = CHEVRON_ICON_SVG;
  head.appendChild(chevron);

  li.appendChild(head);

  const body = document.createElement('div');
  body.className = 'task-body';
  body.hidden = true;

  body.appendChild(renderSummary(t));

  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = `${t.tabs.length} 個分頁 · ${formatRelative(t.updatedAt)}`;
  body.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.textContent = t.status === 'archived' ? '恢復' : '補齊缺少分頁';
  resumeBtn.addEventListener('click', () => void onResume(t));
  actions.appendChild(resumeBtn);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'icon-btn';
  copyBtn.setAttribute('aria-label', '複製任務內容');
  copyBtn.title = '複製任務（敘述 + 分頁連結）';
  copyBtn.innerHTML = COPY_ICON_SVG;
  copyBtn.addEventListener('click', () => void onCopy(t, copyBtn));
  actions.appendChild(copyBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'icon-btn icon-btn--danger';
  delBtn.setAttribute('aria-label', '刪除任務');
  delBtn.title = '刪除任務';
  delBtn.innerHTML = TRASH_ICON_SVG;
  delBtn.addEventListener('click', () => void onDelete(t));
  actions.appendChild(delBtn);

  body.appendChild(actions);
  li.appendChild(body);

  head.addEventListener('click', () => {
    const expanded = li.classList.toggle('is-expanded');
    body.hidden = !expanded;
    head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });

  return li;
}

function renderSummary(t: Task): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'task-summary';

  const enterEdit = () => {
    wrap.replaceChildren(...renderSummaryEditor(t, wrap));
    wrap.querySelector('textarea')?.focus();
  };

  const view = document.createElement('p');
  view.className = 'task-summary-text';
  if (t.summary) {
    view.textContent = t.summary;
  } else {
    view.classList.add('is-empty');
    view.textContent = '（尚無敘述，點此新增）';
    view.addEventListener('click', enterEdit);
  }

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'task-summary-edit icon-btn';
  editBtn.setAttribute('aria-label', t.summary ? '編輯敘述' : '新增敘述');
  editBtn.title = t.summary ? '編輯敘述' : '新增敘述';
  editBtn.innerHTML = t.summary ? EDIT_ICON_SVG : PLUS_ICON_SVG;
  editBtn.addEventListener('click', enterEdit);

  wrap.append(view, editBtn);
  return wrap;
}

function renderSummaryEditor(t: Task, wrap: HTMLElement): HTMLElement[] {
  const ta = document.createElement('textarea');
  ta.className = 'task-summary-input';
  ta.rows = 3;
  ta.maxLength = 500;
  ta.value = t.summary ?? '';

  const row = document.createElement('div');
  row.className = 'task-summary-actions';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'icon-btn icon-btn--primary';
  save.setAttribute('aria-label', '儲存敘述');
  save.title = '儲存';
  save.innerHTML = CHECK_ICON_SVG;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'icon-btn';
  cancel.setAttribute('aria-label', '取消編輯');
  cancel.title = '取消';
  cancel.innerHTML = CLOSE_ICON_SVG;

  save.addEventListener('click', async () => {
    save.disabled = true;
    cancel.disabled = true;
    const next = ta.value.trim();
    const res = await send<SimpleResponse>({
      type: 'UPDATE_TASK_SUMMARY',
      taskId: t.id,
      summary: next,
    });
    if (res.ok) {
      void loadTasks();
    } else {
      save.disabled = false;
      cancel.disabled = false;
      setStatus(tasksStatusEl, `錯誤：${res.error}`, 'error');
    }
  });

  cancel.addEventListener('click', () => {
    wrap.replaceWith(renderSummary(t));
  });

  row.append(save, cancel);
  return [ta, row];
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

function formatTaskForCopy(t: Task): string {
  const lines: string[] = [`# ${t.name}`];
  if (t.summary) lines.push('', t.summary);
  if (t.tabs.length > 0) {
    lines.push('');
    for (const tab of t.tabs) {
      lines.push(`- [${tab.title}](${tab.url})`);
    }
  }
  return lines.join('\n');
}

const COPY_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>';
const CHECK_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5"/></svg>';
const EDIT_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z"/></svg>';
const PLUS_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9"/></svg>';
const CLOSE_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const TRASH_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8M7 7v4M9 7v4"/></svg>';
const CHEVRON_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
const OPEN_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h4v4M13 3l-6 6M12.5 9.5V12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V5A1.5 1.5 0 0 1 4 3.5h2.5"/></svg>';

async function onCopy(t: Task, btn: HTMLElement): Promise<void> {
  const text = formatTaskForCopy(t);
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = CHECK_ICON_SVG;
    btn.classList.add('is-copied');
    setStatus(tasksStatusEl, `已複製「${t.name}」（${t.tabs.length} 個分頁）`, 'success');
  } catch (err) {
    setStatus(
      tasksStatusEl,
      `複製失敗：${err instanceof Error ? err.message : String(err)}`,
      'error',
    );
    return;
  }
  setTimeout(() => {
    btn.innerHTML = COPY_ICON_SVG;
    btn.classList.remove('is-copied');
  }, 1500);
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
