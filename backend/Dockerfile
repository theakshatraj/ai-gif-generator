FROM node:18-slim

# Install system dependencies (including Python for yt-dlp and Chrome for cookies)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add Google Chrome repository and install Chrome (for cookies-from-browser)
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install yt-dlp in the virtual environment with latest version
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --upgrade yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version && google-chrome --version

# Create app directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node.js dependencies with fallback
# Try npm ci first, fallback to npm install if lock file is out of sync
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
RUN npm cache clean --force

# Copy application code
COPY . .

# Create non-root user first
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/output /app/temp /app/assets /app/assets/fonts /app/cache /app/config && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache /app/config && \
    chown -R appuser:appgroup /app

# Create a writable home directory for the user (needed for Chrome profile)
RUN mkdir -p /home/appuser/.config/google-chrome && \
    chown -R appuser:appgroup /home/appuser

# Switch to non-root user
USER appuser

# Set environment variables for yt-dlp and Chrome
ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"
ENV PATH="/opt/venv/bin:$PATH"
ENV CHROME_BIN="/usr/bin/google-chrome"
ENV CHROME_PATH="/usr/bin/google-chrome"

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