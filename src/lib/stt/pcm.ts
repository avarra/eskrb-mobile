// Pure PCM helpers for the Soniox stream (pcm_s16le, 16 kHz, mono).

export const STT_SAMPLE_RATE = 16000;

/**
 * Downmixes interleaved int16 PCM to mono and linearly resamples it to 16 kHz. The microphone may deliver
 * a different rate than requested, and Soniox is told 16 kHz mono up front.
 */
export function toPcm16kMono(data: ArrayBuffer, sampleRate: number, channels: number): ArrayBuffer {
  const input = new Int16Array(data);
  const frames = Math.floor(input.length / channels);

  const mono = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += input[f * channels + c];
    mono[f] = sum / channels;
  }

  if (sampleRate === STT_SAMPLE_RATE) return Int16Array.from(mono, Math.round).buffer;

  const ratio = sampleRate / STT_SAMPLE_RATE;
  const outLength = Math.floor(frames / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const next = j + 1 < frames ? mono[j + 1] : mono[j];
    out[i] = Math.round(mono[j] + (next - mono[j]) * (pos - j));
  }
  return out.buffer;
}
