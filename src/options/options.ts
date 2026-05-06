import '../fonts.css';
import {
  applyDomI18n,
  formatRelative,
  getLang,
  htmlLangFor,
  setLang,
  tFor,
  type Lang,
} from '../lib/i18n';
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  coerceProviderRecord,
  isProvider,
  validateApiKey,
  type Provider,
  type ProviderRecord,
} from '../lib/openrouter';
import {
  DEFAULT_DRAGGED_TAB_POLICY,
  isDraggedTabPolicy,
  type DraggedTabPolicy,
} from '../lib/tasks';
import { MAX_HINTS_LEN, type MemoryField } from '../lib/userPrefs';
import type {
  MemoryView,
  GetMemoryResponse,
  Message,
  SimpleResponse,
} from '../lib/messages';

export {};

const form = document.getElementById('options-form') as HTMLFormElement;
const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const apiKeyLink = document.getElementById('api-key-link') as HTMLAnchorElement;
const apiKeyTestBtn = document.getElementById('api-key-test') as HTMLButtonElement;
const apiKeyValidationEl = document.getElementById(
  'api-key-validation',
) as HTMLParagraphElement;
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

const memorySection = document.getElementById('memory-section') as HTMLElement;
const memoryDistilledText = document.getElementById(
  'memory-distilled-text',
) as HTMLTextAreaElement;
const memoryDistilledUpdated = document.getElementById(
  'memory-distilled-updated',
) as HTMLSpanElement;
const memoryDistilledCharCount = document.getElementById(
  'memory-distilled-charcount',
) as HTMLSpanElement;
const memoryDistilledLangMismatch = document.getElementById(
  'memory-distilled-lang-mismatch',
) as HTMLParagraphElement;
const memoryDistilledSaveBtn = document.getElementById(
  'memory-distilled-save',
) as HTMLButtonElement;
const memoryPausedBanner = document.getElementById(
  'memory-paused-banner',
) as HTMLDivElement;
const memoryAutoLearnIdle = document.getElementById(
  'memory-autolearn-idle',
) as HTMLParagraphElement;
const memoryRunAutoLearnBtn = document.getElementById(
  'memory-run-autolearn',
) as HTMLButtonElement;
const memorySamplesCount = document.getElementById(
  'memory-samples-count',
) as HTMLSpanElement;
const memoryStatus = document.getElementById('memory-status') as HTMLParagraphElement;
const memoryClearAllBtn = document.getElementById('memory-clear-all') as HTMLButtonElement;
const memoryBucketLists: Record<MemoryField, HTMLUListElement> = {
  userNames: document.getElementById('memory-list-userNames') as HTMLUListElement,
  aiNames: document.getElementById('memory-list-aiNames') as HTMLUListElement,
  instructions: document.getElementById('memory-list-instructions') as HTMLUListElement,
};
const memoryClearBucketBtns: Record<MemoryField, HTMLButtonElement> = {
  userNames: document.getElementById('memory-clear-bucket-userNames') as HTMLButtonElement,
  aiNames: document.getElementById('memory-clear-bucket-aiNames') as HTMLButtonElement,
  instructions: document.getElementById('memory-clear-bucket-instructions') as HTMLButtonElement,
};
const MEMORY_BUCKET_LABEL_KEY: Record<
  MemoryField,
  'memoryBucketUserNames' | 'memoryBucketAiNames' | 'memoryBucketInstructions'
> = {
  userNames: 'memoryBucketUserNames',
  aiNames: 'memoryBucketAiNames',
  instructions: 'memoryBucketInstructions',
};
const MEMORY_FIELDS: readonly MemoryField[] = ['userNames', 'aiNames', 'instructions'];

let savedTimer: number | undefined;
let memoryStatusTimer: number | undefined;
let currentMemory: MemoryView | null = null;

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

function syncMemoryVisibility(): void {
  memorySection.hidden = !userPrefsEnabledInput.checked;
}
syncMemoryVisibility();
userPrefsEnabledInput.addEventListener('change', syncMemoryVisibility);

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
  resetApiKeyValidation();
});

type ValidationStatusKind = 'ok' | 'err' | 'info';
type FieldHighlight = 'key' | 'model' | 'both';

let lastValidatedKey = '';
let lastValidatedModel = '';
let lastValidatedProvider: Provider | null = null;

function clearFieldHighlight(): void {
  for (const el of [apiKeyInput, modelInput]) {
    el.classList.remove('is-valid', 'is-invalid');
  }
}

function setFieldHighlight(target: FieldHighlight, kind: 'valid' | 'invalid'): void {
  clearFieldHighlight();
  const cls = kind === 'valid' ? 'is-valid' : 'is-invalid';
  if (target === 'key' || target === 'both') apiKeyInput.classList.add(cls);
  if (target === 'model' || target === 'both') modelInput.classList.add(cls);
}

