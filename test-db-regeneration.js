#!/usr/bin/env node

/**
 * Test script to verify database regeneration functionality
 * This script will:
 * 1. Delete the database file
 * 2. Start the server to test automatic regeneration
 * 3. Check if the database is recreated properly
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const dbPath = path.join(process.cwd(), 'db', 'timetrack.db');

console.log('🧪 Testing database regeneration functionality...\n');

// Step 1: Check if database exists
if (fs.existsSync(dbPath)) {
  console.log('📁 Database file exists, deleting it...');
  fs.unlinkSync(dbPath);
  console.log('✅ Database file deleted');
} else {
  console.log('📁 Database file does not exist');
}

// Step 2: Check if db directory exists
const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  console.log('📁 Database directory does not exist, creating it...');
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Database directory created');
}

// Step 3: Start the server to test automatic regeneration
console.log('\n🚀 Starting server to test automatic database regeneration...');
console.log('   The server should automatically create a new database file.');
console.log('   Press Ctrl+C to stop the server after verification.\n');

const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle server exit
server.on('close', (code) => {
  console.log(`\n📊 Server exited with code ${code}`);
  
  // Check if database was recreated
  if (fs.existsSync(dbPath)) {
    console.log('✅ SUCCESS: Database file was automatically recreated!');
    console.log('✅ Database regeneration is working correctly.');
  } else {
    console.log('❌ FAILURE: Database file was not recreated.');
    console.log('❌ Database regeneration is not working.');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGINT');
  process.exit(0);
});

console.log('💡 Tip: Check the server logs above to see the database initialization messages.');
console.log('💡 The database should be automatically created when the server starts.');
