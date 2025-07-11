FROM node:18-slim

# Install essential tools and FFmpeg (still required for GIF creation/clipping)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy the rest of your app
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache

# Use non-root user (optional but recommended for security)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose app port
EXPOSE 5000

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the app
CMD ["npm", "start"]
