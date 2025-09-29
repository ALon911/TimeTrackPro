# TimeTrackPro Ubuntu Setup Guide

This guide will help you set up TimeTrackPro on Ubuntu Linux.

## Prerequisites

- Ubuntu 18.04 or later
- Internet connection
- sudo privileges

## Quick Setup

Run the automated setup script:

```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

## Manual Setup

If you prefer to set up manually or the script fails:

### 1. Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Build Tools

TimeTrackPro uses native dependencies that require compilation:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 libsqlite3-dev
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create Database Directory

```bash
mkdir -p db
```

### 5. Build the Application

```bash
npm run build
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:5000`

## Environment Variables

You can customize the server configuration using environment variables:

```bash
# Server configuration
export PORT=5000
export HOST=0.0.0.0
export NODE_ENV=production

# Database configuration (if using PostgreSQL)
export DATABASE_URL="postgresql://user:password@localhost:5432/timetracker"

# Email configuration
export EMAIL_HOST="smtp.gmail.com"
export EMAIL_PORT=587
export EMAIL_USER="your-email@gmail.com"
export EMAIL_PASS="your-app-password"
export EMAIL_FROM="your-email@gmail.com"
```

## Troubleshooting

### Common Issues

1. **"better-sqlite3" compilation errors**
   ```bash
   sudo apt-get install -y build-essential python3 libsqlite3-dev
   npm rebuild better-sqlite3
   ```

2. **Permission errors**
   ```bash
   sudo chown -R $USER:$USER .
   ```

3. **Port already in use**
   ```bash
   # Kill process using port 5000
   sudo lsof -ti:5000 | xargs sudo kill -9
   # Or use a different port
   PORT=3000 npm run dev
   ```

4. **Database connection issues**
   - Ensure the `db` directory exists and is writable
   - Check file permissions: `ls -la db/`

### Logs and Debugging

Enable debug mode:
```bash
export DEBUG_MODE=true
npm run dev
```

Check application logs in the terminal output.

## File Structure

```
TimeTrackPro/
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared TypeScript types
├── db/             # SQLite database files
├── dist/           # Built application (production)
└── node_modules/   # Dependencies
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Database

The application uses SQLite by default. The database file is located at `db/timetracker.db`.

For production, consider using PostgreSQL by setting the `DATABASE_URL` environment variable.

## Security Notes

- The application binds to `0.0.0.0` by default, making it accessible from any network interface
- For production, consider using a reverse proxy (nginx) and firewall rules
- Set strong session secrets: `export SESSION_SECRET="your-secret-key"`

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Check file permissions
4. Review the application logs for error messages
