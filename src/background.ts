import { classifyTabs, DEFAULT_MODEL, type TabInfo } from './lib/openrouter';
import type { GroupTabsResponse, Message } from './lib/messages';

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse: (r: GroupTabsResponse) => void) => {
    if (msg?.type !== 'GROUP_TABS') return;
    handleGroupTabs(msg.instruction)
      .then(sendResponse)
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      );
    return true;
  },
);

async function handleGroupTabs(instruction?: string): Promise<GroupTabsResponse> {
  const { apiKey, model } = (await chrome.storage.sync.get(['apiKey', 'model'])) as {
    apiKey?: string;
    model?: string;
  };
  if (!apiKey) {
    return { ok: false, error: '尚未設定 API Key，請先打開設定頁' };
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidates: TabInfo[] = tabs
    .filter(isGroupableTab)
    .map((t) => ({ id: t.id, title: t.title ?? '', url: t.url }));

  if (candidates.length < 2) {
    return { ok: false, error: '可分組的分頁少於 2 個' };
  }

  const groups = await classifyTabs(apiKey, model || DEFAULT_MODEL, candidates, instruction);

  if (groups.length === 0) {
    return { ok: false, error: 'AI 未找到可歸類的主題群組' };
  }

  const counts = await Promise.all(
    groups.map(async (g) => {
      const groupId = await chrome.tabs.group({ tabIds: g.tabIds });
      await chrome.tabGroups.update(groupId, {
        title: g.groupName,
        color: pickColor(g.groupName),
      });
      return g.tabIds.length;
    }),
  );

  return {
    ok: true,
    groupCount: groups.length,
    groupedTabCount: counts.reduce((a, b) => a + b, 0),
  };
}

function isGroupableTab(
  t: chrome.tabs.Tab,
): t is chrome.tabs.Tab & { id: number; url: string } {
  if (typeof t.id !== 'number' || !t.url || t.pinned) return false;
  try {
    const proto = new URL(t.url).protocol;
    return proto === 'http:' || proto === 'https:';
  } catch {
    return false;
  }
}

const COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
];

function pickColor(name: string): chrome.tabGroups.ColorEnum {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}
