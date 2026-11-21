// Local tables mirror the contract's entities. Every table has `seed` so test data can be dropped
// on reset and before the migration to the real API.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Answers } from '../api';

const seed = () => integer('seed', { mode: 'boolean' }).notNull().default(false);

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  protocolId: text('protocol_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: text('created_at').notNull(),
  seed: seed(),
});

export const checkIns = sqliteTable('check_ins', {
  id: text('id').primaryKey(),
  episodeId: text('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  answers: text('answers', { mode: 'json' }).$type<Answers>().notNull(),
  authoredBy: text('authored_by').notNull(),
  createdAt: text('created_at').notNull(),
  reviewedAt: text('reviewed_at'),
  reviewedBy: text('reviewed_by'),
  seed: seed(),
});

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  episodeId: text('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['text', 'photo'] }).notNull(),
  source: text('source', { enum: ['typed', 'dictated'] }),
  text: text('text'),
  mediaUrl: text('media_url'),
  extracted: text('extracted', { mode: 'json' }).$type<Answers>().notNull(),
  authoredBy: text('authored_by').notNull(),
  createdAt: text('created_at').notNull(),
  reviewedAt: text('reviewed_at'),
  seed: seed(),
});

export const flags = sqliteTable('flags', {
  id: text('id').primaryKey(),
  episodeId: text('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  sourceType: text('source_type', { enum: ['checkin', 'log'] }).notNull(),
  sourceId: text('source_id').notNull(),
  ruleId: text('rule_id').notNull(),
  severity: text('severity', { enum: ['attention', 'urgent'] }).notNull(),
  quote: text('quote').notNull(),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
  seed: seed(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  episodeId: text('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull(),
  fromName: text('from_name').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  readAt: text('read_at'),
  refType: text('ref_type', { enum: ['checkin', 'log'] }),
  refId: text('ref_id'),
  seed: seed(),
});

/** Small key/value store for device-only state (e.g. whether we already asked for notifications). */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
