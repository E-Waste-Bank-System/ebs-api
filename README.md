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

## License

MIT
