import '../fonts.css';
import { applyDomI18n, getLang, htmlLangFor, onLangChange, tFor, type Lang } from '../lib/i18n';
import type {
  GroupTabsResponse,
  ListPendingAdditionsResponse,
  ListTasksResponse,
  Message,
  PendingAdditionView,
  ResumeTaskResponse,
  SimpleResponse,
} from '../lib/messages';
import {
  MAX_TASK_NAME_LEN,
  PENDING_ADDITIONS_KEY,
  type PendingKind,
  type Task,
} from '../lib/tasks';

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
const pendingSection = document.getElementById('pending-additions') as HTMLElement;
const pendingListEl = document.getElementById('pending-list') as HTMLUListElement;
const pendingCountEl = document.getElementById('pending-count') as HTMLSpanElement;
const pendingDontAskEl = document.getElementById('pending-dont-ask') as HTMLInputElement;

versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

let lang: Lang = await getLang();
let t = tFor(lang);
document.documentElement.lang = htmlLangFor(lang);

applyDomI18n(t);

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
  setStatus(statusEl, t('statusAnalyzing'), 'info');
  const instruction = instructionEl.value.trim();
  await chrome.storage.local.set({ [INSTRUCTION_KEY]: instruction });
  try {
    const res = await send<GroupTabsResponse>({
      type: 'GROUP_TABS',
      instruction: instruction || undefined,
    });
    if (res.ok) {
      setStatus(statusEl, t('statusGroupSuccess')(res.groupCount, res.groupedTabCount), 'success');
      void loadTasks();
    } else {
      setStatus(statusEl, t('statusError')(res.error), 'error');
    }
  } catch (err) {
    setStatus(statusEl, t('statusError')(err instanceof Error ? err.message : String(err)), 'error');
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
    setStatus(tasksStatusEl, t('statusError')(res.error), 'error');
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
        (task) =>
          task.name.toLowerCase().includes(query) ||
          (task.summary?.toLowerCase().includes(query) ?? false) ||
          task.tabs.some((tab) => tab.title.toLowerCase().includes(query)),
      )
    : allTasks;

  taskListEl.replaceChildren();
  tasksCountEl.hidden = false;
  tasksCountEl.textContent = query
    ? t('countFiltered')(filtered.length, allTasks.length)
    : t('countAll')(allTasks.length);
  tasksNoMatchEl.hidden = filtered.length > 0;

  for (const task of filtered) {
    taskListEl.appendChild(renderTask(task));
  }
}

taskSearchEl.addEventListener('input', renderTaskList);

function renderTask(task: Task): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `task-row task-row--${task.color}`;
  li.dataset.taskId = task.id;

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'task-head';
  head.setAttribute('aria-expanded', 'false');

  const openBtn = document.createElement('span');
  openBtn.setAttribute('role', 'button');
  openBtn.tabIndex = 0;
  openBtn.className = 'icon-btn task-open';
  const openLabel = task.status === 'archived' ? t('taskOpenArchived') : t('taskOpenLive');
  openBtn.setAttribute('aria-label', openLabel);
  openBtn.title = openLabel;
  openBtn.innerHTML = OPEN_ICON_SVG;
  const handleOpen = (e: Event) => {
    e.stopPropagation();
    void onResume(task);
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
  dot.className = `task-dot task-dot--${task.color}`;
  head.appendChild(dot);

  head.appendChild(renderName(task));

  if (task.status === 'archived') {
    const tag = document.createElement('span');
    tag.className = 'task-tag';
    tag.textContent = t('taskArchivedTag');
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

  body.appendChild(renderSummary(task));

  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = t('taskMeta')(task.tabs.length, formatRelative(task.updatedAt));
  body.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.textContent = task.status === 'archived' ? t('taskResumeArchived') : t('taskResume');
  resumeBtn.addEventListener('click', () => void onResume(task));
  actions.appendChild(resumeBtn);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'icon-btn';
  copyBtn.setAttribute('aria-label', t('taskCopyLabel'));
  copyBtn.title = t('taskCopyTitle');
  copyBtn.innerHTML = COPY_ICON_SVG;
  copyBtn.addEventListener('click', () => void onCopy(task, copyBtn));
  actions.appendChild(copyBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'icon-btn icon-btn--danger';
  delBtn.setAttribute('aria-label', t('taskDeleteLabel'));
  delBtn.title = t('taskDeleteTitle');
  delBtn.innerHTML = TRASH_ICON_SVG;
  delBtn.addEventListener('click', () => void onDelete(task));
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

function renderName(task: Task): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'task-name-wrap';

  const name = document.createElement('span');
  name.className = 'task-name';
  name.textContent = task.name;
  wrap.appendChild(name);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'icon-btn task-name-edit';
  editBtn.setAttribute('aria-label', t('taskNameEditLabel'));
  editBtn.title = t('taskNameEditLabel');
  editBtn.innerHTML = EDIT_ICON_SVG;
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    enterNameEdit(task, wrap);
  });
  wrap.appendChild(editBtn);

  return wrap;
}

