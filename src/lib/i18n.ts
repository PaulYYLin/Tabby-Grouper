export type Lang = 'zh' | 'en';

export const LANG_KEY = 'lang';

const dict = {
  zh: {
    appName: 'Tabby Grouper',
    subtitle: '用 AI 把相關分頁整理到同一個群組',
    tabGroup: '分組',
    tabTasks: '任務',
    viewGroupTitle: '立即分組',
    viewGroupDesc: '用 AI 把目前視窗的分頁整理成 Chrome 群組。',
    instructionPlaceholder: '預設：根據分頁標題與網域，把相關分頁依主題分到同一組。',
    ctaGroup: '分組目前視窗的分頁',
    viewTasksTitle: '已儲存的任務',
    viewTasksDesc: '每次分組後的快照，可隨時恢復或刪除。',
    taskSearchPlaceholder: '搜尋任務名稱、敘述或分頁標題…',
    tasksEmptyTitle: '尚無已儲存的任務',
    tasksEmptyHint: '每次成功分組後，快照會自動出現在這裡。',
    tasksNoMatch: '沒有符合的任務',
    optionsLink: '開啟設定',

    pendingTitle: '分頁變動待確認',
    pendingDontAsk: '之後都不要再詢問（套用到下次點選的選擇）',
    pendingKindAdd: '加入',
    pendingKindRemove: '移除',
    pendingActionAddYes: '加入',
    pendingActionAddNo: '略過',
    pendingActionRemoveYes: '移除',
    pendingActionRemoveNo: '保留',
    pendingRememberAddYes: '已記住：之後拖入分頁會自動加入任務',
    pendingRememberAddNo: '已記住：之後拖入分頁不會加入任務',
    pendingRememberRemoveYes: '已記住：之後拖出分頁會自動從任務移除',
    pendingRememberRemoveNo: '已記住：之後拖出分頁會保留在任務',

    taskOpenLive: '開啟群組分頁',
    taskOpenArchived: '恢復並開啟分頁',
    taskArchivedTag: '已封存',
    taskResume: '補齊缺少分頁',
    taskResumeArchived: '恢復',
    taskCopyLabel: '複製任務內容',
    taskCopyTitle: '複製任務（敘述 + 分頁連結）',
    taskDeleteLabel: '刪除任務',
    taskDeleteTitle: '刪除任務',
    taskNameEditLabel: '編輯任務名稱',
    taskNameSaveLabel: '儲存名稱',
    taskNameSaveTitle: '儲存',
    taskNameCancelLabel: '取消編輯名稱',
    taskNameCancelTitle: '取消',
    summaryEmpty: '（尚無敘述，點此新增）',
    summaryEditLabel: '編輯敘述',
    summaryAddLabel: '新增敘述',
    summarySaveLabel: '儲存敘述',
    summarySaveTitle: '儲存',
    summaryCancelLabel: '取消編輯',
    summaryCancelTitle: '取消',

    countAll: (n: number) => `${n} 個`,
    countFiltered: (shown: number, total: number) => `${shown}/${total} 個`,
    taskMeta: (n: number, rel: string) => `${n} 個分頁 · ${rel}`,

    statusAnalyzing: '分析中，請稍候…',
    statusGroupSuccess: (groups: number, tabs: number) =>
      `已建立 ${groups} 個群組，整理了 ${tabs} 個分頁`,
    statusError: (msg: string) => `錯誤：${msg}`,
    statusResuming: (name: string) => `恢復中：${name}…`,
    statusResumed: (name: string, opened: number, reused: number) =>
      `已恢復「${name}」：新開 ${opened} 個、沿用 ${reused} 個分頁`,
    statusCopied: (name: string, n: number) => `已複製「${name}」（${n} 個分頁）`,
    statusCopyFailed: (msg: string) => `複製失敗：${msg}`,
    confirmDelete: (name: string) => `確定刪除任務「${name}」？此任務對應的瀏覽器群組與分頁也會一起關閉。`,

    relJustNow: '剛剛',
    relMinutes: (n: number) => `${n} 分鐘前`,
    relHours: (n: number) => `${n} 小時前`,
    relDays: (n: number) => `${n} 天前`,

    optionsTitle: 'Tabby Grouper 設定',
    providerLabel: 'AI 供應商',
    providerOpenRouter: 'OpenRouter',
    providerOpenAI: 'OpenAI',
    providerGemini: 'Google Gemini',
    apiKeyLabel: 'API Key',
    apiKeyHintPrefix: '取得 API Key：',
    modelLabel: '模型（選填）',
    modelHintBefore: (defaultModel: string) => `留空使用預設模型（${defaultModel}）。可用模型列表：`,
    modelHintAfter: '（例：',
    modelHintEnd: '）',
    saveBtn: '儲存',
    saved: '已儲存 ✓',
    langSectionLabel: '語言 / Language',
    langZh: '中文',
    langEn: 'English',
    langHint: '切換 UI 與 AI 產生的群組名稱／敘述語言；既有任務不受影響。',
    addPolicyLabel: '手動拖入分頁時',
    removePolicyLabel: '手動拖出分頁時',
    addPolicyAsk: '每次詢問',
    addPolicyAlways: '自動加入任務',
    addPolicyNever: '不加入任務',
    removePolicyAsk: '每次詢問',
    removePolicyAlways: '自動從任務移除',
    removePolicyNever: '保留在任務',
    addPolicyHint:
      '當你把分頁手動拖進已記錄的群組時，要不要把它寫進該任務的分頁清單。預設「每次詢問」會跳系統通知。',
    removePolicyHint:
      '當你把已記錄的分頁拖出群組時，要不要從該任務的分頁清單移除。',

    errNoApiKey: '尚未設定 API Key，請先打開設定頁',
    errTooFewTabs: '可分組的分頁少於 2 個',
    errNoGroupsFound: 'AI 未找到可歸類的主題群組',
    errEmptyTaskName: '任務名稱不能為空',
    errInstructionTooLong: (max: number) => `過濾規則過長（上限 ${max} 字），請縮短後再試`,
    errAiEmpty: 'AI 供應商回傳空內容',
    errAiTruncated: 'AI 回傳被截斷（分頁太多或模型輸出上限太小），請減少分頁或換模型再試',
    errAiInvalidJson: (msg: string) => `AI 回傳非合法 JSON：${msg}`,
    errBadShape: '回傳格式錯誤：預期 groups 陣列',
    errAiStatus: (provider: string, status: number, body: string) =>
      `${provider} ${status}: ${body}`,

    notifAddTitle: (taskName: string) => `加入「${taskName}」？`,
    notifRemoveTitle: (taskName: string) => `從「${taskName}」移除？`,
    notifAddContext: '剛剛拖入的分頁是否要記錄到此任務？',
    notifRemoveContext: '剛剛拖出的分頁是否要從此任務移除？',
    notifAddYes: '加入',
    notifAddNo: '略過',
    notifRemoveYes: '移除',
    notifRemoveNo: '保留',
  },
  en: {
    appName: 'Tabby Grouper',
    subtitle: 'Use AI to organize related tabs into the same group',
    tabGroup: 'Group',
    tabTasks: 'Tasks',
    viewGroupTitle: 'Group now',
    viewGroupDesc: 'Use AI to organize tabs in the current window into Chrome groups.',
    instructionPlaceholder:
      'Default: group related tabs by topic based on their titles and domains.',
    ctaGroup: 'Group tabs in current window',
    viewTasksTitle: 'Saved tasks',
    viewTasksDesc: 'A snapshot is saved after each grouping. Restore or delete any time.',
    taskSearchPlaceholder: 'Search task name, description, or tab title…',
    tasksEmptyTitle: 'No saved tasks yet',
    tasksEmptyHint: 'Snapshots from successful groupings will appear here.',
    tasksNoMatch: 'No matching tasks',
    optionsLink: 'Open settings',

    pendingTitle: 'Tab changes pending',
    pendingDontAsk: "Don't ask again (apply this choice next time)",
    pendingKindAdd: 'Add',
    pendingKindRemove: 'Remove',
    pendingActionAddYes: 'Add',
    pendingActionAddNo: 'Skip',
    pendingActionRemoveYes: 'Remove',
    pendingActionRemoveNo: 'Keep',
    pendingRememberAddYes: 'Remembered: dragged-in tabs will be auto-added',
    pendingRememberAddNo: 'Remembered: dragged-in tabs will not be added',
    pendingRememberRemoveYes: 'Remembered: dragged-out tabs will be auto-removed',
    pendingRememberRemoveNo: 'Remembered: dragged-out tabs will be kept in the task',

    taskOpenLive: 'Open group tabs',
    taskOpenArchived: 'Restore and open tabs',
    taskArchivedTag: 'Archived',
    taskResume: 'Restore missing tabs',
    taskResumeArchived: 'Restore',
    taskCopyLabel: 'Copy task',
    taskCopyTitle: 'Copy task (description + tab links)',
    taskDeleteLabel: 'Delete task',
    taskDeleteTitle: 'Delete task',
    taskNameEditLabel: 'Edit task name',
    taskNameSaveLabel: 'Save name',
    taskNameSaveTitle: 'Save',
    taskNameCancelLabel: 'Cancel name editing',
    taskNameCancelTitle: 'Cancel',
    summaryEmpty: '(No description, click to add)',
    summaryEditLabel: 'Edit description',
    summaryAddLabel: 'Add description',
    summarySaveLabel: 'Save description',
    summarySaveTitle: 'Save',
    summaryCancelLabel: 'Cancel editing',
    summaryCancelTitle: 'Cancel',

    countAll: (n: number) => `${n}`,
    countFiltered: (shown: number, total: number) => `${shown}/${total}`,
    taskMeta: (n: number, rel: string) => `${n} tab${n === 1 ? '' : 's'} · ${rel}`,

    statusAnalyzing: 'Analyzing, please wait…',
    statusGroupSuccess: (groups: number, tabs: number) =>
      `Created ${groups} group${groups === 1 ? '' : 's'}, organized ${tabs} tab${tabs === 1 ? '' : 's'}`,
    statusError: (msg: string) => `Error: ${msg}`,
    statusResuming: (name: string) => `Restoring: ${name}…`,
    statusResumed: (name: string, opened: number, reused: number) =>
      `Restored "${name}": opened ${opened}, reused ${reused} tab${opened + reused === 1 ? '' : 's'}`,
    statusCopied: (name: string, n: number) => `Copied "${name}" (${n} tabs)`,
    statusCopyFailed: (msg: string) => `Copy failed: ${msg}`,
    confirmDelete: (name: string) => `Delete task "${name}"? The matching browser group and its tabs will also be closed.`,

    relJustNow: 'just now',
    relMinutes: (n: number) => `${n} min${n === 1 ? '' : 's'} ago`,
    relHours: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
    relDays: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,

    optionsTitle: 'Tabby Grouper settings',
    providerLabel: 'AI provider',
    providerOpenRouter: 'OpenRouter',
    providerOpenAI: 'OpenAI',
    providerGemini: 'Google Gemini',
    apiKeyLabel: 'API Key',
    apiKeyHintPrefix: 'Get an API Key: ',
    modelLabel: 'Model (optional)',
    modelHintBefore: (defaultModel: string) =>
      `Leave blank to use the default model (${defaultModel}). Browse models: `,
    modelHintAfter: ' (e.g. ',
    modelHintEnd: ')',
    saveBtn: 'Save',
    saved: 'Saved ✓',
    langSectionLabel: 'Language / 語言',
    langZh: '中文',
    langEn: 'English',
    langHint:
      'Switches UI text and the language of AI-generated group names / descriptions. Existing tasks are not affected.',
    addPolicyLabel: 'When dragging a tab into a group',
    removePolicyLabel: 'When dragging a tab out of a group',
    addPolicyAsk: 'Ask every time',
    addPolicyAlways: 'Auto-add to task',
    addPolicyNever: 'Do not add to task',
    removePolicyAsk: 'Ask every time',
    removePolicyAlways: 'Auto-remove from task',
    removePolicyNever: 'Keep in task',
    addPolicyHint:
      "Whether to add the dragged-in tab to the task's tab list when you manually drag a tab into a tracked group. \"Ask every time\" shows a system notification.",
    removePolicyHint:
      "Whether to remove the tab from the task's tab list when you drag a tracked tab out of its group.",

    errNoApiKey: 'API Key not set. Please open the settings page first.',
    errTooFewTabs: 'Fewer than 2 groupable tabs',
    errNoGroupsFound: 'AI did not find any topic groups',
    errEmptyTaskName: 'Task name cannot be empty',
    errInstructionTooLong: (max: number) =>
      `Instruction too long (max ${max} chars). Please shorten and retry.`,
    errAiEmpty: 'AI provider returned empty content',
    errAiTruncated:
      'AI response was truncated (too many tabs or model output limit too small). Reduce tabs or switch model.',
    errAiInvalidJson: (msg: string) => `AI returned invalid JSON: ${msg}`,
    errBadShape: 'Bad response shape: expected groups array',
    errAiStatus: (provider: string, status: number, body: string) =>
      `${provider} ${status}: ${body}`,

    notifAddTitle: (taskName: string) => `Add to "${taskName}"?`,
    notifRemoveTitle: (taskName: string) => `Remove from "${taskName}"?`,
    notifAddContext: 'Record the dragged-in tab to this task?',
    notifRemoveContext: 'Remove the dragged-out tab from this task?',
    notifAddYes: 'Add',
    notifAddNo: 'Skip',
    notifRemoveYes: 'Remove',
    notifRemoveNo: 'Keep',
  },
} as const;

