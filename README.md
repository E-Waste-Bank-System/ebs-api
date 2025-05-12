# E-Waste Bank System API

Backend service for managing electronic waste requests, articles, user authentication, and AI-powered inference and price estimation.

## Features

- Admin & user authentication (Supabase Auth + JWT)
- User sign-up & profile management
- Article CRUD with image upload (Google Cloud Storage)
- E-waste request submission, approval, and reporting
- AI inference endpoint for image classification (YOLO)
- Price estimation via regression service
- Swagger UI documentation at `/api/docs`

## Getting Started

### Prerequisites

- Node.js >= 16
- npm or yarn
- Supabase project with service role key
- Google Cloud Storage bucket

### Installation

1. Clone the repo:
   ```bash
   git clone <repository-url>
   cd ebs-api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # update .env with your keys
   ```
4. Seed the database (optional):
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev`        Start server in development mode with nodemon
- `npm run start`      Start server in production mode
- `npm run seed`       Seed database with sample admin, articles, and requests
- `npm run generate:openapi`  Generate OpenAPI spec (`openapi.json`)

## API Documentation

Open `http://localhost:5000/api/docs` in your browser to explore endpoints via Swagger UI.

## Deployment

### CI/CD with GitHub Actions
A GitHub Actions workflow is provided in `.github/workflows/ci-cd.yml`, which runs on push or PR to `main`. It: checkout → install → lint → type-check → test → build → Dockerize → push to Artifact Registry → deploy to Cloud Run.

Required GitHub Secrets:
- `GCP_PROJECT`: Your GCP project ID
- `REGION`: Cloud Run region (e.g. `asia-southeast2`)
- `WORKLOAD_IDENTITY_PROVIDER`: OIDC provider resource name
- `SERVICE_ACCOUNT_EMAIL`: GCP service account email for deploy
- `CLOUD_RUN_SERVICE`: Name of the Cloud Run service

### Manual deploy (optional)
```bash
# Build container locally
gcloud builds submit --no-cache --tag $REGION-docker.pkg.dev/$GCP_PROJECT/$CLOUD_RUN_SERVICE/ebs-api .

# Push to Artifact Registry
gcloud run deploy ebs-api --image=$REGION-docker.pkg.dev/$GCP_PROJECT/$CLOUD_RUN_SERVICE/ebs-api --platform=managed --region=$REGION --allow-unauthenticated 
```

### Environment variables & secrets
Store API keys and credentials in GitHub Secrets and inject them at deploy time. Do not commit sensitive files (e.g. service account JSON or `.env`). In Cloud Run, you can also mount secrets via Secret Manager instead of plain env vars.

## Logging & Monitoring
Cloud Run integrates with Cloud Logging and Error Reporting by default. Check logs in the GCP Console under Cloud Run → Logs. Configure alerts and metrics in Cloud Monitoring as needed.

## License

MIT

## Dashboard Integration

This API powers the [ebs-web](../ebs-web) dashboard, providing endpoints for:
- Statistics (for dashboard metrics and charts)
- Article CRUD (create, read, update, delete)
- Detection and validation management
- User authentication and profile

## Key Endpoints

- `GET /stats` — Dashboard statistics (articles, detections, users, etc.)
- `GET /articles` — List articles (with pagination, search)
- `POST /articles` — Create article (with image upload)
- `PUT /articles/:id` — Update article
- `DELETE /articles/:id` — Delete article
- `GET /detections` — List e-waste detections
- `POST /detections/:id/validate` — Validate a detection
- `GET /validations` — List validations

See [Swagger UI](http://localhost:5000/api/docs) for full API documentation.

## Authentication

All admin dashboard features require authentication via JWT. The web app will automatically attach the token after login.

## Connecting with ebs-web

The [ebs-web](../ebs-web) frontend is designed to work seamlessly with this API. Make sure both are running and configured to use the correct API base URL in `.env.local`.
