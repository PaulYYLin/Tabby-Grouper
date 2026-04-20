export type Message = { type: 'GROUP_TABS'; instruction?: string };

export type GroupTabsResponse =
  | { ok: true; groupCount: number; groupedTabCount: number }
  | { ok: false; error: string };
