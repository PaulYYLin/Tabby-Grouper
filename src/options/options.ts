import '../fonts.css';
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

let savedTimer: number | undefined;

const stored = (await chrome.storage.sync.get([
  'apiKey',
  'model',
  'addDraggedTabPolicy',
  'removeDraggedTabPolicy',
])) as {
  apiKey?: string;
  model?: string;
  addDraggedTabPolicy?: unknown;
  removeDraggedTabPolicy?: unknown;
};

const coercePolicy = (v: unknown): DraggedTabPolicy =>
  isDraggedTabPolicy(v) ? v : DEFAULT_DRAGGED_TAB_POLICY;

if (stored.apiKey) apiKeyInput.value = stored.apiKey;
if (stored.model) modelInput.value = stored.model;
addPolicySelect.value = coercePolicy(stored.addDraggedTabPolicy);
removePolicySelect.value = coercePolicy(stored.removeDraggedTabPolicy);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await chrome.storage.sync.set({
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    addDraggedTabPolicy: addPolicySelect.value as DraggedTabPolicy,
    removeDraggedTabPolicy: removePolicySelect.value as DraggedTabPolicy,
  });
  saveStatus.textContent = '已儲存 ✓';
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    saveStatus.textContent = '';
    savedTimer = undefined;
  }, 2000);
});
