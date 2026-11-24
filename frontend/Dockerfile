# ==============================================================================
# Build Stage: Node 20 LTS for TypeScript compilation and Vite build
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies layer
COPY package*.json ./
RUN npm ci

# Copy application source code and compile SPA bundle
COPY . .
RUN npm run build

# ==============================================================================
# Runtime Stage: High-performance Nginx Alpine reverse proxy
# ==============================================================================
FROM nginx:alpine

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration supporting SPA fallback and WebSocket proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
