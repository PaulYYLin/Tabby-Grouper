# Tabby Grouper

使用 AI 自動分析並分組 Chrome 分頁的 MV3 擴充功能。支援 [OpenRouter](https://openrouter.ai)、[OpenAI](https://platform.openai.com)、[Google Gemini](https://aistudio.google.com) 三家供應商，呼叫你選擇的模型（Claude、Gemini、GPT 等），僅依分頁**標題**與**網域**把相關分頁放進同一個 Chrome 分頁群組；不讀取分頁內容，也不送出完整網址。

## 特色

- 一鍵分組目前視窗內的分頁
- 使用者自備 API Key，支援 OpenRouter / OpenAI / Google Gemini，可任選模型
- 每家供應商的 API Key 與模型各自記一份，切換不互相覆蓋
- 支援自訂過濾規則（例如「只分組工作相關」、「只處理 YouTube 和 GitHub」）
- **跨 session 任務記憶**：AI 分組會自動存成「任務」，關掉 Chrome 後再打開，popup 會詢問是否一鍵恢復昨天的研究主題
- API Key 僅儲存於 `chrome.storage.sync`、任務快照僅儲存於 `chrome.storage.local`，皆不經過開發者伺服器
- 輸出經過嚴格驗證：`tabIds` 必須在白名單內、分組名非空、每組至少 2 個分頁

## 安裝

### 從原始碼建置

```bash
npm install
npm run build
```

建置完成後會在 `dist/` 產生擴充功能檔案。在 Chrome 開啟 `chrome://extensions`，開啟右上角「開發人員模式」，點「載入未封裝項目」並選擇 `dist/`。

### 打包

```bash
npm run zip
```

會在專案根目錄產生 `tabby-grouper.zip`，可上傳至 Chrome Web Store 或分發。

## 使用

1. 安裝後點擊工具列的 Tabby Grouper 圖示 → 「開啟設定」
2. 選擇 AI 供應商，貼上對應的 API Key（[OpenRouter](https://openrouter.ai/keys) / [OpenAI](https://platform.openai.com/api-keys) / [Google AI Studio](https://aistudio.google.com/apikey)），可選填模型名稱
3. 回到 popup，視需要在文字框輸入過濾規則（上限 512 字），按「分組目前視窗的分頁」

### 任務記憶與恢復

- AI 每次分組成功後，每個群組會自動存成一筆「任務」快照（名稱、顏色、分頁標題與網址）。
- popup 切到「任務」分頁可看到所有快照，每筆可單獨「恢復」或「刪除」。
- 群組內所有分頁被關閉時，任務會被標為已封存；下次打開 popup（或重啟 Chrome 後）會在最上方顯示 banner 詢問是否一鍵恢復。
- 已封存任務若超過 7 天會自動清除；可隨時手動刪除。
- 所有任務資料僅儲存於本機 `chrome.storage.local`，**不會**傳給 OpenRouter 或任何第三方。

## 開發

```bash
npm run dev          # Vite dev 模式
npm run type-check   # TypeScript 型別檢查
npm run test         # Vitest 單元測試
npm run gen:icons    # 從來源產生各尺寸圖示
```

技術棧：Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) + 純 TypeScript，無框架。

## 專案結構

```
src/
├── background.ts         # Service worker：接收訊息、呼叫 API、建立群組、註冊 tabGroups 監聽器
├── lib/
│   ├── openrouter.ts     # AI 供應商（OpenRouter / OpenAI / Gemini）呼叫與輸出驗證
│   ├── grouping.ts       # 共用 helpers：pickColor、isGroupableTab
│   ├── tasks.ts          # Task 型別、storage key 常數、保留期/容量上限
│   ├── storage.ts        # chrome.storage.local 讀寫、CAS lock、lazy prune
│   ├── groupSync.ts      # group↔task 對映重建、pendingResume 偵測、name/color 同步
│   ├── resume.ts         # 任務恢復演算法
│   ├── messages.ts       # background ↔ popup 訊息型別（discriminated union）
│   ├── *.test.ts         # Vitest 單元測試
├── popup/                # 工具列 popup UI（分組 / 任務 兩個 view）
└── options/              # 設定頁（API Key、模型）
```

## 限制與安全性

- **Instruction 長度上限 512 字**，超過會被 textarea `maxlength` 擋下，即使繞過也會在 `classifyTabs` 入口 throw
- **`max_tokens: 2048`**，避免模型輸出過長浪費 token
- **Prompt injection**：分頁標題屬於外部不可信輸入，惡意網站理論上可操控 LLM 回傳內容。但輸出經 `isGroupResultShape` 驗證 + `validIds` 白名單過濾，最壞情況僅為分組名稱被操控，不會執行任意程式碼或洩漏資料（API Key 僅存在於 HTTP header，不在 prompt 中）

## 變更紀錄

見 [CHANGELOG.md](./CHANGELOG.md)。

## 隱私權

見 [PRIVACY.md](./PRIVACY.md)。簡言之：
- 送到 AI 供應商（OpenRouter / OpenAI / Gemini）的只有**分頁標題**與**網域（hostname）**（例如 `github.com`），**不會送出完整網址**（不含 path、query、hash）
- 任務快照（含完整網址、標題、favicon）僅儲存於本機 `chrome.storage.local`，**不會上傳**；封存超過 7 天自動清除，亦可手動刪除
- 不讀取分頁內容、Cookie、表單、歷史、書籤等其他瀏覽器資料