function setValidationMessage(text: string, kind: ValidationStatusKind): void {
  apiKeyValidationEl.hidden = false;
  apiKeyValidationEl.textContent = text;
  apiKeyValidationEl.classList.remove('is-ok', 'is-err', 'is-info');
  apiKeyValidationEl.classList.add(`is-${kind}`);
}

function resetApiKeyValidation(): void {
  apiKeyValidationEl.hidden = true;
  apiKeyValidationEl.textContent = '';
  apiKeyValidationEl.classList.remove('is-ok', 'is-err', 'is-info');
  clearFieldHighlight();
  lastValidatedKey = '';
  lastValidatedModel = '';
  lastValidatedProvider = null;
}

async function runApiKeyValidation(): Promise<void> {
  const key = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  if (!key) {
    setValidationMessage(t('apiKeyTestEmpty'), 'err');
    setFieldHighlight('key', 'invalid');
    return;
  }
  apiKeyTestBtn.disabled = true;
  setValidationMessage(t('apiKeyTesting'), 'info');
  clearFieldHighlight();
  const targetProvider = provider;
  try {
    const r = await validateApiKey(targetProvider, key, model);
    if (
      targetProvider !== provider ||
      apiKeyInput.value.trim() !== key ||
      modelInput.value.trim() !== model
    ) {
      // user changed something while the request was in-flight; bail
      return;
    }
    if (r.ok) {
      setValidationMessage(
        r.kind === 'rate_limited' ? t('apiKeyTestRateLimited') : t('apiKeyTestOk'),
        'ok',
      );
      setFieldHighlight(model ? 'both' : 'key', 'valid');
      lastValidatedKey = key;
      lastValidatedModel = model;
      lastValidatedProvider = targetProvider;
      return;
    }
    switch (r.kind) {
      case 'invalid':
        setValidationMessage(t('apiKeyTestInvalid'), 'err');
        setFieldHighlight('key', 'invalid');
        break;
      case 'forbidden':
        setValidationMessage(t('apiKeyTestForbidden'), 'err');
        setFieldHighlight('key', 'invalid');
        break;
      case 'model_not_found':
        setValidationMessage(t('apiKeyTestModelNotFound'), 'err');
        setFieldHighlight('model', 'invalid');
        break;
      case 'network':
        setValidationMessage(t('apiKeyTestNetwork')(r.body ?? ''), 'err');
        clearFieldHighlight();
        break;
      case 'empty':
        setValidationMessage(t('apiKeyTestEmpty'), 'err');
        setFieldHighlight('key', 'invalid');
        break;
      case 'other':
        setValidationMessage(t('apiKeyTestStatus')(r.status ?? 0, r.body ?? ''), 'err');
        setFieldHighlight('key', 'invalid');
        break;
    }
  } finally {
    apiKeyTestBtn.disabled = false;
  }
}

apiKeyTestBtn.addEventListener('click', () => {
  void runApiKeyValidation();
});

function isAlreadyValidated(): boolean {
  return (
    apiKeyInput.value.trim() === lastValidatedKey &&
    modelInput.value.trim() === lastValidatedModel &&
    provider === lastValidatedProvider
  );
}

for (const el of [apiKeyInput, modelInput]) {
  el.addEventListener('input', () => {
    if (isAlreadyValidated()) return;
    resetApiKeyValidation();
  });
}

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
    if (currentMemory) renderMemory(currentMemory);
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

function send<R>(msg: Message): Promise<R> {
  return chrome.runtime.sendMessage(msg) as Promise<R>;
}

function langLabel(l: Lang | ''): string {
  return l === '' ? '' : t(l === 'zh' ? 'langZh' : 'langEn');
}

function showMemoryStatus(text: string, kind: 'ok' | 'err' = 'ok'): void {
  memoryStatus.textContent = text;
  memoryStatus.style.color = kind === 'err' ? 'var(--danger)' : 'var(--brand)';
  if (memoryStatusTimer !== undefined) clearTimeout(memoryStatusTimer);
  memoryStatusTimer = window.setTimeout(() => {
    memoryStatus.textContent = '';
    memoryStatusTimer = undefined;
  }, 3000);
}

