FROM node:18-slim

# Install system dependencies (only what's needed)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Verify ffmpeg installation
RUN ffmpeg -version

# Create app directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/output /app/temp /app/assets /app/assets/fonts && \
    chmod -R 755 /app/uploads /app/output /app/temp

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (Railway will set the PORT environment variable)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]