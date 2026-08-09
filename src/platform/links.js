import { Browser } from "@capacitor/browser";
import { isMobileNative } from "./runtime";

export async function openExternalUrl(url) {
  if (window.electronAPI?.openExternal) return window.electronAPI.openExternal(url);
  if (isMobileNative()) return Browser.open({ url });
  return window.open(url, "_blank", "noopener,noreferrer");
}
