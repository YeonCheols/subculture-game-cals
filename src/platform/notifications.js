import { LocalNotifications } from "@capacitor/local-notifications";
import { DEFAULT_REMINDER_OFFSET_MINUTES, reminderAt } from "../core/schedules";
import { isMobileNative, runtimeKind } from "./runtime";
import { readPreference, writePreference } from "./storage";

const SCHEDULED_IDS_KEY = "gametime:native-scheduled-notification-ids";

function numericId(eventId) {
  let hash = 2166136261;
  for (const character of eventId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash & 0x7fffffff;
}

async function permissionGranted() {
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display === "prompt") permission = await LocalNotifications.requestPermissions();
  return permission.display === "granted";
}

async function cancelIds(ids) {
  if (ids.length) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
}

export async function syncNativeReminders(events, selectedIds) {
  if (!isMobileNative()) return { supported: false, scheduled: 0 };
  const previousIds = await readPreference(SCHEDULED_IDS_KEY, []);
  await cancelIds(previousIds);
  const selected = events.filter((event) => selectedIds.includes(event.id)).map((event) => ({ event, at: reminderAt(event) })).filter(({ at }) => at && at.getTime() > Date.now());
  if (!selected.length) {
    await writePreference(SCHEDULED_IDS_KEY, []);
    return { supported: true, permission: "not-requested", scheduled: 0 };
  }
  if (!(await permissionGranted())) {
    await writePreference(SCHEDULED_IDS_KEY, []);
    return { supported: true, permission: "denied", scheduled: 0 };
  }

  const notifications = selected.map(({ event, at }) => ({
    id: numericId(event.id),
    title: `${event.title}`,
    body: `${DEFAULT_REMINDER_OFFSET_MINUTES}분 후 일정이 시작됩니다.`,
    schedule: { at, allowWhileIdle: true },
    extra: { eventId: event.id },
    channelId: "schedule-reminders",
    autoCancel: true,
  }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  await writePreference(SCHEDULED_IDS_KEY, notifications.map(({ id }) => id));
  return { supported: true, permission: "granted", scheduled: notifications.length };
}

export async function showTestNotification() {
  if (!isMobileNative()) return window.electronAPI?.testNotification?.("게임타임", "알림 설정이 정상적으로 연결되었습니다.");
  if (!(await permissionGranted())) return false;
  await LocalNotifications.schedule({ notifications: [{ id: 2147483000, title: "게임타임", body: "알림 설정이 정상적으로 연결되었습니다.", schedule: { at: new Date(Date.now() + 1000) }, channelId: "schedule-reminders", autoCancel: true }] });
  return true;
}

export async function initializeNativeNotifications(onOpenEvent) {
  if (!isMobileNative()) return () => {};
  if (runtimeKind() === "android") await LocalNotifications.createChannel({ id: "schedule-reminders", name: "일정 알림", description: "구독한 게임 일정 시작 전 알림", importance: 4, visibility: 1, vibration: true });
  const listener = await LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
    const eventId = notification.extra?.eventId;
    if (eventId) onOpenEvent(eventId);
  });
  return () => listener.remove();
}
