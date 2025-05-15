import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

// Use in-memory SQLite for development
const dbPath = path.resolve('./db/timetracker.db');
console.log('Using SQLite database at path:', dbPath);

const sqlite = new Database(dbPath, { 
  // readonly: true // Uncomment if needed for deployment 
});

export const db = drizzle(sqlite, { schema });