import '../fonts.css';
import { applyDomI18n, getLang, htmlLangFor, setLang, tFor, type Lang } from '../lib/i18n';
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  coerceProviderRecord,
  isProvider,
  type Provider,
  type ProviderRecord,
} from '../lib/openrouter';
import {
  DEFAULT_DRAGGED_TAB_POLICY,
  isDraggedTabPolicy,
  type DraggedTabPolicy,
} from '../lib/tasks';

export {};

const form = document.getElementById('options-form') as HTMLFormElement;
const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const apiKeyLink = document.getElementById('api-key-link') as HTMLAnchorElement;
const modelInput = document.getElementById('model') as HTMLInputElement;
const modelHintBefore = document.getElementById('model-hint-before') as HTMLSpanElement;
const modelsLink = document.getElementById('models-link') as HTMLAnchorElement;
const modelExample = document.getElementById('model-example') as HTMLElement;
const modelFormatHint = document.getElementById('model-format-hint') as HTMLParagraphElement;
const addPolicySelect = document.getElementById('add-policy') as HTMLSelectElement;
const removePolicySelect = document.getElementById('remove-policy') as HTMLSelectElement;
const userPrefsEnabledInput = document.getElementById(
  'user-prefs-enabled',
) as HTMLInputElement;
const userPrefsInfoBtn = document.getElementById('user-prefs-info-btn') as HTMLButtonElement;
const userPrefsInfoTip = document.getElementById('user-prefs-info-tip') as HTMLDivElement;
const saveStatus = document.getElementById('save-status') as HTMLParagraphElement;
const langToggle = document.getElementById('lang-toggle') as HTMLDivElement;
const langButtons = langToggle.querySelectorAll<HTMLButtonElement>('.lang-opt');

let savedTimer: number | undefined;

const stored = (await chrome.storage.sync.get([
  'provider',
  'apiKey',
  'model',
  'apiKeys',
  'models',
  'addDraggedTabPolicy',
  'removeDraggedTabPolicy',
  'userPrefsEnabled',
  'lang',
])) as {
  provider?: unknown;
  apiKey?: unknown;
  model?: unknown;
  apiKeys?: unknown;
  models?: unknown;
  addDraggedTabPolicy?: unknown;
  removeDraggedTabPolicy?: unknown;
  userPrefsEnabled?: unknown;
  lang?: unknown;
};

const coercePolicy = (v: unknown): DraggedTabPolicy =>
  isDraggedTabPolicy(v) ? v : DEFAULT_DRAGGED_TAB_POLICY;

let provider: Provider = isProvider(stored.provider) ? stored.provider : DEFAULT_PROVIDER;
const apiKeys: ProviderRecord = coerceProviderRecord(stored.apiKeys, stored.apiKey);
const models: ProviderRecord = coerceProviderRecord(stored.models, stored.model);

providerSelect.value = provider;
apiKeyInput.value = apiKeys[provider];
modelInput.value = models[provider];
addPolicySelect.value = coercePolicy(stored.addDraggedTabPolicy);
removePolicySelect.value = coercePolicy(stored.removeDraggedTabPolicy);
userPrefsEnabledInput.checked = stored.userPrefsEnabled === true;

let lang: Lang = await getLang();
let t = tFor(lang);

function applyProviderHints(): void {
  const info = PROVIDERS[provider];
  apiKeyInput.placeholder = info.apiKeyPlaceholder;
  apiKeyLink.href = info.keysUrl;
  apiKeyLink.textContent = info.keysUrl.replace(/^https?:\/\//, '');
  modelInput.placeholder = info.modelPlaceholder;
  modelHintBefore.textContent = t('modelHintBefore')(info.defaultModel);
  modelsLink.href = info.modelsUrl;
  modelsLink.textContent = info.modelsLinkText;
  modelExample.textContent = info.exampleModel;
  modelFormatHint.hidden = provider === 'openrouter';
}

function applyI18n(): void {
  document.title = t('optionsTitle');
  document.documentElement.lang = htmlLangFor(lang);
  applyDomI18n(t);
  applyProviderHints();
  langButtons.forEach((b) => {
    const isActive = b.dataset.lang === lang;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}

applyI18n();

providerSelect.addEventListener('change', () => {
  const next = providerSelect.value;
  if (!isProvider(next) || next === provider) return;
  apiKeys[provider] = apiKeyInput.value.trim();
  models[provider] = modelInput.value.trim();
  provider = next;
  apiKeyInput.value = apiKeys[provider];
  modelInput.value = models[provider];
  applyProviderHints();
});

function setUserPrefsTooltipOpen(open: boolean): void {
  userPrefsInfoTip.hidden = !open;
  userPrefsInfoBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

userPrefsInfoBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setUserPrefsTooltipOpen(userPrefsInfoTip.hidden);
});

document.addEventListener('click', (e) => {
  if (userPrefsInfoTip.hidden) return;
  const target = e.target as Node | null;
  if (target && (userPrefsInfoTip.contains(target) || userPrefsInfoBtn.contains(target))) return;
  setUserPrefsTooltipOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !userPrefsInfoTip.hidden) {
    setUserPrefsTooltipOpen(false);
    userPrefsInfoBtn.focus();
  }
});

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
  apiKeys[provider] = apiKeyInput.value.trim();
  models[provider] = modelInput.value.trim();
  await chrome.storage.sync.set({
    provider,
    apiKeys,
    models,
    addDraggedTabPolicy: addPolicySelect.value as DraggedTabPolicy,
    removeDraggedTabPolicy: removePolicySelect.value as DraggedTabPolicy,
    userPrefsEnabled: userPrefsEnabledInput.checked,
  });
  await chrome.storage.sync.remove(['apiKey', 'model']);
  saveStatus.textContent = t('saved');
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    saveStatus.textContent = '';
    savedTimer = undefined;
  }, 2000);
});
