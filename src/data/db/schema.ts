// Device-only state. Everything clinical lives on the server; the phone keeps only what the server doesn't track yet.
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Small key/value store (e.g. whether we already asked for notifications). */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** When the patient opened a care-team message. Replace with server read state when it exists. */
export const messageReads = sqliteTable('message_reads', {
  messageId: text('message_id').primaryKey(),
  readAt: text('read_at').notNull(),
});