function enterNameEdit(task: Task, wrap: HTMLElement): void {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-name-input';
  input.maxLength = MAX_TASK_NAME_LEN;
  input.value = task.name;
  input.addEventListener('click', (e) => e.stopPropagation());

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'icon-btn icon-btn--primary task-name-save';
  save.setAttribute('aria-label', t('taskNameSaveLabel'));
  save.title = t('taskNameSaveTitle');
  save.innerHTML = CHECK_ICON_SVG;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'icon-btn task-name-cancel';
  cancel.setAttribute('aria-label', t('taskNameCancelLabel'));
  cancel.title = t('taskNameCancelTitle');
  cancel.innerHTML = CLOSE_ICON_SVG;

  const exitEdit = () => {
    wrap.replaceWith(renderName(task));
  };

  const submit = async () => {
    const next = input.value.trim();
    if (!next || next === task.name) {
      exitEdit();
      return;
    }
    save.disabled = true;
    cancel.disabled = true;
    input.disabled = true;
    const res = await send<SimpleResponse>({
      type: 'UPDATE_TASK_NAME',
      taskId: task.id,
      name: next,
    });
    if (res.ok) {
      void loadTasks();
    } else {
      save.disabled = false;
      cancel.disabled = false;
      input.disabled = false;
      setStatus(tasksStatusEl, t('statusError')(res.error), 'error');
    }
  };

  save.addEventListener('click', (e) => {
    e.stopPropagation();
    void submit();
  });
  cancel.addEventListener('click', (e) => {
    e.stopPropagation();
    exitEdit();
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitEdit();
    }
  });

  wrap.replaceChildren(input, save, cancel);
  input.focus();
  input.select();
}

function renderSummary(task: Task): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'task-summary';

  const enterEdit = () => {
    wrap.replaceChildren(...renderSummaryEditor(task, wrap));
    wrap.querySelector('textarea')?.focus();
  };

  const view = document.createElement('p');
  view.className = 'task-summary-text';
  if (task.summary) {
    view.textContent = task.summary;
  } else {
    view.classList.add('is-empty');
    view.textContent = t('summaryEmpty');
    view.addEventListener('click', enterEdit);
  }

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'task-summary-edit icon-btn';
  const label = task.summary ? t('summaryEditLabel') : t('summaryAddLabel');
  editBtn.setAttribute('aria-label', label);
  editBtn.title = label;
  editBtn.innerHTML = task.summary ? EDIT_ICON_SVG : PLUS_ICON_SVG;
  editBtn.addEventListener('click', enterEdit);

  wrap.append(view, editBtn);
  return wrap;
}

function renderSummaryEditor(task: Task, wrap: HTMLElement): HTMLElement[] {
  const ta = document.createElement('textarea');
  ta.className = 'task-summary-input';
  ta.rows = 3;
  ta.maxLength = 500;
  ta.value = task.summary ?? '';

  const row = document.createElement('div');
  row.className = 'task-summary-actions';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'icon-btn icon-btn--primary';
  save.setAttribute('aria-label', t('summarySaveLabel'));
  save.title = t('summarySaveTitle');
  save.innerHTML = CHECK_ICON_SVG;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'icon-btn';
  cancel.setAttribute('aria-label', t('summaryCancelLabel'));
  cancel.title = t('summaryCancelTitle');
  cancel.innerHTML = CLOSE_ICON_SVG;

  save.addEventListener('click', async () => {
    save.disabled = true;
    cancel.disabled = true;
    const next = ta.value.trim();
    const res = await send<SimpleResponse>({
      type: 'UPDATE_TASK_SUMMARY',
      taskId: task.id,
      summary: next,
    });
    if (res.ok) {
      void loadTasks();
    } else {
      save.disabled = false;
      cancel.disabled = false;
      setStatus(tasksStatusEl, t('statusError')(res.error), 'error');
    }
  });

  cancel.addEventListener('click', () => {
    wrap.replaceWith(renderSummary(task));
  });

  row.append(save, cancel);
  return [ta, row];
}

async function onResume(task: Task): Promise<void> {
  setStatus(tasksStatusEl, t('statusResuming')(task.name), 'info');
  const res = await send<ResumeTaskResponse>({ type: 'RESUME_TASK', taskId: task.id });
  if (res.ok) {
    setStatus(
      tasksStatusEl,
      t('statusResumed')(task.name, res.openedCount, res.reusedCount),
      'success',
    );
    void loadTasks();
  } else {
    setStatus(tasksStatusEl, t('statusError')(res.error), 'error');
  }
}

