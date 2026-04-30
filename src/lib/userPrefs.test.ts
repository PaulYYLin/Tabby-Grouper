import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_HINTS_LEN,
  distillUserPrefs,
  emptyUserPrefs,
  pushCapped,
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
