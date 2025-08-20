# Docker-based Vercel Function to run pdftotext (Poppler)
FROM node:20-bookworm-slim

# Install poppler-utils (provides pdftotext, pdfinfo, etc.) and curl
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       poppler-utils \
       ca-certificates \
       curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only package files first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY server.js ./

# Vercel provides PORT env; ensure the server binds to it
ENV HOST=0.0.0.0

# Health check (optional for local/container runs)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "server.js"]
