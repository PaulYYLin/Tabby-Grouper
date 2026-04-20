import '../fonts.css';
import type { GroupTabsResponse, Message } from '../lib/messages';

const btn = document.getElementById('group-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const optionsLink = document.getElementById('options-link') as HTMLAnchorElement;
const instructionEl = document.getElementById('instruction') as HTMLTextAreaElement;
const versionEl = document.getElementById('version') as HTMLSpanElement;

versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

const INSTRUCTION_KEY = 'lastInstruction';

const { [INSTRUCTION_KEY]: lastInstruction } = await chrome.storage.local.get(INSTRUCTION_KEY);
if (typeof lastInstruction === 'string') instructionEl.value = lastInstruction;

const STATUS_KINDS = ['success', 'error'] as const;
type StatusKind = 'info' | (typeof STATUS_KINDS)[number];

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('分析中，請稍候…', 'info');
  const instruction = instructionEl.value.trim();
  await chrome.storage.local.set({ [INSTRUCTION_KEY]: instruction });
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'GROUP_TABS',
      instruction: instruction || undefined,
    } satisfies Message)) as GroupTabsResponse | undefined;

    if (res?.ok) {
      setStatus(
        `已建立 ${res.groupCount} 個群組，整理了 ${res.groupedTabCount} 個分頁`,
        'success',
      );
    } else {
      setStatus(`錯誤：${res?.error ?? '未知錯誤'}`, 'error');
    }
  } catch (err) {
    setStatus(`錯誤：${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function setStatus(text: string, kind: StatusKind) {
  statusEl.textContent = text;
  statusEl.classList.remove(...STATUS_KINDS);
  if (kind !== 'info') statusEl.classList.add(kind);
}
