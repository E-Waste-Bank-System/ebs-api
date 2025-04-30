# syntax=docker/dockerfile:1

# 1. Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY config ./config
COPY middlewares ./middlewares
COPY controllers ./controllers
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY types ./types
RUN npm run build

# 2. Production stage
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 8080
ENV PORT 8080
CMD ["node", "dist/server.js"]