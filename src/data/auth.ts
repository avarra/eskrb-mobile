// The access token lives in the keychain / keystore. The backend has no login endpoint yet: staff hand the
// patient a token (pasted or as a QR code) and `GET /me` validates it.
import * as SecureStore from 'expo-secure-store';

const KEY = 'eskrb.token';

let cached: string | null | undefined;

export const tokenStore = {
  async get(): Promise<string | null> {
    if (cached === undefined) cached = await SecureStore.getItemAsync(KEY);
    return cached;
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    cached = token;
  },
  async clear(): Promise<void> {
    cached = null;
    await SecureStore.deleteItemAsync(KEY);
  },
  /** Synchronous read of the cached value, for image headers. Null until `get()` has run once. */
  peek(): string | null {
    return cached ?? null;
  },
};

/** QR codes may carry the bare token or `eskrb:<token>`; pasted text may have stray whitespace. */
export function normalizeToken(raw: string): string {
  return raw.trim().replace(/^eskrb:/i, '').trim();
}
