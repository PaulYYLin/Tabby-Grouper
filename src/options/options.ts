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
const addPolicySelect = document.getElementById('add-policy') as HTMLSelectElement;
const removePolicySelect = document.getElementById('remove-policy') as HTMLSelectElement;
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
  'lang',
])) as {
  provider?: unknown;
  apiKey?: unknown;
  model?: unknown;
  apiKeys?: unknown;
  models?: unknown;
  addDraggedTabPolicy?: unknown;
  removeDraggedTabPolicy?: unknown;
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
  });
  await chrome.storage.sync.remove(['apiKey', 'model']);
  saveStatus.textContent = t('saved');
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    saveStatus.textContent = '';
    savedTimer = undefined;
  }, 2000);
});
