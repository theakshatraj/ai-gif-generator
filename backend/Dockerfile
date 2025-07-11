# Use slim Node.js base image
FROM node:18-slim

# Install essential tools and FFmpeg (for audio/video processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY . .

# Create necessary runtime directories
RUN mkdir -p /app/uploads /app/output /app/temp /app/cache && \
    chmod -R 755 /app/uploads /app/output /app/temp /app/cache

# Create non-root user for better security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Add healthcheck for Railway (or any orchestrator)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the app
CMD ["npm", "start"]
