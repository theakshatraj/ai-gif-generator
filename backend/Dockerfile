# Base image with better Python support
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install essential packages, FFmpeg, and Python dependencies
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
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment to avoid conflicts
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install Python packages
RUN pip install --upgrade pip setuptools wheel

# Install multiple YouTube downloaders with specific versions
RUN pip install --upgrade \
    yt-dlp \
    youtube-dl \
    gallery-dl \
    streamlink \
    pytube \
    requests \
    && pip install --force-reinstall --upgrade --pre yt-dlp[default]

# Install yt-dlp from nightly build as backup
RUN wget -O /usr/local/bin/yt-dlp-nightly https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp-nightly

# Install alternative youtube-dl from fork
RUN wget -O /usr/local/bin/youtube-dl-fork https://github.com/ytdl-org/youtube-dl/releases/latest/download/youtube-dl && \
    chmod +x /usr/local/bin/youtube-dl-fork

# Create configuration directories
RUN mkdir -p /app/.config/yt-dlp /app/.config/youtube-dl /app/.config/gallery-dl

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache /app/.config \
    && chmod -R 755 /app/uploads /app/output /app/temp /app/cache /app/.config

# Create configuration files for downloaders
RUN echo "# yt-dlp configuration" > /app/.config/yt-dlp/config && \
    echo "--no-check-certificate" >> /app/.config/yt-dlp/config && \
    echo "--geo-bypass" >> /app/.config/yt-dlp/config && \
    echo "--socket-timeout 30" >> /app/.config/yt-dlp/config && \
    echo "--retries 3" >> /app/.config/yt-dlp/config && \
    echo "--fragment-retries 3" >> /app/.config/yt-dlp/config && \
    echo "--user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'" >> /app/.config/yt-dlp/config

# Create gallery-dl configuration
RUN echo '{"extractor": {"youtube": {"quality": "best[height<=720]/best"}}}' > /app/.config/gallery-dl/config.json

# Create youtube-dl configuration
RUN echo "--no-check-certificate" > /app/.config/youtube-dl/config && \
    echo "--geo-bypass" >> /app/.config/youtube-dl/config && \
    echo "--socket-timeout 30" >> /app/.config/youtube-dl/config && \
    echo "--retries 3" >> /app/.config/youtube-dl/config

# Install additional tools that might help
RUN apt-get update && apt-get install -y \
    tor \
    privoxy \
    && rm -rf /var/lib/apt/lists/*

# Setup Tor for proxy downloads (optional)
RUN echo "SocksPort 9050" > /etc/tor/torrc && \
    echo "ControlPort 9051" >> /etc/tor/torrc && \
    echo "RunAsDaemon 1" >> /etc/tor/torrc

# Create a non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app && \
    chown -R appuser:appgroup /opt/venv

# Switch to non-root user
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start application
CMD ["npm", "start"]