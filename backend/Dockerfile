# Base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install essential packages and FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only package files first for caching
COPY package*.json ./

# Install production dependencies only (skip dev, avoid ci for speed)
RUN npm install --omit=dev && npm cache clean --force

# Copy rest of the application code
COPY . .

# Create necessary folders with proper permissions
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache \
    && chmod -R 755 /app/uploads /app/output /app/temp /app/cache

# Use non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose app port
EXPOSE 5000

# Health check for platforms like Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start app
CMD ["npm", "start"]
