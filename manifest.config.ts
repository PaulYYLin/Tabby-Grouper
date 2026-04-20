import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Tabby Grouper',
  version: pkg.version,
  description: '使用 AI 自動分析並分組 Chrome 分頁',
  permissions: ['tabs', 'tabGroups', 'storage'],
  host_permissions: ['https://openrouter.ai/*'],
  action: {
    default_popup: 'src/popup/popup.html',
    default_title: 'Tabby Grouper',
    default_icon: {
      16: 'icons/16.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
  },
  icons: {
    16: 'icons/16.png',
    48: 'icons/48.png',
    128: 'icons/128.png',
  },
  options_page: 'src/options/options.html',
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
});
