# syntax=docker/dockerfile:1

# 1. Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
# Make sure the credentials file is not included in the build
RUN rm -f ebs-cloud-456404-42c276033ca1.json
RUN npm run build
RUN ls -la dist/

# 2. Production stage
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
# Set environment variables
ENV NODE_ENV=production
# Explicitly unset credentials env var to ensure we use workload identity
ENV GOOGLE_APPLICATION_CREDENTIALS=""
# Print environment for debugging
RUN echo "Environment setup complete. GOOGLE_APPLICATION_CREDENTIALS=''"

EXPOSE 8080
ENV PORT 8080
CMD ["node", "dist/server.js"]