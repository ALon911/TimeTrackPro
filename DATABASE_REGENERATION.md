# Database Regeneration Feature

This document explains how the automatic database regeneration feature works in TimeTrackPro.

## Overview

The application now automatically regenerates the database when it's deleted or corrupted. This ensures that the application can recover from database issues without manual intervention.

## How It Works

### 1. Automatic Detection
- The `DatabaseStorage` constructor checks if the database file exists
- If the file is missing, it logs a message and creates a new database
- If database initialization fails, it automatically attempts to regenerate the database

### 2. Database Regeneration Process
When regeneration is triggered:
1. **Close** the current database connection
2. **Remove** the existing database file (if it exists)
3. **Create** a new database file
4. **Initialize** the database schema (all tables)
5. **Seed** the database with default data
6. **Recreate** the session store

### 3. Health Monitoring
- Added `isDatabaseHealthy()` method to check database accessibility
- Enhanced `/api/health` endpoint to include database status
- Added `/api/admin/regenerate-db` endpoint for manual regeneration

## Features

### Automatic Regeneration
- **File Detection**: Automatically detects when database file is missing
- **Error Recovery**: Automatically regenerates database on initialization errors
- **Schema Recreation**: Recreates all tables with proper relationships
- **Data Seeding**: Seeds database with default user and sample data

### Manual Regeneration
- **API Endpoint**: `POST /api/admin/regenerate-db`
- **Health Check**: `GET /api/health` (includes database status)
- **Programmatic**: Call `storage.regenerateDatabase()` method

### Logging
- **Clear Messages**: Detailed logging of database operations
- **Status Updates**: Progress indicators for each step
- **Error Handling**: Comprehensive error reporting

## Usage

### Automatic (Default Behavior)
The database will be automatically regenerated when:
- The database file is deleted
- The database file is corrupted
- Database initialization fails

### Manual Regeneration
```bash
# Using the API endpoint
curl -X POST http://localhost:5000/api/admin/regenerate-db

# Check database health
curl http://localhost:5000/api/health
```

### Programmatic Usage
```typescript
import { storage } from './server/storage';

// Check if database is healthy
const isHealthy = storage.isDatabaseHealthy();

// Manually regenerate database
if (!isHealthy) {
  storage.regenerateDatabase();
}
```

## Testing

Use the provided test script to verify the functionality:

```bash
node test-db-regeneration.js
```

This script will:
1. Delete the existing database file
2. Start the server
3. Verify that the database is automatically recreated
4. Check the server logs for regeneration messages

## Database Schema

The regenerated database includes all necessary tables:
- `users` - User accounts
- `teams` - Team information
- `team_members` - Team membership
- `team_invitations` - Team invitations
- `topics` - Time tracking topics
- `time_entries` - Time tracking entries
- `ai_suggestions` - AI-generated suggestions

## Default Data

When the database is regenerated, it includes:
- **Default User**: `user@example.com` (password: `password`)
- **Sample Topics**: DevOps, Workouts, Reading
- **Sample Time Entries**: Generated for the past 7 days
- **Proper Relationships**: All foreign keys and constraints

## Error Handling

The system handles various error scenarios:
- **Missing Database File**: Automatically creates new database
- **Corrupted Database**: Regenerates database from scratch
- **Permission Issues**: Provides clear error messages
- **Schema Errors**: Recreates schema with proper structure

## Benefits

1. **Zero Downtime**: Application continues to work even if database is deleted
2. **Automatic Recovery**: No manual intervention required
3. **Data Integrity**: Proper schema and relationships maintained
4. **Development Friendly**: Easy to reset database during development
5. **Production Ready**: Robust error handling and logging

## Security Note

The `/api/admin/regenerate-db` endpoint should be protected in production environments. Consider adding authentication or restricting access to localhost only.

## Troubleshooting

### Common Issues

1. **Database not regenerating**: Check file permissions
2. **Schema errors**: Verify database file is not locked
3. **Seed data missing**: Check if seeding process completed successfully

### Debug Steps

1. Check server logs for database initialization messages
2. Verify database file exists in `db/timetrack.db`
3. Test health endpoint: `GET /api/health`
4. Use manual regeneration if needed: `POST /api/admin/regenerate-db`

## Future Enhancements

- **Backup Integration**: Automatically backup database before regeneration
- **Migration Support**: Handle database schema migrations
- **Data Recovery**: Attempt to recover data from corrupted databases
- **Monitoring**: Add database health monitoring and alerts
