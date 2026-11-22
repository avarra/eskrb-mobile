// Server push: register this device's Expo push token with the backend (`/me/push-token`).
// Never prompts for permission: the home screen's reminder ask is the one prompt.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { sl } from '@/copy/sl';
import { request } from '@/data/http';

/** Expo delivers pushes without a `channelId` to the channel with id `default`. */
const CHANNEL = 'default';

let lastToken: string | null = null;

async function ensureDefaultChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: sl.notification.pushChannel,
    importance: AndroidImportance.HIGH,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
}

async function expoToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulators can't get a push token.
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string') throw new Error('Missing extra.eas.projectId in app config');
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

let inFlight: Promise<void> | null = null;

/** Send this device's token to the backend. Safe to call on every start; concurrent calls share one request; never throws. */
export function registerPushToken(): Promise<void> {
  inFlight ??= register().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function register(): Promise<void> {
  try {
    await ensureDefaultChannel();
    const token = await expoToken();
    if (!token) return;
    await request('/me/push-token', { method: 'POST', body: { expoToken: token, platform: Platform.OS } });
    lastToken = token;
  } catch (e) {
    console.warn('[push] registration failed', e);
  }
}

/** Remove this device's token before signing out. Best effort: gives up after 3 s, never throws. */
export async function unregisterPushToken(): Promise<void> {
  const attempt = async () => {
    const token = lastToken ?? (await expoToken());
    if (!token) return;
    await request('/me/push-token', { method: 'DELETE', body: { expoToken: token } });
    lastToken = null;
  };
  try {
    await Promise.race([attempt(), new Promise((resolve) => setTimeout(resolve, 3000))]);
  } catch (e) {
    console.warn('[push] unregister failed', e);
  }
}
