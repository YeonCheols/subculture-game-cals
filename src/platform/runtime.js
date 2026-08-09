import { Capacitor } from "@capacitor/core";

export function runtimeKind() {
  if (window.electronAPI) return "electron";
  if (Capacitor.isNativePlatform()) return Capacitor.getPlatform();
  return "web";
}

export function isMobileNative() {
  return ["android", "ios"].includes(runtimeKind());
}
