# Dockerfile for EBS API
FROM node:22-alpine
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose port and start
EXPOSE 8080
CMD ["npm", "run", "start"]