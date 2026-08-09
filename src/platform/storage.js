import { Preferences } from "@capacitor/preferences";
import { isMobileNative } from "./runtime";

export async function readPreference(key, fallback) {
  try {
    const raw = isMobileNative() ? (await Preferences.get({ key })).value : localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writePreference(key, value) {
  const raw = JSON.stringify(value);
  if (isMobileNative()) await Preferences.set({ key, value: raw });
  else localStorage.setItem(key, raw);
}
