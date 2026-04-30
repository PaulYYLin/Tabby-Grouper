import type { Lang } from './i18n';
import { PROVIDERS, type Provider } from './openrouter';

export interface UserPrefs {
  schemaVersion: 1;
  instructions: string[];
  userNames: string[];
  aiNames: string[];
  distilled: string;
  distilledLang: Lang | '';
  distilledAt: number;
  samplesSinceDistill: number;
  updatedAt: number;
}

export const USER_PREFS_KEY = 'tabby:userPrefs:v1';
export const USER_PREFS_ENABLED_KEY = 'userPrefsEnabled';
export const MAX_INSTRUCTION_SAMPLES = 20;
export const MAX_NAME_SAMPLES = 30;
export const MAX_HINTS_LEN = 600;
export const MIN_SAMPLES_TO_DISTILL = 3;
export const REDISTILL_THRESHOLD = 3;
const DISTILL_MAX_TOKENS = 400;

export async function isUserPrefsEnabled(): Promise<boolean> {
  const raw = await chrome.storage.sync.get(USER_PREFS_ENABLED_KEY);
  return raw[USER_PREFS_ENABLED_KEY] === true;
}

export function emptyUserPrefs(): UserPrefs {
  return {
    schemaVersion: 1,
    instructions: [],
    userNames: [],
    aiNames: [],
    distilled: '',
    distilledLang: '',
    distilledAt: 0,
    samplesSinceDistill: 0,
    updatedAt: 0,
  };
}

function isUserPrefs(v: unknown): v is UserPrefs {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.schemaVersion === 1 &&
    Array.isArray(o.instructions) &&
    Array.isArray(o.userNames) &&
    Array.isArray(o.aiNames) &&
    (o.instructions as unknown[]).every((x) => typeof x === 'string') &&
    (o.userNames as unknown[]).every((x) => typeof x === 'string') &&
    (o.aiNames as unknown[]).every((x) => typeof x === 'string') &&
    typeof o.distilled === 'string'
  );
}

export async function readUserPrefs(): Promise<UserPrefs> {
  const raw = await chrome.storage.local.get(USER_PREFS_KEY);
  const v = raw[USER_PREFS_KEY];
  if (!isUserPrefs(v)) return emptyUserPrefs();
  return {
    ...emptyUserPrefs(),
    ...v,
  };
}

export async function writeUserPrefs(prefs: UserPrefs): Promise<void> {
  await chrome.storage.local.set({ [USER_PREFS_KEY]: prefs });
}

export async function clearUserPrefs(): Promise<void> {
  await chrome.storage.local.remove(USER_PREFS_KEY);
}

export function pushCapped(arr: string[], item: string, cap: number): string[] {
  const trimmed = item.trim();
  if (!trimmed) return arr;
  const next = arr.filter((x) => x !== trimmed);
  next.push(trimmed);
  return next.length > cap ? next.slice(next.length - cap) : next;
}

async function recordSample(
  field: 'instructions' | 'userNames' | 'aiNames',
  value: string,
  cap: number,
): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  const prefs = await readUserPrefs();
  const next = pushCapped(prefs[field], trimmed, cap);
  if (next === prefs[field]) return;
  await writeUserPrefs({
    ...prefs,
    [field]: next,
    samplesSinceDistill: prefs.samplesSinceDistill + 1,
    updatedAt: Date.now(),
  });
}

export function recordInstruction(instruction: string): Promise<void> {
  return recordSample('instructions', instruction, MAX_INSTRUCTION_SAMPLES);
}

export function recordUserName(name: string): Promise<void> {
  return recordSample('userNames', name, MAX_NAME_SAMPLES);
}

export function recordAiName(name: string): Promise<void> {
  return recordSample('aiNames', name, MAX_NAME_SAMPLES);
}

export async function getPromptHints(lang: Lang): Promise<string> {
  const prefs = await readUserPrefs();
  if (!prefs.distilled) return '';
  if (prefs.distilledLang && prefs.distilledLang !== lang) return '';
  return prefs.distilled;
}

const DISTILL_SYSTEM_ZH = `你是輔助工具。閱讀使用者過去親自為分頁群組命名的「使用者命名」、AI 為他們命名後被沿用的「AI 命名」，以及他們下過的「使用者指令」，產出一段不超過 300 字的繁體中文摘要，幫助下一次自動分組更貼近使用者的習慣。

摘要要點：
1. 命名風格：語言（中文／英文／混用）、長度、是否含特殊字符、常見主題詞
2. 指令模式：常見範圍詞、粒度偏好、是否常按網站／主題／工作性質分組
3. 兩種訊號比較：「使用者命名」是強訊號，「AI 命名」是弱訊號（使用者沒改動代表還算可接受）

輸出規則（不可違反）：
- 只輸出摘要文字本身，不要 JSON、不要 markdown、不要前後說明
- 一段或最多兩段，總長度不超過 300 字
- 不要逐筆覆述樣本，要做歸納
- 若樣本太少或無明顯模式，直接輸出一句話的中性描述即可`;

