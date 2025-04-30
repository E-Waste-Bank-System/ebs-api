# syntax=docker/dockerfile:1

# 1. Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
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

EXPOSE 8080
ENV PORT 8080
CMD ["node", "dist/server.js"]