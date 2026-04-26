import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyTabs, type TabInfo } from './openrouter';

const TABS: TabInfo[] = [
  { id: 1, title: 'GitHub PR', url: 'https://github.com/a/b/pull/1' },
  { id: 2, title: 'Issue', url: 'https://github.com/a/b/issues/9' },
  { id: 3, title: 'YouTube', url: 'https://youtube.com/watch?v=x' },
  { id: 4, title: 'Shorts', url: 'https://youtube.com/shorts/y' },
];

function mockCompletion(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => '',
  });
}

function mockError(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('classifyTabs', () => {
  it('解析正常的 {groups: [...]} 回傳', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [
            { groupName: 'GitHub', tabIds: [1, 2] },
            { groupName: 'YouTube', tabIds: [3, 4] },
          ],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([
      { groupName: 'GitHub', summary: '', tabIds: [1, 2] },
      { groupName: 'YouTube', summary: '', tabIds: [3, 4] },
    ]);
  });

  it('接受頂層陣列回傳', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(JSON.stringify([{ groupName: 'GitHub', tabIds: [1, 2] }])),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([{ groupName: 'GitHub', summary: '', tabIds: [1, 2] }]);
  });

  it('剝除 ```json ... ``` markdown code fence', async () => {
    const content = '```json\n{"groups":[{"groupName":"GitHub","tabIds":[1,2]}]}\n```';
    vi.stubGlobal('fetch', mockCompletion(content));
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([{ groupName: 'GitHub', summary: '', tabIds: [1, 2] }]);
  });

  it('去除不在候選清單的 tabId', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({ groups: [{ groupName: 'Bogus', tabIds: [1, 2, 999] }] }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([{ groupName: 'Bogus', summary: '', tabIds: [1, 2] }]);
  });

  it('同一 tabId 只會進第一個匹配的組', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [
            { groupName: 'A', tabIds: [1, 2] },
            { groupName: 'B', tabIds: [2, 3, 4] },
          ],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([
      { groupName: 'A', summary: '', tabIds: [1, 2] },
      { groupName: 'B', summary: '', tabIds: [3, 4] },
    ]);
  });

  it('過濾少於 2 個分頁的組', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [
            { groupName: 'Solo', tabIds: [1] },
            { groupName: 'Pair', tabIds: [2, 3] },
          ],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([{ groupName: 'Pair', summary: '', tabIds: [2, 3] }]);
  });

  it('過濾空字串 groupName', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [
            { groupName: '   ', tabIds: [1, 2] },
            { groupName: 'Real', tabIds: [3, 4] },
          ],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([{ groupName: 'Real', summary: '', tabIds: [3, 4] }]);
  });

  it('保留 LLM 回傳的 summary', async () => {
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [
            { groupName: 'GitHub', summary: '比較兩個 PR 的差異', tabIds: [1, 2] },
          ],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out).toEqual([
      { groupName: 'GitHub', summary: '比較兩個 PR 的差異', tabIds: [1, 2] },
    ]);
  });

  it('將 hostname 與 pathname 一起送進 prompt（不送 query string）', async () => {
    const fetchMock = mockCompletion(JSON.stringify({ groups: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await classifyTabs('k', 'm', TABS);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg: string = body.messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMsg).toContain('github.com/a/b/pull/1');
    expect(userMsg).toContain('youtube.com/watch');
    expect(userMsg).not.toContain('?v=x');
  });

  it('summary 超過 200 字會被截斷', async () => {
    const longSummary = '長'.repeat(300);
    vi.stubGlobal(
      'fetch',
      mockCompletion(
        JSON.stringify({
          groups: [{ groupName: 'A', summary: longSummary, tabIds: [1, 2] }],
        }),
      ),
    );
    const out = await classifyTabs('k', 'm', TABS);
    expect(out[0].summary).toHaveLength(200);
  });

  it('標題超過 80 字會被截斷後送進 prompt', async () => {
    const fetchMock = mockCompletion(JSON.stringify({ groups: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const longTitle = 'x'.repeat(200);
    await classifyTabs('k', 'm', [
      { id: 1, title: longTitle, url: 'https://a.com' },
      { id: 2, title: 'ok', url: 'https://b.com' },
    ]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg: string = body.messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMsg).not.toContain('x'.repeat(200));
    expect(userMsg).toContain('x'.repeat(80) + '…');
  });

  it('非預期格式回傳會丟錯', async () => {
    vi.stubGlobal('fetch', mockCompletion(JSON.stringify({ nope: true })));
    await expect(classifyTabs('k', 'm', TABS)).rejects.toThrow(/groups 陣列/);
  });

  it('HTTP 錯誤會丟錯並包含 status', async () => {
    vi.stubGlobal('fetch', mockError(401, 'Invalid API key'));
    await expect(classifyTabs('k', 'm', TABS)).rejects.toThrow(/401/);
  });

  it('使用者 instruction 會被拼進 prompt', async () => {
    const fetchMock = mockCompletion(JSON.stringify({ groups: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await classifyTabs('k', 'm', TABS, '只分組工作相關的分頁');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMsg).toContain('只分組工作相關的分頁');
  });
});
