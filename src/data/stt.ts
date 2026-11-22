// Soniox connection config for live dictation. The backend mints a short-lived, single-use key per stream;
// the main Soniox key never reaches the phone. Audio goes phone → Soniox and never touches our server.
import type { SonioxConnectionConfig } from '@soniox/client';

import { STT } from '@/config';
import { sttKey, type SttKey } from '@/data/api';
import { request } from '@/data/http';

export async function fetchSttKey(): Promise<SttKey> {
  return sttKey.parse(await request('/stt/temporary-key', { method: 'POST' }));
}

/** Resolved by the Soniox SDK once per recording session, so every stream gets a fresh key. */
export async function sonioxConfig(): Promise<SonioxConnectionConfig> {
  const key = await fetchSttKey();
  return { api_key: key.apiKey, region: STT.region };
}
