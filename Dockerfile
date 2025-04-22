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

# Only copy production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files and necessary assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./
COPY --from=builder /app/ebs-cloud-456404-f7769bc22626.json ./
COPY openapi.json ./
# Add any other files needed at runtime

EXPOSE 8080
CMD ["npm", "start"]