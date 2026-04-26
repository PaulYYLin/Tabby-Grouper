export const COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
];

export function pickColor(name: string): chrome.tabGroups.ColorEnum {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function isGroupableTab(
  t: chrome.tabs.Tab,
): t is chrome.tabs.Tab & { id: number; url: string } {
  if (typeof t.id !== 'number' || !t.url || t.pinned) return false;
  try {
    const proto = new URL(t.url).protocol;
    return proto === 'http:' || proto === 'https:';
  } catch {
    return false;
  }
}
