# Use Node.js base image
FROM node:18-slim AS node_base

# Install Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create symbolic links for Python
RUN ln -sf /usr/bin/python3 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r scripts/requirements.txt

# Build TypeScript code
RUN npm run build

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "start"] 