function formatTaskForCopy(task: Task): string {
  const lines: string[] = [`# ${task.name}`];
  if (task.summary) lines.push('', task.summary);
  if (task.tabs.length > 0) {
    lines.push('');
    for (const tab of task.tabs) {
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

async function onCopy(task: Task, btn: HTMLElement): Promise<void> {
  const text = formatTaskForCopy(task);
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = CHECK_ICON_SVG;
    btn.classList.add('is-copied');
    setStatus(tasksStatusEl, t('statusCopied')(task.name, task.tabs.length), 'success');
  } catch (err) {
    setStatus(
      tasksStatusEl,
      t('statusCopyFailed')(err instanceof Error ? err.message : String(err)),
      'error',
    );
    return;
  }
  setTimeout(() => {
    btn.innerHTML = COPY_ICON_SVG;
    btn.classList.remove('is-copied');
  }, 1500);
}

async function onDelete(task: Task): Promise<void> {
  if (!confirm(t('confirmDelete')(task.name))) return;
  const res = await send<SimpleResponse>({ type: 'DELETE_TASK', taskId: task.id });
  if (res.ok) {
    void loadTasks();
  } else {
    setStatus(tasksStatusEl, t('statusError')(res.error), 'error');
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
  if (min < 1) return t('relJustNow');
  if (min < 60) return t('relMinutes')(min);
  const hr = Math.round(min / 60);
  if (hr < 24) return t('relHours')(hr);
  const day = Math.round(hr / 24);
  return t('relDays')(day);
}

async function loadPendingAdditions(): Promise<void> {
  const res = await send<ListPendingAdditionsResponse>({ type: 'LIST_PENDING_ADDITIONS' });
  if (!res.ok || res.pending.length === 0) {
    pendingSection.hidden = true;
    pendingListEl.replaceChildren();
    pendingDontAskEl.checked = false;
    return;
  }
  pendingSection.hidden = false;
  pendingCountEl.textContent = t('countAll')(res.pending.length);
  pendingListEl.replaceChildren(...res.pending.map(renderPendingItem));
}

function renderPendingItem(p: PendingAdditionView): HTMLLIElement {
  const isAdd = p.kind === 'add';
  const li = document.createElement('li');
  li.className = `pending-item pending-item--${p.kind}`;
  li.dataset.id = p.id;

  const info = document.createElement('div');
  info.className = 'pending-info';

  const titleEl = document.createElement('p');
  titleEl.className = 'pending-tab-title';
  const kindBadge = document.createElement('span');
  kindBadge.className = `pending-kind pending-kind--${p.kind}`;
  kindBadge.textContent = isAdd ? t('pendingKindAdd') : t('pendingKindRemove');
  titleEl.append(kindBadge, ' ', p.title || p.url);
  titleEl.title = p.title || p.url;
  info.appendChild(titleEl);

  const meta = document.createElement('p');
  meta.className = 'pending-meta';
  const dot = document.createElement('span');
  dot.className = `task-dot task-dot--${p.taskColor}`;
  meta.appendChild(dot);
  const taskNameEl = document.createElement('span');
  taskNameEl.textContent = p.taskName;
  meta.appendChild(taskNameEl);
  info.appendChild(meta);

  li.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'pending-actions';

  const yesBtn = document.createElement('button');
  yesBtn.type = 'button';
  yesBtn.textContent = isAdd ? t('pendingActionAddYes') : t('pendingActionRemoveYes');
  yesBtn.addEventListener('click', () => void onResolvePending(p.kind, p.id, true));
  actions.appendChild(yesBtn);

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.className = 'ghost';
  noBtn.textContent = isAdd ? t('pendingActionAddNo') : t('pendingActionRemoveNo');
  noBtn.addEventListener('click', () => void onResolvePending(p.kind, p.id, false));
  actions.appendChild(noBtn);

  li.appendChild(actions);
  return li;
}

function rememberMessage(kind: PendingKind, confirm: boolean): string {
  if (kind === 'add') return confirm ? t('pendingRememberAddYes') : t('pendingRememberAddNo');
  return confirm ? t('pendingRememberRemoveYes') : t('pendingRememberRemoveNo');
}

async function onResolvePending(
  kind: PendingKind,
  id: string,
  confirm: boolean,
): Promise<void> {
  const dontAskAgain = pendingDontAskEl.checked;
  const res = await send<SimpleResponse>({
    type: 'RESOLVE_PENDING_ADDITION',
    id,
    confirm,
    dontAskAgain,
  });
  if (!res.ok) {
    setStatus(statusEl, t('statusError')(res.error), 'error');
    return;
  }
  pendingDontAskEl.checked = false;
  if (dontAskAgain) {
    setStatus(statusEl, rememberMessage(kind, confirm), 'success');
  }
}

onLangChange((next) => {
  lang = next;
  t = tFor(lang);
  document.documentElement.lang = htmlLangFor(lang);
  applyDomI18n(t);
  void Promise.all([loadTasks(), loadPendingAdditions()]);
});

void loadPendingAdditions();

chrome.storage.session.onChanged.addListener((changes) => {
  if (PENDING_ADDITIONS_KEY in changes) {
    void loadPendingAdditions();
  }
});
