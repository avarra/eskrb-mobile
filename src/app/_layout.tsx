import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from '@expo-google-fonts/lexend';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { db } from '@/data/db/client';
import { device } from '@/data';
import { tokenStore } from '@/data/auth';
import { setUnauthorizedHandler } from '@/data/http';
import { keys, queryClient } from '@/data/queries';
import { registerPushToken } from '@/lib/push';
import { installNotificationHandler, urlFrom } from '@/lib/reminder';
import { colors } from '@/theme/tokens';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();
installNotificationHandler();

// Refetch when the app comes back to the foreground (React Native has no window focus).
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

// A rejected token anywhere (revoked, expired) signs the patient out and returns to sign-in.
let signingOut = false;
setUnauthorizedHandler(() => {
  if (signingOut) return;
  signingOut = true;
  device
    .signOut()
    .catch(() => {})
    .finally(() => {
      queryClient.clear();
      queryClient.setQueryData(keys.session, false);
      router.replace('/setup');
      signingOut = false;
    });
});

/**
 * Tapping a notification (daily reminder or server push) opens its screen, whether the app was running or not.
 * Only when signed in: signed out, `index` already sends the patient to sign-in.
 */
function useNotificationRouting(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const open = async (response: Notifications.NotificationResponse | null) => {
      const url = urlFrom(response);
      if (!url) return;
      Notifications.clearLastNotificationResponse();
      if (!(await tokenStore.get())) return;
      router.navigate(url as '/checkin');
    };
    void open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener((response) => void open(response));
    return () => sub.remove();
  }, [ready]);
}

/**
 * Re-register on every start (the backend drops stale tokens). Silent: only runs if notifications were already allowed.
 * No `addPushTokenListener` here: on iOS every token fetch emits that event, so re-registering from it loops.
 */
function usePushRegistration(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      if (await tokenStore.get()) await registerPushToken();
    })();
  }, [ready]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold });
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const ready = (fontsLoaded || !!fontError) && (migrated || !!migrationError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  useNotificationRouting(ready && migrated);
  usePushRegistration(ready && migrated);

  if (!ready) return null;
  if (migrationError) {
    return (
      <Screen>
        <Text variant="body">Podatkov ni bilo mogoče odpreti. Znova zaženite aplikacijo.</Text>
      </Screen>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="setup" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="note" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: '#000' } }} />
          <Stack.Screen name="exercises/index" />
          <Stack.Screen name="exercises/[id]" options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: '#000' } }} />
          <Stack.Screen name="notes" />
          <Stack.Screen name="message/[id]" />
          <Stack.Screen name="debug" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