type Dict = typeof dict.zh;
type Key = keyof Dict;

// Compile-time guarantee that zh and en cover the same keys.
type _MissingFromEn = Exclude<keyof typeof dict.zh, keyof typeof dict.en>;
type _MissingFromZh = Exclude<keyof typeof dict.en, keyof typeof dict.zh>;
type _AssertKeysMatch = [_MissingFromEn, _MissingFromZh] extends [never, never] ? true : never;
const _keysMatch: _AssertKeysMatch = true;
void _keysMatch;

export function detectBrowserLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function htmlLangFor(lang: Lang): string {
  return lang === 'zh' ? 'zh-Hant' : 'en';
}

export async function getLang(): Promise<Lang> {
  const stored = (await chrome.storage.sync.get(LANG_KEY)) as { lang?: unknown };
  const v = stored.lang;
  if (v === 'zh' || v === 'en') return v;
  return detectBrowserLang();
}

export async function setLang(lang: Lang): Promise<void> {
  await chrome.storage.sync.set({ [LANG_KEY]: lang });
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: chrome.storage.AreaName,
  ) => {
    if (area !== 'sync' || !(LANG_KEY in changes)) return;
    const v = changes[LANG_KEY].newValue;
    if (v === 'zh' || v === 'en') cb(v);
    else cb(detectBrowserLang());
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function tFor(lang: Lang): <K extends Key>(key: K) => Dict[K] {
  const d = dict[lang] as Dict;
  return <K extends Key>(key: K) => d[key];
}

export function applyDomI18n(t: ReturnType<typeof tFor>, root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as Key | undefined;
    if (!key) return;
    const v = t(key);
    if (typeof v === 'string') el.textContent = v;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder as Key | undefined;
    if (!key) return;
    const v = t(key);
    if (typeof v === 'string' && 'placeholder' in el) {
      (el as HTMLInputElement | HTMLTextAreaElement).placeholder = v;
    }
  });
}
