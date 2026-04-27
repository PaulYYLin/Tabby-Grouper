import '../fonts.css';
import { applyDomI18n, getLang, htmlLangFor, setLang, tFor, type Lang } from '../lib/i18n';
import {
  DEFAULT_DRAGGED_TAB_POLICY,
  isDraggedTabPolicy,
  type DraggedTabPolicy,
} from '../lib/tasks';

export {};

const form = document.getElementById('options-form') as HTMLFormElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const modelInput = document.getElementById('model') as HTMLInputElement;
const addPolicySelect = document.getElementById('add-policy') as HTMLSelectElement;
const removePolicySelect = document.getElementById('remove-policy') as HTMLSelectElement;
const saveStatus = document.getElementById('save-status') as HTMLParagraphElement;
const langToggle = document.getElementById('lang-toggle') as HTMLDivElement;
const langButtons = langToggle.querySelectorAll<HTMLButtonElement>('.lang-opt');

let savedTimer: number | undefined;

const stored = (await chrome.storage.sync.get([
  'apiKey',
  'model',
  'addDraggedTabPolicy',
  'removeDraggedTabPolicy',
  'lang',
])) as {
  apiKey?: string;
  model?: string;
  addDraggedTabPolicy?: unknown;
  removeDraggedTabPolicy?: unknown;
  lang?: unknown;
};

const coercePolicy = (v: unknown): DraggedTabPolicy =>
  isDraggedTabPolicy(v) ? v : DEFAULT_DRAGGED_TAB_POLICY;

if (stored.apiKey) apiKeyInput.value = stored.apiKey;
if (stored.model) modelInput.value = stored.model;
addPolicySelect.value = coercePolicy(stored.addDraggedTabPolicy);
removePolicySelect.value = coercePolicy(stored.removeDraggedTabPolicy);

let lang: Lang = await getLang();
let t = tFor(lang);

function applyI18n(): void {
  document.title = t('optionsTitle');
  document.documentElement.lang = htmlLangFor(lang);
  applyDomI18n(t);
  langButtons.forEach((b) => {
    const isActive = b.dataset.lang === lang;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}

applyI18n();

langButtons.forEach((b) => {
  b.addEventListener('click', async () => {
    const next = b.dataset.lang as Lang | undefined;
    if (!next || (next !== 'zh' && next !== 'en') || next === lang) return;
    lang = next;
    t = tFor(lang);
    await setLang(lang);
    applyI18n();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await chrome.storage.sync.set({
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    addDraggedTabPolicy: addPolicySelect.value as DraggedTabPolicy,
    removeDraggedTabPolicy: removePolicySelect.value as DraggedTabPolicy,
  });
  saveStatus.textContent = t('saved');
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    saveStatus.textContent = '';
    savedTimer = undefined;
  }, 2000);
});
