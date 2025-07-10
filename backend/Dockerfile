FROM node:18-slim

# Install system dependencies (including Python for yt-dlp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install yt-dlp in the virtual environment
RUN pip install --no-cache-dir --upgrade yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version

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
RUN mkdir -p /app/uploads /app/output /app/temp /app/assets /app/assets/fonts /app/cache && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache && \
    chown -R appuser:appgroup /app

# Create a writable home directory for the user
RUN mkdir -p /home/appuser && \
    chown -R appuser:appgroup /home/appuser

# Switch to non-root user
USER appuser

# Set environment variables for yt-dlp
ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"
ENV PATH="/opt/venv/bin:$PATH"

# Expose port (Railway will set the PORT environment variable)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]