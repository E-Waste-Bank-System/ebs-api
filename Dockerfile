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

# Set all required environment variables for production (Cloud Run)
ENV NODE_ENV=production
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/key.json
ENV JWT_SECRET="82TvAFmH8nQQfTFNu1ExESY9fX9Ztuw7JIHjJJCyM+lljTP6ZwaozoX+n6b88gmN04+AW8CisIEYEPVREFfWIw=="
ENV SUPABASE_URL="https://dyhzmepwuzhfzbuemebb.supabase.co"
ENV SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aHptZXB3dXpoZnpidWVtZWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNDk5MTcsImV4cCI6MjA2MDgyNTkxN30.X46VUUcJdonNgNYhdF4wAET1PFQ_DFOi-aqrvxf17Pg"
ENV SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aHptZXB3dXpoZnpidWVtZWJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTI0OTkxNywiZXhwIjoyMDYwODI1OTE3fQ.YcdEElDt5KEfBgeHA44VoztgflFuE0EWsz4YH1DJa-E"
ENV GCS_BUCKET="ebs-img-upload"
ENV YOLO_URL="${YOLO_URL}"
ENV REGRESSION_URL="${REGRESSION_URL}"
ENV GCS_PROJECT_ID="ebs-cloud-456404"       
ENV GCS_KEYFILE="ebs-cloud-456404-42c276033ca1.json"
ENV YOLO_URL="http://localhost:5000/inference"
ENV REGRESSION_URL="http://localhost:5001/estimate"
ENV CLIENT_ORIGIN="http://localhost:3000"        

# Only copy production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files and necessary assets
COPY --from=builder /app/dist ./dist
COPY openapi.json ./

EXPOSE 8080
ENTRYPOINT ["/bin/sh","-c","echo \"$GCS_KEYFILE\" > /app/key.json && npm start"]