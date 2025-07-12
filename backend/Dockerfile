# Use Node 18 with Python and FFmpeg support
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install essential tools and system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    git \
    wget \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    streamlink \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp directly from latest release (stable + fast)
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Configure yt-dlp
RUN mkdir -p /app/.config/yt-dlp && \
    echo "# yt-dlp config" > /app/.config/yt-dlp/config && \
    echo "--no-check-certificate" >> /app/.config/yt-dlp/config && \
    echo "--geo-bypass" >> /app/.config/yt-dlp/config && \
    echo "--socket-timeout 30" >> /app/.config/yt-dlp/config && \
    echo "--retries 3" >> /app/.config/yt-dlp/config && \
    echo "--fragment-retries 3" >> /app/.config/yt-dlp/config && \
    echo "--user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'" >> /app/.config/yt-dlp/config

# Puppeteer/Playwright install bypass (skip Chromium to avoid Railway timeout)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy only package files first for better cache
COPY package*.json ./

# Install Node.js dependencies only (skip dev)
RUN npm install --omit=dev && npm cache clean --force

# Copy all source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache /app/.config && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache /app/.config

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

# Environment setup
ENV NODE_ENV=production
ENV PORT=5000

# Expose port for Railway
EXPOSE 5000

# Healthcheck for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start application
CMD ["npm", "start"]
