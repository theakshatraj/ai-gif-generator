# Use Node 20 with Python and FFmpeg support
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install essential tools and system dependencies
# python3-venv is added for better pip environment management
# Added Chromium and its dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    git \
    wget \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    streamlink \
    # Chromium dependencies for Puppeteer
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    # Fonts for Chromium
    fonts-liberation \
    # Clean up apt cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp directly from latest release (stable + fast)
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Install gallery-dl and youtube-dl via pip
# Use a virtual environment for pip packages to avoid system-wide conflicts
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir gallery-dl youtube-dl && \
    ln -s /opt/venv/bin/gallery-dl /usr/local/bin/gallery-dl && \
    ln -s /opt/venv/bin/youtube-dl /usr/local/bin/youtube-dl

# Configure yt-dlp (general options, specific user-agents are handled in JS)
RUN mkdir -p /app/.config/yt-dlp && \
    echo "# yt-dlp config" > /app/.config/yt-dlp/config && \
    echo "--no-check-certificate" >> /app/.config/yt-dlp/config && \
    echo "--geo-bypass" >> /app/.config/yt-dlp/config && \
    echo "--socket-timeout 30" >> /app/.config/yt-dlp/config && \
    echo "--retries 3" >> /app/.config/yt-dlp/config && \
    echo "--fragment-retries 3" >> /app/.config/yt-dlp/config

# Puppeteer/Playwright install bypass (skip Chromium download by npm/yarn)
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
