#!/bin/bash
# =============================================================
# Supersonic Music Backend - Ubuntu Server Deployment Script
# =============================================================
# This script sets up and runs the backend on an Ubuntu server
# Run with: bash deploy-ubuntu.sh
# =============================================================

set -e  # Exit on error

echo "============================================="
echo "  Supersonic Music Backend - Ubuntu Setup   "
echo "============================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Warning: Running as root. Consider using a non-root user for production."
fi

# Update system packages
echo ""
echo "[1/6] Updating system packages..."
apt-get update -qq

# Install required dependencies
echo ""
echo "[2/6] Installing dependencies (Node.js, Python3, FFmpeg)..."

# Install Node.js 20.x
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js $(node -v) is already installed"
fi

# Install Python3 and pip
apt-get install -y python3 python3-pip python3-venv ffmpeg

# Set up Python virtual environment
echo ""
echo "[3/6] Setting up Python virtual environment..."
if [ ! -d "/opt/supersonic-venv" ]; then
    python3 -m venv /opt/supersonic-venv
fi
source /opt/supersonic-venv/bin/activate

# Install Python dependencies
echo ""
echo "[4/6] Installing Python dependencies (yt-dlp, ytmusicapi)..."
pip3 install --upgrade yt-dlp ytmusicapi

# Install Node.js dependencies
echo ""
echo "[5/6] Installing Node.js dependencies..."
npm ci --omit=dev

# Create .env file if it doesn't exist
echo ""
echo "[6/6] Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "Please edit .env to add your configuration"
fi

# Create systemd service file
echo ""
echo "Creating systemd service file..."
cat > /etc/systemd/system/supersonic-backend.service << 'EOF'
[Unit]
Description=Supersonic Music Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/supersonic-backend
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=PATH=/opt/supersonic-venv/bin:/usr/bin:/bin
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "============================================="
echo "  Setup Complete!"
echo "============================================="
echo ""
echo "To start the server manually:"
echo "  source /opt/supersonic-venv/bin/activate"
echo "  npm start"
echo ""
echo "To use systemd service:"
echo "  1. Copy files to /opt/supersonic-backend/"
echo "  2. Run: sudo systemctl daemon-reload"
echo "  3. Run: sudo systemctl enable supersonic-backend"
echo "  4. Run: sudo systemctl start supersonic-backend"
echo ""
echo "To check status:"
echo "  sudo systemctl status supersonic-backend"
echo ""
echo "The server will run on port ${PORT:-3001}"
echo "Access health check at: http://your-server:3001/health"
echo ""
