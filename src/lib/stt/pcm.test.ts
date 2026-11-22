import { describe, expect, it } from 'vitest';

import { sttKey } from '../../data/api';
import { toPcm16kMono } from './pcm';

describe('toPcm16kMono', () => {
  it('passes 16 kHz mono through unchanged', () => {
    const input = Int16Array.from([0, 100, -100, 32767, -32768]);
    expect(Array.from(new Int16Array(toPcm16kMono(input.buffer, 16000, 1)))).toEqual(Array.from(input));
  });

  it('downmixes 48 kHz stereo to 16 kHz mono', () => {
    // 6 stereo frames: L = 300 * f, R = 100 * f → mono 200 * f; every third frame is kept.
    const frames = [0, 1, 2, 3, 4, 5];
    const input = Int16Array.from(frames.flatMap((f) => [300 * f, 100 * f]));
    expect(Array.from(new Int16Array(toPcm16kMono(input.buffer, 48000, 2)))).toEqual([0, 600]);
  });

  it('interpolates between samples when rates are not integer multiples', () => {
    const input = Int16Array.from([0, 100, 200, 300]);
    // 24 kHz → 16 kHz: positions 0, 1.5 → 0, 150
    expect(Array.from(new Int16Array(toPcm16kMono(input.buffer, 24000, 1)))).toEqual([0, 150]);
  });
});

describe('stt temporary key', () => {
  it('parses the server DTO', () => {
    expect(sttKey.parse({ apiKey: 'temp:abc', expiresAt: '2026-11-22T10:00:00Z' })).toEqual({
      apiKey: 'temp:abc',
      expiresAt: '2026-11-22T10:00:00Z',
    });
  });

  it('rejects an empty key', () => {
    expect(() => sttKey.parse({ apiKey: '', expiresAt: '2026-11-22T10:00:00Z' })).toThrow();
  });
});
