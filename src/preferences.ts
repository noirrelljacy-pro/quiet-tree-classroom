import { DEFAULTS, normalizeSettings, type Settings } from './config';
const KEY = 'quiet-tree.preferences.v1';
export function loadSettings(): Settings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
