import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER } from '@/config';
import { sl } from '@/copy/sl';
import { pushRoute } from '@/lib/push-route';

const CHANNEL = 'reminders';
const CHECKIN_URL = '/checkin';

/** Show reminders while the app is open too. */
export function installNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: sl.notification.channel,
    importance: AndroidImportance.HIGH,
  });
}

const content: Notifications.NotificationContentInput = {
  title: sl.notification.title,
  body: sl.notification.body,
  data: { url: CHECKIN_URL },
};

export async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Ask once, then schedule the daily reminder. Returns whether reminders are on. */
export async function enableDailyReminder(): Promise<boolean> {
  await ensureChannel(); // Android 13+: the channel must exist before the prompt.
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  await scheduleDailyReminder();
  return true;
}

export async function scheduleDailyReminder() {
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.content.data?.kind === 'daily').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  await Notifications.scheduleNotificationAsync({
    content: { ...content, data: { ...content.data, kind: 'daily' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REMINDER.hour, minute: REMINDER.minute, channelId: CHANNEL },
  });
}

/** Debug: fire the same reminder in `seconds`. Returns false when notifications are not allowed. */
export async function fireReminderIn(seconds: number): Promise<boolean> {
  await ensureChannel();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL },
  });
  return true;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function urlFrom(response: Notifications.NotificationResponse | null | undefined): string | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const data = response.notification.request.content.data;
  // Local reminders carry `url`; server pushes carry `kind` (+ `episodeId`).
  return typeof data?.url === 'string' ? data.url : pushRoute(data);
}
