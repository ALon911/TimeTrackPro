import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

// Use SQLite database for development
const dbPath = path.resolve(process.cwd(), 'db', 'timetracker.db');
console.log('Using SQLite database at path:', dbPath);

let sqlite: Database.Database;
let isReadOnly = false;

try {
  // נסה לפתוח עם הרשאות כתיבה
  sqlite = new Database(dbPath, { fileMustExist: true });
  console.log('Successfully opened database with write access.');
} catch (error: any) {
  console.warn('Could not open database with write access:', error.message);
  console.log('Trying to open in read-only mode...');
  
  try {
    // נסה לפתוח במצב קריאה בלבד
    sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
    isReadOnly = true;
    console.log('Successfully opened database in READ-ONLY mode.');
  } catch (error: any) {
    console.error('Failed to open database even in read-only mode:', error.message);
    throw new Error(`Could not open database: ${error.message}`);
  }
}

// הוסף מידע על מצב הדאטאבייס למטה
export const db = drizzle(sqlite, { schema });
export const isDatabaseReadOnly = () => isReadOnly;