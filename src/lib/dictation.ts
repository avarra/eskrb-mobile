// Dictation for the note field. `useDictation` streams to Soniox (see `src/lib/stt/`) when STT.engine is
// 'soniox', and falls back to on-device dictation when Soniox or the key endpoint can't be reached.
//
// On-device dictation: the recording is never written to a file or sent anywhere:
// - no `recordingOptions` are passed, so the library does not persist audio;
// - `requiresOnDeviceRecognition: true` (iOS enforced by patches/expo-speech-recognition@58.0.1.patch,
//   Android 13+ uses SpeechRecognizer.createOnDeviceSpeechRecognizer);
// - if on-device recognition for sl-SI is unavailable, the microphone is hidden. No server fallback.
import { requireOptionalNativeModule } from 'expo';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { STT } from '@/config';
import { useSonioxDictation } from '@/lib/stt/use-soniox-dictation';

export const DICTATION_LOCALE = 'sl-SI';
const ANDROID_ON_DEVICE_SERVICE = 'com.google.android.as';

type PatchedModule = { supportsOnDeviceRecognitionForLocale?: (locale: string) => boolean };

function matchesSlovenian(locales: readonly string[]): boolean {
  return locales.some((l) => /^sl([-_]SI)?$/i.test(l));
}

/** True only when this phone can recognise Slovenian without sending audio off the device. */
export async function canDictateOnDevice(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const patched = requireOptionalNativeModule<PatchedModule>('ExpoSpeechRecognition');
      // Without the patched check we cannot prove on-device support for sl-SI, so we hide the mic.
      if (!patched?.supportsOnDeviceRecognitionForLocale) return false;
      if (!patched.supportsOnDeviceRecognitionForLocale(DICTATION_LOCALE)) return false;
      const { locales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
      return matchesSlovenian(locales);
    }
    if (Platform.OS === 'android') {
      if (typeof Platform.Version !== 'number' || Platform.Version < 33) return false;
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
      const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: ANDROID_ON_DEVICE_SERVICE,
      });
      return matchesSlovenian(installedLocales);
    }
    return false;
  } catch {
    return false;
  }
}

export type DictationState = 'checking' | 'unavailable' | 'idle' | 'listening';

/**
 * Words appear in the field as the patient speaks. Text that was in the field before a session
 * stays; the transcript of the current session is appended after it.
 */
export function useDeviceDictation(text: string, setText: (t: string) => void) {
  const [state, setState] = useState<DictationState>('checking');
  const [usedDictation, setUsedDictation] = useState(false);
  const [error, setError] = useState<'denied' | 'failed' | null>(null);
  const base = useRef('');

  useEffect(() => {
    let alive = true;
    canDictateOnDevice().then((ok) => alive && setState(ok ? 'idle' : 'unavailable'));
    return () => {
      alive = false;
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('end', () => setState((s) => (s === 'listening' ? 'idle' : s)));
  useSpeechRecognitionEvent('result', (e) => {
    const transcript = e.results[0]?.transcript?.trim() ?? '';
    if (!transcript) return;
    const joined = base.current ? `${base.current} ${transcript}` : transcript;
    setText(joined);
    setUsedDictation(true);
    if (e.isFinal) base.current = joined;
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    setError(e.error === 'not-allowed' ? 'denied' : 'failed');
    // language-not-supported / service-not-allowed: on-device model missing. Never retry on a server.
    if (e.error === 'language-not-supported' || e.error === 'service-not-allowed') setState('unavailable');
  });

  const start = useCallback(async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('denied');
      return;
    }
    base.current = text.trim();
    ExpoSpeechRecognitionModule.start({
      lang: DICTATION_LOCALE,
      interimResults: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      continuous: false,
      androidRecognitionServicePackage: Platform.OS === 'android' ? ANDROID_ON_DEVICE_SERVICE : undefined,
    });
  }, [text]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { state, start, stop, usedDictation, error };
}

export type DictationError = 'denied' | 'failed' | 'offline';

/**
 * The note screen's dictation. Soniox first (when enabled); if it can't be reached before any words arrive,
 * on-device dictation takes over for the rest of the screen, and if that isn't available either, typing.
 */
export function useDictation(text: string, setText: (t: string) => void) {
  const device = useDeviceDictation(text, setText);
  const [engine, setEngine] = useState<'soniox' | 'device'>(STT.engine);
  const [offline, setOffline] = useState(false);

  const soniox = useSonioxDictation(text, setText, () => {
    if (device.state === 'idle') {
      setEngine('device');
      device.start();
    } else {
      setOffline(true);
    }
  });

  const active = engine === 'soniox' ? soniox : device;
  const error: DictationError | null = offline ? 'offline' : active.error;

  const start = useCallback(() => {
    setOffline(false);
    return active.start();
  }, [active]);

  return {
    state: active.state,
    start,
    stop: active.stop,
    usedDictation: soniox.usedDictation || device.usedDictation,
    error,
  };
}
