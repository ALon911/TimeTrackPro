# Cross-Platform Compatibility Fixes

This document outlines the changes made to ensure TimeTrackPro works on Ubuntu Linux.

## Issues Fixed

### 1. Server Configuration (`server/index.ts`)
**Problem**: Platform-specific host binding and port reuse settings
**Solution**: 
- Removed Windows-specific `localhost` binding
- Made host configurable via environment variables
- Removed platform-specific `reusePort` option
- Added support for `PORT` and `HOST` environment variables

### 2. Path Resolution (`vite.config.ts`)
**Problem**: Used `import.meta.dirname` which is not consistently supported
**Solution**: Replaced with `__dirname` for better cross-platform compatibility

### 3. Database Path Handling (`server/db.ts`)
**Problem**: Relative path resolution issues on different platforms
**Solution**: Used `process.cwd()` for absolute path resolution

### 4. Vite Development Server (`server/vite.ts`)
**Problem**: Platform-specific path resolution in development mode
**Solution**: 
- Replaced `import.meta.dirname` with `process.cwd()`
- Fixed static file serving paths

## New Files Added

### 1. `setup-ubuntu.sh`
Automated setup script for Ubuntu that:
- Installs Node.js 20.x
- Installs build tools and SQLite development headers
- Creates necessary directories
- Installs dependencies
- Builds the application

### 2. `UBUNTU_SETUP.md`
Comprehensive setup guide for Ubuntu users including:
- Prerequisites
- Quick setup instructions
- Manual setup steps
- Troubleshooting guide
- Environment variable configuration

### 3. `env.example`
Template environment file with all configurable options

## Package.json Improvements

Added new scripts:
- `setup:ubuntu`: Runs the Ubuntu setup script
- `postinstall`: Cross-platform setup verification

## Environment Variables

The application now supports these environment variables:
- `PORT`: Server port (default: 5000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment mode (development/production)

## Testing on Ubuntu

To test the fixes on Ubuntu:

1. Run the setup script:
   ```bash
   chmod +x setup-ubuntu.sh
   ./setup-ubuntu.sh
   ```

2. Or manually install dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential python3 libsqlite3-dev
   npm install
   npm run build
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

## Compatibility Notes

- The application now works on Windows, macOS, and Linux
- Database paths are resolved consistently across platforms
- Server binding is configurable and works on all platforms
- Build process is cross-platform compatible
