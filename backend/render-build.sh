#!/usr/bin/env bash

# Install Python
apt-get update
apt-get install -y python3 python3-pip

# Install yt-dlp
pip3 install yt-dlp

echo "yt-dlp installed successfully!"
