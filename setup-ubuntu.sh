#!/bin/bash

# TimeTrackPro Ubuntu Setup Script
# This script sets up the TimeTrackPro application on Ubuntu

set -e

echo "🚀 Setting up TimeTrackPro on Ubuntu..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "📦 Installing npm..."
    sudo apt-get install -y npm
else
    echo "✅ npm is already installed"
fi

# Install build tools for native dependencies
echo "🔧 Installing build tools for native dependencies..."
sudo apt-get update
sudo apt-get install -y build-essential python3

# Install SQLite development headers
echo "🗄️ Installing SQLite development headers..."
sudo apt-get install -y libsqlite3-dev

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing git..."
    sudo apt-get install -y git
else
    echo "✅ git is already installed"
fi

# Create database directory if it doesn't exist
echo "📁 Creating database directory..."
mkdir -p db

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build the application
echo "🔨 Building the application..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📧 Email Configuration:"
echo "  If you see 'Email service not configured' warnings, create a .env file with:"
echo "  EMAIL_USER=your-email@gmail.com"
echo "  EMAIL_PASS=your-app-password"
echo "  EMAIL_FROM=your-email@gmail.com"
echo ""
echo "To start the application:"
echo "  npm run dev    # For development"
echo "  npm start      # For production"
echo ""
echo "The application will be available at:"
echo "  http://localhost:5000"
echo ""
echo "Environment variables you may want to set:"
echo "  PORT=5000          # Server port (default: 5000)"
echo "  HOST=0.0.0.0       # Server host (default: 0.0.0.0)"
echo "  NODE_ENV=production # Environment (development/production)"
