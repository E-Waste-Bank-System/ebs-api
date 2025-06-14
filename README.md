# E-Waste Backend Service API

A comprehensive NestJS backend API for E-Waste scanning and management system with AI integration, role-based access control, and Supabase authentication.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with Supabase integration
- **Role-Based Access Control**: User, Admin, and Superadmin roles
- **E-Waste Scanning**: AI-powered object detection and classification  
- **Content Management**: Article system for educational content
- **Admin Dashboard**: Comprehensive analytics and management tools
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Database**: PostgreSQL with TypeORM
- **Rate Limiting**: Built-in throttling protection
- **Docker Support**: Production-ready containerization

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL + TypeORM
- **Authentication**: Supabase Auth + JWT
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator + class-transformer
- **Rate Limiting**: @nestjs/throttler
- **Cloud Integration**: Google Cloud Platform

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Supabase account
- Google Cloud account (optional)

## 🔧 Setup

### 1. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=ebs_api

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./ebs-cloud-456404-472153b611d9.json

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# AI API (Configure based on your AI service)
AI_API_URL=http://localhost:8000
AI_API_KEY=your_ai_api_key
```

### 2. Installation

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### 3. Database Setup

The application will automatically create tables on first run in development mode. For production, disable `synchronize` and use migrations.

## 📚 API Documentation

Once running, visit:
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

## 🔐 Authentication

### Login Flow

1. **Standard Login**: `POST /api/v1/auth/login`
2. **Google OAuth**: Integration ready (implement frontend flow)
3. **JWT Token**: Include in Authorization header: `Bearer <token>`

### Role Hierarchy

- **User**: Can scan items, view own scans
- **Admin**: Can manage content, validate scans, view all data
- **Superadmin**: Full system access including user management

## 📊 API Endpoints

### 🔐 Authentication & Profile
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/auth/login` | POST | Login via Supabase JWT or OAuth | Public |
| `/auth/me` | GET | Get current user profile | Auth |
| `/profiles/:id` | GET | Get user profile by ID | Admin |
| `/profiles` | GET | List all profiles | Admin |
| `/profiles/:id` | PATCH | Update profile | Admin |
| `/profiles/:id` | DELETE | Soft delete profile | Superadmin |

### 📄 Articles
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/articles` | GET | List all articles (paginated) | Public |
| `/articles/:slug` | GET | Get single article by slug | Public |
| `/admin/articles` | GET | Admin view of all articles | Admin |
| `/admin/articles` | POST | Create new article | Admin |
| `/admin/articles/:id` | PATCH | Edit article | Admin |
| `/admin/articles/:id` | DELETE | Soft delete article | Admin |

### 📦 E-Waste Scans
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/scans` | GET | Get current user scan history | User |
| `/scans/:id` | GET | Get specific scan with objects | User |
| `/scans` | POST | Upload scan image → triggers AI pipeline | User |
| `/admin/scans` | GET | Admin dashboard: list all scans | Admin |
| `/admin/scans/:id` | GET | Detail view of scan & detected objects | Admin |

### 🔍 Objects (Detected Items)
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/objects/:id` | GET | Get object detail | User |
| `/admin/objects/:id/validate` | PATCH | Validate object | Admin |
| `/admin/objects/:id/reject` | PATCH | Reject or mark as invalid | Admin |
| `/admin/objects` | GET | Filtered list of detected objects | Admin |

### 🔁 Retraining Data
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/retraining` | POST | Submit validated/corrected data | Admin |
| `/admin/retraining` | GET | Admin view of retraining samples | Admin |

### 📊 Dashboard & Stats
| Endpoint | Method | Description | Access |
|----------|--------|-------------|---------|
| `/admin/dashboard` | GET | Summary (scan count, categories, trends) | Admin |
| `/admin/stats/objects` | GET | Breakdown by category, risk, etc. | Admin |

## 🤖 AI Integration Flow

1. **Upload**: User uploads image via `/scans` endpoint
2. **Processing**: Background job processes image with AI pipeline:
   - **YOLOv11**: Object detection and bounding boxes
   - **Gemini**: Enhanced classification and risk assessment  
   - **KNR**: Value estimation and recycling recommendations
3. **Storage**: Detected objects saved with validation status
4. **Validation**: Admin can validate/correct AI predictions
5. **Retraining**: Corrections feed back into AI improvement

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Configurable request throttling
- **Role-Based Access**: Granular permission system
- **Input Validation**: Comprehensive DTO validation
- **Error Handling**: Standardized error responses
- **CORS Protection**: Configurable cross-origin policies

## 🐳 Docker Deployment

```bash
# Build image
docker build -t ebs-api .

# Run container
docker run -p 3000:3000 --env-file .env ebs-api

# Using docker-compose (recommended)
docker-compose up -d
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📈 Monitoring & Logging

- **Health Checks**: Built-in health check endpoints
- **Structured Logging**: JSON-formatted logs
- **Error Tracking**: Global exception handling
- **Performance Metrics**: Request timing and throughput

## 🔧 Development

### Adding New Modules

1. Generate module: `nest g module feature-name`
2. Generate controller: `nest g controller feature-name`
3. Generate service: `nest g service feature-name`
4. Create DTOs and entities
5. Add to main AppModule

### Database Migrations

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the API documentation at `/api/docs`

---

**Built with ❤️ using NestJS** 