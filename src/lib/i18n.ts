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

    setupEmptyTitle: '尚未設定 API Key',
    setupEmptyHint: 'Tabby Grouper 需要一組 AI 供應商的 API Key 才能分組分頁。請先到設定頁完成設定。',
    setupEmptyCta: '前往設定',

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
    modelFormatHintNoVendor: 'OpenAI 與 Gemini 不需要「vendor/」前綴；若填入帶斜線的名稱，送出請求時會自動剝除。',
    apiKeyTestBtn: '驗證 API Key',
    apiKeyTesting: '驗證中…',
    apiKeyTestOk: '設定有效 ✓',
    apiKeyTestEmpty: '請先填入 API Key',
    apiKeyTestInvalid: 'API Key 無效（401）',
    apiKeyTestForbidden: 'API Key 權限不足（403）',
    apiKeyTestRateLimited: 'API Key 有效，但目前被限流（429）',
    apiKeyTestModelNotFound: '此供應商找不到該模型，請確認模型名稱',
    apiKeyTestNetwork: (msg: string) => `無法連線到供應商：${msg}`,
    apiKeyTestStatus: (status: number, body: string) => `驗證失敗（${status}）：${body}`,
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

    userPrefsLabel: '個人化記憶',
    userPrefsHint: '預設關閉。啟用後會自動學習你的命名與指令風格，並產生少量額外 AI 用量。',
    userPrefsTooltipIcon: '說明',
    userPrefsTooltip:
      '啟用後，Tabby 會在本機記錄你過去親自命名群組的字串、AI 命名你沿用的字串，以及你下過的指令；累積足夠樣本後，會用你目前的 AI 供應商把這些樣本摘要成一段提示，並在下次自動分組時注入給 AI 參考。\n\n注意：摘要呼叫會產生額外的 AI 用量（依供應商計費）。樣本與摘要僅儲存在本機 chrome.storage.local，不同步到雲端。\n\n停用後會立刻停止錄樣與摘要呼叫；已存在的本機資料仍會保留。',

    memoryTitle: '💭 Memory',
    memoryHint: '檢視並編輯個人化記憶的內容；這段摘要會在下次自動分組時注入給 AI 參考。',
    memoryDistilledLabel: '目前的記憶摘要',
    memoryDistilledPlaceholder: '尚未產生記憶。累積一些命名／指令後按下「執行 auto-learn」。',
    memoryDistilledMetaEmpty: '尚未產生',
    memoryDistilledMetaUpdated: (rel: string) => `上次更新：${rel}`,
    memoryDistilledLangMismatch: (cached: string, current: string) =>
      `（記憶語言為 ${cached}，目前 UI 語言為 ${current}；下次 auto-learn 會以目前語言重產）`,
    memoryDistilledCharCount: (n: number, max: number) => `${n} / ${max}`,
    memorySaveBtn: '儲存記憶',
    memorySaved: '已儲存（auto-learn 已暫停）',
    memoryPausedBanner: 'auto-learn 已暫停（你手動編輯過記憶）。背景不會再自動更新，直到你按下「執行 auto-learn」。',
    memoryAutoLearnIdle: '達到門檻後，下次自動分組會在背景重新 auto-learn。',
    memoryRunAutoLearn: '立即執行 auto-learn',
    memoryRunningAutoLearn: '執行中…',
    memoryRanAutoLearn: '已重新產生記憶',
    memorySamplesTitle: '收集到的樣本',
    memorySamplesCount: (n: number) => `（共 ${n} 筆）`,
    memoryBucketUserNames: '你親自命名的（強訊號）',
    memoryBucketAiNames: 'AI 命名你沿用的（弱訊號）',
    memoryBucketInstructions: '你下過的指令',
    memoryBucketEmpty: '（尚無樣本）',
    memorySampleDeleteLabel: '刪除這筆',
    memoryClearBucket: '清空此分類',
    memoryClearAll: '清空全部記憶資料',
    memoryConfirmClearBucket: (name: string) => `確定清空「${name}」全部樣本？`,
    memoryConfirmClearAll: '確定清空全部記憶資料？包括摘要與所有樣本，且無法復原。',
    memoryConfirmRunOverwrite: '你手動編輯過記憶。執行 auto-learn 會以新生成的摘要覆蓋你的編輯，並解除暫停狀態。要繼續嗎？',
    memoryCleared: '已清空',
    errNotEnoughSamples: '樣本太少，先做幾次自動分組或手動命名再試。',

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

    setupEmptyTitle: 'API Key not set',
    setupEmptyHint:
      'Tabby Grouper needs an AI provider API key to group tabs. Open the settings page to finish setup.',
    setupEmptyCta: 'Open settings',

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
    modelFormatHintNoVendor:
      "OpenAI and Gemini don't need a \"vendor/\" prefix — any prefix is stripped automatically when the request is sent.",
    apiKeyTestBtn: 'Test API Key',
    apiKeyTesting: 'Testing…',
    apiKeyTestOk: 'Configuration is valid ✓',
    apiKeyTestEmpty: 'Enter an API Key first',
    apiKeyTestInvalid: 'API Key is invalid (401)',
    apiKeyTestForbidden: 'API Key lacks permission (403)',
    apiKeyTestRateLimited: 'API Key is valid but rate-limited right now (429)',
    apiKeyTestModelNotFound: 'Model not found for this provider — check the model name',
    apiKeyTestNetwork: (msg: string) => `Could not reach the provider: ${msg}`,
    apiKeyTestStatus: (status: number, body: string) => `Test failed (${status}): ${body}`,
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

    userPrefsLabel: 'Personalised memory',
    userPrefsHint: 'Off by default. When enabled, auto-learns your naming and instruction style and adds a small amount of AI usage.',
    userPrefsTooltipIcon: 'Help',
    userPrefsTooltip:
      'When enabled, Tabby keeps a local record of group names you have typed yourself, AI-generated names you have kept, and instructions you have written. Once enough samples accumulate, your configured AI provider is asked to summarise them into a short hint that is injected into the next auto-grouping run.\n\nNote: the summarisation call uses additional AI usage (billed by your provider). Samples and the distilled summary live only in chrome.storage.local on this device and are never synced to the cloud.\n\nDisabling stops sample recording and summarisation calls immediately. Existing on-device data is preserved.',

    memoryTitle: '💭 Memory',
    memoryHint: "View and edit what Tabby has learned about your style. This summary is injected into the next auto-grouping run.",
    memoryDistilledLabel: 'Current memory summary',
    memoryDistilledPlaceholder: 'No memory yet. After a few groupings or renames, click "Run auto-learn".',
    memoryDistilledMetaEmpty: 'Not generated yet',
    memoryDistilledMetaUpdated: (rel: string) => `Last updated: ${rel}`,
    memoryDistilledLangMismatch: (cached: string, current: string) =>
      `(Memory is in ${cached}, current UI language is ${current}; next auto-learn will regenerate it.)`,
    memoryDistilledCharCount: (n: number, max: number) => `${n} / ${max}`,
    memorySaveBtn: 'Save memory',
    memorySaved: 'Saved (auto-learn paused)',
    memoryPausedBanner: "Auto-learn is paused (you edited the memory by hand). It won't update in the background until you click \"Run auto-learn\".",
    memoryAutoLearnIdle: 'Once enough new samples accumulate, the next grouping will refresh this in the background.',
    memoryRunAutoLearn: 'Run auto-learn now',
    memoryRunningAutoLearn: 'Running…',
    memoryRanAutoLearn: 'Memory regenerated',
    memorySamplesTitle: 'Collected samples',
    memorySamplesCount: (n: number) => `(${n} total)`,
    memoryBucketUserNames: 'Names you typed yourself (strong signal)',
    memoryBucketAiNames: 'AI names you kept (weak signal)',
    memoryBucketInstructions: 'Instructions you wrote',
    memoryBucketEmpty: '(no samples)',
    memorySampleDeleteLabel: 'Remove this sample',
    memoryClearBucket: 'Clear this bucket',
    memoryClearAll: 'Clear all memory data',
    memoryConfirmClearBucket: (name: string) => `Clear all samples in "${name}"?`,
    memoryConfirmClearAll: 'Clear all memory data? The summary and every sample will be deleted. This cannot be undone.',
    memoryConfirmRunOverwrite: "You've hand-edited the memory. Running auto-learn will overwrite your edits with a freshly generated summary and clear the paused state. Continue?",
    memoryCleared: 'Cleared',
    errNotEnoughSamples: 'Not enough samples yet — do a few more groupings or renames first.',

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

export function formatRelative(t: ReturnType<typeof tFor>, ts: number): string {
  const min = Math.round((Date.now() - ts) / 60_000);
  if (min < 1) return t('relJustNow');
  if (min < 60) return t('relMinutes')(min);
  const hr = Math.round(min / 60);
  if (hr < 24) return t('relHours')(hr);
  return t('relDays')(Math.round(hr / 24));
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
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle as Key | undefined;
    if (!key) return;
    const v = t(key);
    if (typeof v === 'string') el.title = v;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel as Key | undefined;
    if (!key) return;
    const v = t(key);
    if (typeof v === 'string') el.setAttribute('aria-label', v);
  });
}
