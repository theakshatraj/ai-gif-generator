#!/bin/bash

echo "📥 Installing yt-dlp and ffmpeg on Railway runtime..."

# Update package list (Railway allows this at runtime)
apt-get update -y
apt-get install -y yt-dlp ffmpeg

echo "✅ yt-dlp and ffmpeg installed successfully."
