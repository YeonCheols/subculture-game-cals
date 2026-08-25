import { useSyncExternalStore } from "react";
import { runtimeKind } from "../platform/runtime";
import { DesktopWebApp } from "./DesktopWebApp";
import { ElectronApp } from "./ElectronApp";
import { MobileWebApp } from "./MobileWebApp";
import { NativeMobileApp } from "./NativeMobileApp";

const MOBILE_BREAKPOINT = 820;

function subscribeToViewport(callback) {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function mobileViewportSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function serverViewportSnapshot() {
  return false;
}

function WebAppEntry() {
  const isMobileViewport = useSyncExternalStore(subscribeToViewport, mobileViewportSnapshot, serverViewportSnapshot);
  return isMobileViewport ? <MobileWebApp /> : <DesktopWebApp />;
}

export function RuntimeEntry() {
  const runtime = runtimeKind();
  if (runtime === "electron") return <ElectronApp />;
  if (runtime === "android" || runtime === "ios") return <NativeMobileApp />;
  return <WebAppEntry />;
}
