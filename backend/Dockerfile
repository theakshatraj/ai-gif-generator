FROM node:18-slim

# Install system dependencies (Chrome for Puppeteer, ffmpeg for video processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    wget \
    ca-certificates \
    gnupg \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Add Google Chrome repository and install Chrome (for Puppeteer)
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Verify Chrome installation
RUN google-chrome --version

# Create app directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node.js dependencies
# Install all dependencies first (including devDependencies for Puppeteer)
RUN npm ci

# Download Chromium for Puppeteer (ensures compatibility)
RUN npx puppeteer browsers install chrome

# Clean up dev dependencies after Puppeteer setup
RUN npm prune --omit=dev

# Clean npm cache
RUN npm cache clean --force

# Copy application code
COPY . .

# Create non-root user first
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache /app/assets /app/assets/fonts && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache /app/assets && \
    chown -R appuser:appgroup /app

# Create a writable home directory for the user (needed for Chrome/Puppeteer)
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

# Expose port (Railway will set the PORT environment variable)
EXPOSE 5000

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the application
CMD ["npm", "start"]
