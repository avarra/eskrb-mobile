import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const sqlite = openDatabaseSync('eskrb.db');
sqlite.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
