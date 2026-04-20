import '../fonts.css';

export {};

const form = document.getElementById('options-form') as HTMLFormElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const modelInput = document.getElementById('model') as HTMLInputElement;
const saveStatus = document.getElementById('save-status') as HTMLParagraphElement;

let savedTimer: number | undefined;

const stored = (await chrome.storage.sync.get(['apiKey', 'model'])) as {
  apiKey?: string;
  model?: string;
};
if (stored.apiKey) apiKeyInput.value = stored.apiKey;
if (stored.model) modelInput.value = stored.model;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await chrome.storage.sync.set({
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
  });
  saveStatus.textContent = '已儲存 ✓';
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => {
    saveStatus.textContent = '';
    savedTimer = undefined;
  }, 2000);
});
