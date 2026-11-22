// Live Slovenian dictation through Soniox. Words appear in the note field as the patient speaks; only the
// confirmed text is ever sent to our backend.
import { RealtimeError, SonioxError } from '@soniox/client';
import { useRecording, type UseRecordingConfig } from '@soniox/react';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { STT } from '@/config';
import { ApiError } from '@/data/http';
import { sonioxConfig } from '@/data/stt';
import { STT_SAMPLE_RATE } from '@/lib/stt/pcm';
import { usePcmSource } from '@/lib/stt/pcm-source';

export type SonioxDictationError = 'denied' | 'failed';

/** Errors that mean "Soniox is not reachable right now", so the caller may fall back to on-device dictation. */
const UNREACHABLE = new Set(['network_error', 'connection_error', 'auth_error', 'timeout', 'http_error']);

function isUnreachable(e: Error): boolean {
  if (e instanceof ApiError) return e.status !== 401; // key endpoint down, not configured, or rate-limited
  if (e instanceof TypeError) return true; // fetch: "Network request failed"
  return e instanceof SonioxError && UNREACHABLE.has(e.code);
}

/** Dev-only diagnostics. Never includes the key: SDK errors carry the WebSocket event, not the handshake. */
function logSttError(e: Error) {
  const raw = e instanceof RealtimeError ? (e.raw as { message?: unknown } | undefined) : undefined;
  console.warn('[stt]', {
    name: e.name,
    message: e.message,
    code: e instanceof SonioxError ? e.code : undefined,
    status: e instanceof SonioxError ? e.statusCode : e instanceof ApiError ? e.status : undefined,
    socket: typeof raw?.message === 'string' ? raw.message : undefined,
    region: STT.region,
  });
}

const SESSION = {
  model: STT.model,
  language_hints: ['sl'],
  language_hints_strict: true,
  audio_format: 'pcm_s16le',
  sample_rate: STT_SAMPLE_RATE,
  num_channels: 1,
  auto_reconnect: false,
} satisfies Partial<UseRecordingConfig>;

/**
 * Same contract as on-device dictation: text in the field before a session stays, and the transcript of the
 * current session is appended after it. `onUnreachable` fires when a session fails before any words arrived
 * because Soniox (or our key endpoint) can't be reached.
 */
export function useSonioxDictation(text: string, setText: (t: string) => void, onUnreachable: () => void) {
  const source = usePcmSource();
  const base = useRef('');
  const live = useRef(false);
  const gotWords = useRef(false);
  const [usedDictation, setUsedDictation] = useState(false);
  const [error, setError] = useState<SonioxDictationError | null>(null);

  const recording = useRecording({
    ...SESSION,
    config: sonioxConfig,
    permissions: null,
    source,
    onResult: (r) => {
      if (live.current && r.tokens.some((t) => t.text.trim() && !t.text.startsWith('<'))) {
        gotWords.current = true;
        setUsedDictation(true);
      }
    },
    onError: (e) => {
      live.current = false;
      if (__DEV__) logSttError(e);
      if (gotWords.current) return; // e.g. the 5-minute session cap: keep the words, the patient can speak again
      if (isUnreachable(e)) onUnreachable();
      else setError('failed');
    },
  });

  useEffect(() => {
    if (!live.current) return;
    const t = recording.text.trim();
    if (t) setText(base.current ? `${base.current} ${t}` : t);
  }, [recording.text, setText]);

  const cancel = recording.cancel;
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  }, [cancel]);
  useEffect(() => () => cancelRef.current(), []);

  const start = useCallback(async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('denied');
      return;
    }
    base.current = text.trim();
    gotWords.current = false;
    live.current = true;
    recording.start();
  }, [text, recording]);

  // `live` stays set after stop so the final words still land; the next start resets the transcript.
  const stop = useCallback(() => recording.stop(), [recording]);

  return { state: recording.isActive ? ('listening' as const) : ('idle' as const), start, stop, usedDictation, error };
}
