import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_HINTS_LEN,
  USER_PREFS_KEY,
  distillUserPrefs,
  emptyUserPrefs,
  maybeRefreshDistill,
  pushCapped,
  readUserPrefs,
  recordAiName,
  recordInstruction,
  recordUserName,
  removeSample,
  runAutoLearn,
  updateDistilledManual,
  type UserPrefs,
} from './userPrefs';

function prefsWith(partial: Partial<UserPrefs>): UserPrefs {
  return { ...emptyUserPrefs(), ...partial };
}

function mockCompletion(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => '',
  });
}

let chromeStore: Record<string, unknown>;
let storageSetCalls: number;

function stubChromeStorage(): void {
  chromeStore = {};
  storageSetCalls = 0;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          return key in chromeStore ? { [key]: chromeStore[key] } : {};
        }),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          storageSetCalls += 1;
          Object.assign(chromeStore, obj);
        }),
        remove: vi.fn(async (key: string) => {
          delete chromeStore[key];
        }),
      },
    },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pushCapped', () => {
  it('appends new items and ignores empty input', () => {
    expect(pushCapped([], 'a', 5)).toEqual(['a']);
    expect(pushCapped(['a'], '   ', 5)).toEqual(['a']);
  });

  it('dedupes by moving the existing item to the end', () => {
    expect(pushCapped(['a', 'b', 'c'], 'a', 5)).toEqual(['b', 'c', 'a']);
  });

  it('caps at the requested length, dropping oldest', () => {
    expect(pushCapped(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });

  it('trims whitespace before storing', () => {
    expect(pushCapped([], '  hello  ', 5)).toEqual(['hello']);
  });
});

describe('distillUserPrefs', () => {
  it('sends raw samples to the LLM and returns the trimmed summary', async () => {
    const fetchMock = mockCompletion('  使用者偏好短中文命名，常按網站分。  ');
    vi.stubGlobal('fetch', fetchMock);
    const prefs = prefsWith({
      userNames: ['工作', '購物'],
      instructions: ['按網站分組'],
    });

    const out = await distillUserPrefs('k', 'm', 'openrouter', 'zh', prefs);

    expect(out).toBe('使用者偏好短中文命名，常按網站分。');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMsg).toContain('工作');
    expect(userMsg).toContain('按網站分組');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('300');
  });

  it('truncates the LLM output to MAX_HINTS_LEN', async () => {
    const long = '很長'.repeat(500);
    vi.stubGlobal('fetch', mockCompletion(long));
    const out = await distillUserPrefs(
      'k',
      'm',
      'openrouter',
      'zh',
      prefsWith({ userNames: ['x', 'y', 'z'] }),
    );
    expect(out.length).toBeLessThanOrEqual(MAX_HINTS_LEN);
  });

  it('uses the English system prompt when lang is en', async () => {
    const fetchMock = mockCompletion('User prefers short English names.');
    vi.stubGlobal('fetch', fetchMock);
    await distillUserPrefs(
      'k',
      'm',
      'openrouter',
      'en',
      prefsWith({ userNames: ['Work', 'Personal'] }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('English');
  });

  it('throws when the HTTP call fails so the caller can swallow it silently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'boom',
      }),
    );
    await expect(
      distillUserPrefs('k', 'm', 'openrouter', 'zh', prefsWith({ userNames: ['a', 'b'] })),
    ).rejects.toThrow(/500/);
  });

  it('returns empty string when the LLM returns no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: {} }] }),
        text: async () => '',
      }),
    );
    const out = await distillUserPrefs(
      'k',
      'm',
      'openrouter',
      'zh',
      prefsWith({ userNames: ['a', 'b'] }),
    );
    expect(out).toBe('');
  });

  it('separates strong vs weak signals in the user message', async () => {
    const fetchMock = mockCompletion('summary');
    vi.stubGlobal('fetch', fetchMock);
    const prefs = prefsWith({
      userNames: ['親自改的名字'],
      aiNames: ['AI 給的名字'],
    });
    await distillUserPrefs('k', 'm', 'openrouter', 'zh', prefs);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg: string = body.messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMsg).toContain('強訊號');
    expect(userMsg).toContain('弱訊號');
    const userNamesIdx = userMsg.indexOf('親自改的名字');
    const aiNamesIdx = userMsg.indexOf('AI 給的名字');
    expect(userNamesIdx).toBeGreaterThan(-1);
    expect(aiNamesIdx).toBeGreaterThan(-1);
  });
});

