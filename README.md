# E-Waste Bank System (EBS) API

Backend REST API for MVP aplikasi "Bank Sampah Elektronik" (E-waste Bank System).

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Authentication & Database**: Supabase
- **Storage**: Google Cloud Storage (GCS)
- **AI Model Integration**: Python (YOLOv8 & Price Regression)
- **Deployment**: Google Cloud Run

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.8+ (for AI models)
- Supabase Account
- Google Cloud Platform Account
- GCP Service Account (for GCS access)

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd ebs-api
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Copy the `.env.example` file to `.env` and fill in your configuration:
   ```
   cp .env.example .env
   ```

4. Install Python dependencies (for AI components)
   ```
   pip install -r scripts/requirements.txt
   ```

5. Run the development server
   ```
   npm run dev
   ```

## Project Structure

```
ebs-api/
├── prisma/                # Database schema and migrations
├── scripts/               # Python scripts for AI models
│   ├── detect.py          # E-waste detection using YOLOv8
│   └── predict_price.py   # Price prediction using regression model
├── src/                   # TypeScript source files
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middlewares/       # Express middlewares
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── index.ts           # Application entry point
├── .env                   # Environment variables
├── package.json           # Node.js dependencies
└── tsconfig.json          # TypeScript configuration
```

## API Endpoints

### Authentication

- `POST /api/auth/register` – Register a new user
- `POST /api/auth/login` – Login for users and admins
- `GET /api/auth/me` – Get current user data from token

### User Endpoints (Mobile App)

- `GET /api/user/profile` – Get user profile
- `PATCH /api/user/profile` – Update user profile
- `POST /api/user/ewaste` – Upload e-waste image
- `GET /api/user/transactions` – Get user transactions
- `GET /api/user/schedules` – Get user schedules
- `PATCH /api/user/schedule/:id` – Update schedule

### Admin Endpoints (Web Dashboard)

- `GET /api/admin/dashboard` – Get dashboard statistics
- `GET /api/admin/users` – Get all users
- `PATCH /api/admin/users/:id/block` – Block/unblock user
- `GET /api/admin/ewaste-pending` – Get pending e-waste
- `PATCH /api/admin/ewaste/:id/approve` – Approve e-waste
- `PATCH /api/admin/ewaste/:id/reject` – Reject e-waste
- `GET /api/admin/transactions` – Get all transactions
- `POST /api/admin/pricing` – Set pricing for e-waste categories

### Content Endpoints

- `GET /api/content` – Get all content
- `GET /api/content/:id` – Get content by ID
- `POST /api/admin/content` – Create content (admin only)
- `PUT /api/admin/content/:id` – Update content (admin only)
- `DELETE /api/admin/content/:id` – Delete content (admin only)

### AI Endpoints

- `POST /api/detect` – Detect e-waste from image
- `POST /api/predict-price` – Predict price for e-waste

## Deployment

### Google Cloud Run Setup

1. Build the Docker image
   ```
   docker build -t ebs-api .
   ```

2. Tag and push to Google Container Registry
   ```
   docker tag ebs-api gcr.io/<project-id>/ebs-api
   docker push gcr.io/<project-id>/ebs-api
   ```

3. Deploy to Cloud Run
   ```
   gcloud run deploy ebs-api \
     --image gcr.io/<project-id>/ebs-api \
     --platform managed \
     --region asia-southeast2 \
     --allow-unauthenticated
   ```

## Environment Variables

Required environment variables:

```
# Server
PORT=5000

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_EWASTE=ewaste-images
GCS_BUCKET_MODELS=models
GCS_KEYFILE=path-to-gcs-keyfile.json

# Python Scripts
PYTHON_SCRIPT_DETECT=scripts/detect.py
PYTHON_SCRIPT_PRICE=scripts/predict_price.py
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 