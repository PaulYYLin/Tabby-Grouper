export interface TabInfo {
  id: number;
  title: string;
  url: string;
}

export interface GroupResult {
  groupName: string;
  tabIds: number[];
}

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';
export const MAX_INSTRUCTION_LEN = 512;
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_TITLE_LEN = 80;
const MAX_TOKENS = 512;

export async function classifyTabs(
  apiKey: string,
  model: string,
  tabs: TabInfo[],
  instruction?: string,
): Promise<GroupResult[]> {
  if (instruction && instruction.length > MAX_INSTRUCTION_LEN) {
    throw new Error(`過濾規則過長（上限 ${MAX_INSTRUCTION_LEN} 字），請縮短後再試`);
  }

  const tabList = tabs
    .map((t) => `[${t.id}] ${truncate(t.title, MAX_TITLE_LEN)} — ${safeHostname(t.url)}`)
    .join('\n');

  const userRule = instruction?.trim()
    ? `\n使用者指定的過濾規則（優先遵守；不符合此規則的分頁一律不要放進結果，即使它們彼此相關）：\n${instruction.trim()}\n`
    : '';

  const prompt = `你是分頁整理助手。根據以下分頁的標題與網域，把相關分頁分到同一組。規則：
- groupName 使用 2-6 字的中文或英文主題名
- 每組至少 2 個分頁才成組；無法歸類的不要放進結果
- tabIds 必須是下方列表中實際出現的數字 id
- 只輸出 JSON，格式：{"groups": [{"groupName": string, "tabIds": number[]}]}
- 除 JSON 外不要輸出任何文字
${userRule}
分頁列表：
${tabList}`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Title': 'Tabby Grouper',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter 回傳空內容');

  const parsed: unknown = JSON.parse(stripCodeFence(content));
  const raw = Array.isArray(parsed)
    ? parsed
    : (parsed as { groups?: unknown })?.groups;
  if (!Array.isArray(raw)) {
    throw new Error('回傳格式錯誤：預期 groups 陣列');
  }

  const validIds = new Set(tabs.map((t) => t.id));
  const used = new Set<number>();
  return raw
    .filter(isGroupResultShape)
    .map((g) => {
      const tabIds: number[] = [];
      for (const id of g.tabIds) {
        if (validIds.has(id) && !used.has(id)) {
          used.add(id);
          tabIds.push(id);
        }
      }
      return { groupName: g.groupName.trim(), tabIds };
    })
    .filter((g) => g.groupName.length > 0 && g.tabIds.length >= 2);
}

function stripCodeFence(s: string): string {
  const m = s.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : s;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function isGroupResultShape(v: unknown): v is GroupResult {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.groupName === 'string' &&
    Array.isArray(o.tabIds) &&
    o.tabIds.every((id) => typeof id === 'number')
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
