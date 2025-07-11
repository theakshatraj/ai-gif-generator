FROM node:18-slim

# Set environment variable to prevent interactive prompts during apt-get install
ENV DEBIAN_FRONTEND=noninteractive

# Install core system dependencies for ffmpeg and general utilities
# ffmpeg: Essential for video processing
# curl, wget, ca-certificates, gnupg: Needed for adding Chrome repo and secure downloads
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    wget \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add Google Chrome repository and install Chrome (for Puppeteer)
# This step is crucial for Puppeteer to find a browser
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Puppeteer's specific dependencies for headless Chrome
# These are common libraries required for running headless Chrome on minimal Debian-based systems
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm-dev \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
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
    lsb-release \
    xdg-utils \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Verify Chrome and FFmpeg installations
RUN google-chrome --version && ffmpeg -version

# Create app directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install Node.js dependencies
# Use npm ci for clean installs based on package-lock.json
RUN npm ci

# Download Chromium for Puppeteer (ensures compatibility)
# This step is important to ensure Puppeteer uses the installed Chrome
RUN npx puppeteer browsers install chrome

# Clean npm cache to reduce image size
RUN npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security best practices
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Create necessary directories with proper permissions
# Ensure /app/cache is created for Puppeteer's cache
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache /app/assets /app/assets/fonts && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache /app/assets && \
    chown -R appuser:appgroup /app

# Create writable home directory for Chrome/Puppeteer profile data
RUN mkdir -p /home/appuser/.config/google-chrome /home/appuser/.cache/puppeteer && \
    chown -R appuser:appgroup /home/appuser

# Switch to non-root user
USER appuser

# Set environment variables for Chrome/Puppeteer
ENV CHROME_BIN="/usr/bin/google-chrome"
ENV CHROME_PATH="/usr/bin/google-chrome"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"

# Railway specific environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the application
CMD ["npm", "start"]
