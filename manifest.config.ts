import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extension_name__',
  version: pkg.version,
  description: '__MSG_extension_description__',
  permissions: ['tabs', 'tabGroups', 'storage', 'notifications'],
  host_permissions: [
    'https://openrouter.ai/*',
    'https://api.openai.com/*',
    'https://generativelanguage.googleapis.com/*',
  ],
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
