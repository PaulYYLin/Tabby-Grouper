# Changelog

本檔案記錄此專案的所有重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [1.0.0] - 2026-05-05

### 新增
- 設定頁新增「個人化記憶」管理區塊：可檢視 / 編輯 AI 蒸餾後的提示文字、刪除個別 user 命名 / AI 命名 / 指令樣本，或批次清除單一類別與全部記憶資料
- 個人化記憶新增「暫停／繼續自動學習」開關，可在不關閉整個功能的前提下停止錄樣與蒸餾
- 設定頁可手動觸發「立即重新蒸餾」，不必等樣本累積到門檻
- popup「任務」分頁可直接重新命名任務，會同步寫回 Chrome 群組標題
- 設定頁 API Key 欄位新增即時格式驗證與初次設定流程的引導 UI（OpenRouter / OpenAI / Gemini 各自 prefix 規則）
- 設定頁「個人化記憶」開關旁新增 ⓘ tooltip，hover / 鍵盤聚焦會顯示用途與額外 AI 用量說明

### 變更
- `Message` 型別新增 `UPDATE_TASK_NAME`、`GET_MEMORY`、`UPDATE_DISTILLED`、`REMOVE_MEMORY_SAMPLE`、`CLEAR_MEMORY_SAMPLES`、`CLEAR_MEMORY_ALL`、`RUN_AUTO_LEARN` variant，搭配新增的記憶管理與重新命名功能
- 加入 GitHub Actions：CI（PR 自動跑 type-check + test）與 Release（推 `vX.Y.Z` tag 後自動上傳到 Chrome Web Store 並建立 GitHub Release）
- 加入本地 pre-commit hook 自動執行 `tsc --noEmit`，避免型別錯誤被推上去

## [0.4.1] - 2026-05-01

### 修正
- 修正 OpenAI 與 Gemini 不接受 `vendor/model` 前綴格式（例如 `openai/gpt-4o-mini`）導致 404 的問題；現在僅 OpenRouter 保留前綴，OpenAI / Gemini 會自動移除 `vendor/` 前綴後再送出請求

## [0.4.0] - 2026-04-30

### 新增
- **「個人化記憶」選用功能（預設關閉）**：在設定頁啟用後，會在本機記錄使用者親自命名的群組名稱、AI 命名後使用者沿用的名稱、以及使用者下過的指令；累積足夠樣本後，會額外呼叫一次選定的 AI 供應商把樣本摘要成提示，於下次分組時注入給 AI 參考。
- 設定頁新增 ⓘ tooltip 解釋個人化記憶機制與會產生的額外 AI 用量
- 新增英文版 README（README.en.md）

### 變更
- PRIVACY.md 同步揭露「個人化記憶」啟用後送出的資料類別（過往群組名稱與指令文字），並說明預設關閉、僅本機儲存、可隨時關閉
- README 新增「個人化記憶（選用）」段落
- CLAUDE.md 更新 storage table 與新增 user-preferences 段落

## [0.3.1] - 2026-04-26

### 新增
- 多 AI 供應商支援：OpenRouter、OpenAI、Google Gemini，皆走 OpenAI-compatible Chat Completions
- 設定頁新增「AI 供應商」下拉選單，切換時自動更新 API Key 連結、預設模型、placeholder
- API Key 與模型改為**每個供應商各自記一份**：切換供應商時自動載入該家先前儲存的設定，不互相覆蓋

### 變更
- `manifest.json` `host_permissions` 加入 `api.openai.com` 與 `generativelanguage.googleapis.com`
- 錯誤訊息改為通用化：`OpenRouter 401: …` → `OpenRouter / OpenAI / Gemini 401: …`
- 舊版單一 `apiKey` / `model` 設定首次讀取時會自動遷移為 OpenRouter 的紀錄

## [0.3.0] - 2026-04-26

### 新增
- 多語言（i18n）支援與語言選項
- 任務搜尋功能
- 任務摘要顯示
- 待加入分頁（pending additions）：偵測屬於既有任務的新分頁並提示一鍵加入

### 變更
- 重構 background 與 popup 腳本，簡化任務管理流程
- 重構任務渲染與 UI 互動
- 改善 popup UI 樣式與設定/popup 配色（brand / accent CSS 變數）
- 圖示資產改用 PNG，移除舊版 SVG 與 icon 生成腳本對應調整

## [0.2.0] - 先前版本

- 任務管理：儲存、恢復、刪除分組快照
- 任務綁定與 group 同步
- 任務資料儲存於 `chrome.storage.local`，含保留期限與容量上限
- 隱私權政策更新

## [0.1.0] - 初始版本

- 一鍵 AI 分組目前視窗的分頁
- OpenRouter API 整合，使用者自備 API Key 與模型
- 自訂過濾規則
