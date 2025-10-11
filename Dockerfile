# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install bash for the entrypoint script
RUN apk add --no-cache bash

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment variables with defaults
ENV VITE_OCTOPUS_REGION=C
ENV VITE_AGILE_PRODUCT=AGILE-24-10-01
ENV VITE_GAS_PRODUCT=SILVER-25-09-02
ENV VITE_WEATHER_LAT=51.5074
ENV VITE_WEATHER_LON=-0.1278
ENV VITE_THRESHOLD_CHEAP=10
ENV VITE_THRESHOLD_MODERATE=20
ENV VITE_THRESHOLD_EXPENSIVE=35

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