function renderMemoryBucket(field: MemoryField, items: string[]): void {
  const ul = memoryBucketLists[field];
  ul.replaceChildren();
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'memory-bucket-empty hint';
    li.textContent = t('memoryBucketEmpty');
    ul.appendChild(li);
    return;
  }
  for (const value of items) {
    const li = document.createElement('li');
    li.className = 'memory-bucket-item';
    const span = document.createElement('span');
    span.className = 'memory-bucket-item-text';
    span.textContent = value;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'memory-sample-delete';
    del.textContent = '✕';
    del.setAttribute('aria-label', t('memorySampleDeleteLabel'));
    del.title = t('memorySampleDeleteLabel');
    del.addEventListener('click', () => {
      void handleRemoveSample(field, value);
    });
    li.appendChild(span);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

function renderMemory(memory: MemoryView): void {
  currentMemory = memory;

  if (memoryDistilledText.value !== memory.distilled) {
    memoryDistilledText.value = memory.distilled;
  }
  updateCharCount();

  if (memory.distilledAt > 0) {
    memoryDistilledUpdated.textContent = t('memoryDistilledMetaUpdated')(
      formatRelative(t, memory.distilledAt),
    );
  } else {
    memoryDistilledUpdated.textContent = t('memoryDistilledMetaEmpty');
  }

  const langMismatch = memory.distilledLang !== '' && memory.distilledLang !== lang;
  if (langMismatch) {
    memoryDistilledLangMismatch.hidden = false;
    memoryDistilledLangMismatch.textContent = t('memoryDistilledLangMismatch')(
      langLabel(memory.distilledLang),
      langLabel(lang),
    );
  } else {
    memoryDistilledLangMismatch.hidden = true;
    memoryDistilledLangMismatch.textContent = '';
  }

  memoryPausedBanner.hidden = !memory.autoLearnPaused;
  memoryAutoLearnIdle.hidden = memory.autoLearnPaused;

  const total =
    memory.userNames.length + memory.aiNames.length + memory.instructions.length;
  memorySamplesCount.textContent = t('memorySamplesCount')(total);

  renderMemoryBucket('userNames', memory.userNames);
  renderMemoryBucket('aiNames', memory.aiNames);
  renderMemoryBucket('instructions', memory.instructions);

  for (const f of MEMORY_FIELDS) {
    memoryClearBucketBtns[f].hidden = memory[f].length === 0;
  }

  memoryClearAllBtn.hidden = total === 0 && !memory.distilled;
}

function updateCharCount(): void {
  const n = memoryDistilledText.value.length;
  memoryDistilledCharCount.textContent = t('memoryDistilledCharCount')(n, MAX_HINTS_LEN);
}

async function loadMemory(): Promise<void> {
  const res = await send<GetMemoryResponse>({ type: 'GET_MEMORY' });
  if (!res.ok) return;
  renderMemory(res.memory);
}

memoryDistilledText.addEventListener('input', updateCharCount);

memoryDistilledSaveBtn.addEventListener('click', async () => {
  memoryDistilledSaveBtn.disabled = true;
  try {
    const res = await send<SimpleResponse>({
      type: 'UPDATE_DISTILLED',
      text: memoryDistilledText.value,
    });
    if (res.ok) {
      showMemoryStatus(t('memorySaved'));
      await loadMemory();
    } else {
      showMemoryStatus(res.error, 'err');
    }
  } finally {
    memoryDistilledSaveBtn.disabled = false;
  }
});

memoryRunAutoLearnBtn.addEventListener('click', async () => {
  if (currentMemory?.autoLearnPaused && !confirm(t('memoryConfirmRunOverwrite'))) return;
  const originalText = memoryRunAutoLearnBtn.textContent;
  memoryRunAutoLearnBtn.disabled = true;
  memoryRunAutoLearnBtn.textContent = t('memoryRunningAutoLearn');
  try {
    const res = await send<SimpleResponse>({ type: 'RUN_AUTO_LEARN' });
    if (res.ok) {
      showMemoryStatus(t('memoryRanAutoLearn'));
      await loadMemory();
    } else {
      showMemoryStatus(res.error, 'err');
    }
  } finally {
    memoryRunAutoLearnBtn.disabled = false;
    memoryRunAutoLearnBtn.textContent = originalText;
  }
});

async function handleRemoveSample(field: MemoryField, value: string): Promise<void> {
  const res = await send<SimpleResponse>({
    type: 'REMOVE_MEMORY_SAMPLE',
    field,
    value,
  });
  if (res.ok) await loadMemory();
  else showMemoryStatus(res.error, 'err');
}

for (const field of MEMORY_FIELDS) {
  memoryClearBucketBtns[field].addEventListener('click', async () => {
    if (!confirm(t('memoryConfirmClearBucket')(t(MEMORY_BUCKET_LABEL_KEY[field])))) return;
    const res = await send<SimpleResponse>({ type: 'CLEAR_MEMORY_SAMPLES', field });
    if (res.ok) {
      showMemoryStatus(t('memoryCleared'));
      await loadMemory();
    } else {
      showMemoryStatus(res.error, 'err');
    }
  });
}

memoryClearAllBtn.addEventListener('click', async () => {
  if (!confirm(t('memoryConfirmClearAll'))) return;
  const res = await send<SimpleResponse>({ type: 'CLEAR_MEMORY_ALL' });
  if (res.ok) {
    showMemoryStatus(t('memoryCleared'));
    await loadMemory();
  } else {
    showMemoryStatus(res.error, 'err');
  }
});

void loadMemory();
