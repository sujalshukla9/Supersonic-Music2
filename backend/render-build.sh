#!/bin/bash

# Install python + pip
apt-get update
apt-get install -y python3 python3-pip

# Install yt-dlp
pip3 install --upgrade yt-dlp

echo "Python & YT-DLP installed successfully"
