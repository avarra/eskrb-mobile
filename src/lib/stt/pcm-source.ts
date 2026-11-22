// Microphone → Soniox audio source. expo-audio streams PCM buffers to JS; they are forwarded to the Soniox
// WebSocket and dropped. `startFileRecordingAsync` is never called, so no audio is written to disk.
import type { AudioSource, AudioSourceHandlers } from '@soniox/client';
import { setAudioModeAsync, useAudioStream, type AudioStreamBuffer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import { STT_SAMPLE_RATE, toPcm16kMono } from '@/lib/stt/pcm';

function chunk(b: AudioStreamBuffer): ArrayBuffer {
  // Copy: the SDK may queue chunks while it connects.
  return b.sampleRate === STT_SAMPLE_RATE && b.channels === 1 ? b.data.slice(0) : toPcm16kMono(b.data, b.sampleRate, b.channels);
}

/** A stable Soniox `AudioSource` (pcm_s16le, 16 kHz, mono) backed by the expo-audio microphone stream. */
export function usePcmSource(): AudioSource {
  const handlers = useRef<AudioSourceHandlers | null>(null);
  const { stream } = useAudioStream({
    sampleRate: STT_SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: (b) => handlers.current?.onData(chunk(b)),
  });

  const streamRef = useRef(stream);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const [source] = useState<AudioSource>(() => ({
    async start(h) {
      handlers.current = h;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await streamRef.current.start();
    },
    stop() {
      handlers.current = null;
      try {
        if (streamRef.current.isStreaming) streamRef.current.stop();
      } catch {
        // Already released.
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    },
  }));
  return source;
}
