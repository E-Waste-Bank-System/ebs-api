# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
# Use the GCP_KEYFILE env var (injected at runtime) for credentials
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/key.json

# Only copy production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files and necessary assets
COPY --from=builder /app/dist ./dist
COPY openapi.json ./

EXPOSE 8080
ENTRYPOINT ["/bin/sh","-c","echo \"$GCS_KEYFILE\" > /app/key.json && npm start"]