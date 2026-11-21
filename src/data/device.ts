// Device-only operations (settings, sign-in/out). Not part of the REST contract.
import { eq } from 'drizzle-orm';

import { tokenStore } from '@/data/auth';
import { db } from '@/data/db/client';
import { messageReads, settings } from '@/data/db/schema';

export const device = {
  async getSetting(key: string): Promise<string | null> {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    return row?.value ?? null;
  },

  async setSetting(key: string, value: string) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  },

  hasToken: async () => !!(await tokenStore.get()),

  signIn: (token: string) => tokenStore.set(token),

  /** Forget the token and everything this patient left on the phone. */
  async signOut() {
    await tokenStore.clear();
    await db.delete(messageReads);
    await db.delete(settings);
  },
};