const DISTILL_SYSTEM_EN = `You are a helper. Read the user's past "user-edited group names", "AI-generated names the user kept" (a weaker signal — they merely didn't bother to rename), and their past "user instructions". Produce one short English summary (≤ 300 chars) that captures the user's tab-grouping habits so the next auto-grouping run can match their style.

Cover:
1. Naming style — language, length, special characters, recurring topical keywords
2. Instruction patterns — typical scope words, preferred granularity, whether they group by site / topic / work nature
3. Treat user-edited names as strong signal; treat AI-accepted names as weaker signal

Hard rules:
- Output the summary text only — no JSON, no markdown, no preface
- One short paragraph (or two short ones), max 300 chars total
- Generalize; do not enumerate samples one by one
- If samples are too few or there's no clear pattern, output a single neutral sentence`;

function buildDistillUserMessage(prefs: UserPrefs, lang: Lang): string {
  const isZh = lang === 'zh';
  const lines: string[] = [];

  const userNames = prefs.userNames.slice(-MAX_NAME_SAMPLES);
  const aiNames = prefs.aiNames.slice(-MAX_NAME_SAMPLES);
  const instructions = prefs.instructions.slice(-MAX_INSTRUCTION_SAMPLES);

  if (userNames.length > 0) {
    lines.push(isZh ? '使用者親自命名（強訊號）：' : 'User-edited names (strong signal):');
    for (const n of userNames) lines.push(`- ${n}`);
    lines.push('');
  }
  if (aiNames.length > 0) {
    lines.push(isZh ? 'AI 命名（弱訊號）：' : 'AI-generated names kept (weak signal):');
    for (const n of aiNames) lines.push(`- ${n}`);
    lines.push('');
  }
  if (instructions.length > 0) {
    lines.push(isZh ? '使用者指令：' : 'User instructions:');
    for (const i of instructions) lines.push(`- ${i}`);
    lines.push('');
  }

  if (lines.length === 0) {
    return isZh ? '（尚無樣本）' : '(no samples)';
  }
  lines.push(
    isZh
      ? '請依系統指示產出 ≤ 300 字的繁體中文摘要。'
      : 'Produce the ≤ 300-char English summary as instructed.',
  );
  return lines.join('\n');
}

export async function distillUserPrefs(
  apiKey: string,
  model: string,
  provider: Provider,
  lang: Lang,
  prefs: UserPrefs,
): Promise<string> {
  const systemPrompt = lang === 'zh' ? DISTILL_SYSTEM_ZH : DISTILL_SYSTEM_EN;
  const userMessage = buildDistillUserMessage(prefs, lang);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') headers['X-Title'] = 'Tabby Grouper';

  const res = await fetch(PROVIDERS[provider].endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: DISTILL_MAX_TOKENS,
    }),
  });

  if (!res.ok) throw new Error(`distill ${res.status}`);
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) return '';
  const trimmed = content.trim();
  return trimmed.length > MAX_HINTS_LEN ? trimmed.slice(0, MAX_HINTS_LEN) : trimmed;
}

export async function maybeRefreshDistill(
  apiKey: string,
  model: string,
  provider: Provider,
  lang: Lang,
): Promise<void> {
  if (!apiKey) return;
  const prefs = await readUserPrefs();
  const total = prefs.instructions.length + prefs.userNames.length + prefs.aiNames.length;
  if (total < MIN_SAMPLES_TO_DISTILL) return;

  const langChanged = !!prefs.distilledLang && prefs.distilledLang !== lang;
  const hasCache = !!prefs.distilled && !langChanged;
  if (hasCache && prefs.samplesSinceDistill < REDISTILL_THRESHOLD) return;

  let summary: string;
  try {
    summary = await distillUserPrefs(apiKey, model, provider, lang, prefs);
  } catch {
    return;
  }
  if (!summary) return;

  const latest = await readUserPrefs();
  await writeUserPrefs({
    ...latest,
    distilled: summary,
    distilledLang: lang,
    distilledAt: Date.now(),
    samplesSinceDistill: 0,
  });
}