describe('withUserPrefsLock', () => {
  beforeEach(() => {
    stubChromeStorage();
  });

  it('serialises concurrent mutations so neither overwrites the other', async () => {
    await Promise.all([
      recordInstruction('first instruction'),
      recordUserName('alice'),
      recordAiName('Work'),
    ]);

    const prefs = await readUserPrefs();
    expect(prefs.instructions).toEqual(['first instruction']);
    expect(prefs.userNames).toEqual(['alice']);
    expect(prefs.aiNames).toEqual(['Work']);
    expect(prefs.samplesSinceDistill).toBe(3);
  });

  it('skips the storage write when fn returns the same prefs reference', async () => {
    await recordInstruction('seed');
    const baseline = storageSetCalls;

    await removeSample('instructions', 'nonexistent');

    expect(storageSetCalls).toBe(baseline);
  });

  it('re-checks autoLearnPaused inside the lock so a manual edit during fetch wins', async () => {
    chromeStore[USER_PREFS_KEY] = prefsWith({
      instructions: ['a', 'b', 'c'],
      userNames: ['x'],
    });

    let resolveFetch: () => void = () => undefined;
    const fetchPromise = new Promise<{
      ok: boolean;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    }>((r) => {
      resolveFetch = () =>
        r({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'auto-learned' } }] }),
          text: async () => '',
        });
    });
    vi.stubGlobal('fetch', vi.fn(() => fetchPromise));

    const distillP = maybeRefreshDistill('k', 'm', 'openrouter', 'zh');
    await updateDistilledManual('user typed this');
    resolveFetch();
    await distillP;

    const prefs = await readUserPrefs();
    expect(prefs.distilled).toBe('user typed this');
    expect(prefs.autoLearnPaused).toBe(true);
  });
});

describe('runAutoLearn', () => {
  beforeEach(() => {
    stubChromeStorage();
  });

  it('throws NO_API_KEY when apiKey is empty', async () => {
    await expect(runAutoLearn('', 'm', 'openrouter', 'zh')).rejects.toThrow('NO_API_KEY');
  });

  it('throws NOT_ENOUGH_SAMPLES when total samples is below the threshold', async () => {
    chromeStore[USER_PREFS_KEY] = prefsWith({ userNames: ['only-one'] });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runAutoLearn('k', 'm', 'openrouter', 'zh')).rejects.toThrow(
      'NOT_ENOUGH_SAMPLES',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws EMPTY_SUMMARY when the LLM returns no content', async () => {
    chromeStore[USER_PREFS_KEY] = prefsWith({
      userNames: ['a', 'b'],
      instructions: ['c'],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
        text: async () => '',
      }),
    );

    await expect(runAutoLearn('k', 'm', 'openrouter', 'zh')).rejects.toThrow('EMPTY_SUMMARY');
  });

  it('writes the summary and clears autoLearnPaused on success', async () => {
    chromeStore[USER_PREFS_KEY] = prefsWith({
      userNames: ['a', 'b'],
      instructions: ['c'],
      autoLearnPaused: true,
      distilled: 'old hand-edited',
    });
    vi.stubGlobal('fetch', mockCompletion('fresh learned summary'));

    await runAutoLearn('k', 'm', 'openrouter', 'zh');

    const prefs = await readUserPrefs();
    expect(prefs.distilled).toBe('fresh learned summary');
    expect(prefs.distilledLang).toBe('zh');
    expect(prefs.autoLearnPaused).toBe(false);
    expect(prefs.samplesSinceDistill).toBe(0);
  });
});
