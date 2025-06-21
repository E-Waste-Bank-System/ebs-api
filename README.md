# EBS API (E-Waste Detection System API)

🚀 **Production API:** `https://ebs-api-981332637673.asia-southeast2.run.app`  
📋 **Swagger Documentation:** `https://ebs-api-981332637673.asia-southeast2.run.app/api/docs`

A comprehensive REST API for e-waste detection, management, and recycling education built with NestJS, TypeScript, and PostgreSQL.

## 🌟 Features

- **🔐 Authentication & Authorization** - JWT-based auth with Google OAuth integration
- **📱 E-Waste Scanning** - AI-powered image analysis for e-waste detection
- **🔍 Object Detection** - Automated categorization and value estimation
- **📚 Content Management** - Articles and educational content system
- **👨‍💼 Admin Dashboard** - Comprehensive administrative interface
- **🤖 AI Training** - Model retraining and dataset management
- **☁️ Cloud Storage** - Google Cloud Storage integration
- **📊 Analytics** - Detailed reporting and statistics

## 📖 API Documentation Structure

### Public Endpoints
- **🏥 Health** - System health and status monitoring
- **📚 Articles** - Public article reading and discovery

### User Endpoints  
- **🔐 Authentication** - Login, registration, and token management
- **📱 E-Waste Scans** - Image upload and AI analysis
- **🔍 E-Waste Objects** - Object details and management

### Admin Endpoints
- **👨‍💼 Admin - Articles** - Content creation and management
- **👨‍💼 Admin - Dashboard** - System analytics and overview
- **👨‍💼 Admin - Objects** - Object validation and correction
- **👨‍💼 Admin - Profiles** - User management
- **👨‍💼 Admin - Scans** - System-wide scan monitoring
- **👨‍💼 Admin - Retraining & Datasets** - AI model management
- **📁 File Upload** - Cloud storage and asset management

## 🚀 Quick Start

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd ebs-api

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ebs_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# AI Service
AI_SERVICE_URL=https://your-ai-service.run.app

# Frontend (where your frontend app runs)
CLIENT_ORIGIN=http://localhost:3000

# Note: Backend API runs on http://localhost:8080
```

## 🔗 API Endpoints Overview

### 🔐 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Email/password authentication |
| POST | `/auth/token` | Generate token for Google OAuth users |
| GET | `/auth/profile` | Get current user profile |
| POST | `/auth/sync-users` | Sync Supabase users to local DB |

### 📚 Articles (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/articles` | List published articles |
| GET | `/articles/:slug` | Get article by slug |

### 👨‍💼 Admin - Articles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/articles` | List all articles (admin) |
| POST | `/admin/articles` | Create new article |
| GET | `/admin/articles/:id` | Get article by ID |
| PATCH | `/admin/articles/:id` | Update article |
| DELETE | `/admin/articles/:id` | Delete article |

### 📱 E-Waste Scans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scans` | Upload image for AI scanning |
| GET | `/scans` | Get user's scan history |
| GET | `/scans/:id` | Get detailed scan results |
| DELETE | `/scans/:id` | Delete scan |

### 🔍 E-Waste Objects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/objects` | List detected objects |
| GET | `/objects/:id` | Get object details |

### 👨‍💼 Admin - Objects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/objects` | Admin view of all objects |
| POST | `/admin/objects` | Create manual object entry |
| PATCH | `/admin/objects/:id/validate` | Validate object |
| PATCH | `/admin/objects/:id/reject` | Reject object |

### 📁 File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | General file upload |
| POST | `/upload/article-image` | Article featured image upload |

### 👨‍💼 Admin - Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | System statistics |
| GET | `/admin/dashboard/stats/objects` | Object statistics |
| GET | `/admin/dashboard/activity` | Recent activity |

### 🏥 Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| GET | `/health/db` | Database health check |

## 🔧 Recent Updates

### ✅ Fixed Issues
1. **Swagger Tags Organization** - Cleaned up duplicate and inconsistent API tags
2. **Article Slug Uniqueness** - Fixed duplicate slug generation with auto-incrementing
3. **Article Status Validation** - Improved enum validation with transform handling
4. **Article Image Upload** - Added dedicated `/upload/article-image` endpoint
5. **Error Handling** - Enhanced validation error messages

### 🔄 API Tag Structure
- **🏥 Health** - System monitoring
- **🔐 Authentication** - Auth endpoints  
- **📚 Articles** - Public content
- **📱 E-Waste Scans** - User scanning
- **🔍 E-Waste Objects** - Object management
- **📁 File Upload** - Asset management
- **👨‍💼 Admin - [Feature]** - Administrative functions

## 📊 Data Models

### Article
```typescript
interface Article {
  id: string;
  title: string;
  slug: string; // Auto-generated, unique
  content: EditorJS.OutputData | string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  view_count: number;
  author_id: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}
```

### Scan
```typescript
interface Scan {
  id: string;
  image_url: string;
  status: 'processing' | 'completed' | 'failed';
  objects_count: number;
  total_estimated_value: number;
  user_id: string;
  created_at: Date;
  processed_at?: Date;
  error_message?: string;
}
```

### DetectedObject
```typescript
interface DetectedObject {
  id: string;
  name?: string;
  category: string;
  confidence_score: number;
  estimated_value?: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  risk_level: number;
  damage_level: number;
  is_validated: boolean;
  scan_id: string;
}
```

## 🛠️ Development

### Available Scripts
```bash
npm run start:dev      # Development server with hot reload
npm run start:prod     # Production server
npm run build          # Build the application
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run migration:generate  # Generate new migration
npm run migration:run       # Run pending migrations
```

### Code Structure
```
src/
├── articles/          # Article management
├── auth/             # Authentication & authorization
├── common/           # Shared utilities and DTOs
├── dashboard/        # Admin dashboard
├── health/           # Health check endpoints
├── objects/          # E-waste object management
├── profiles/         # User profile management
├── retraining/       # AI model retraining
├── scans/           # E-waste scanning
├── supabase/        # Supabase integration
├── upload/          # File upload handling
└── main.ts          # Application entry point
```

## 🌐 Production Deployment

The API is deployed on Google Cloud Run with:
- **Auto-scaling** based on traffic
- **HTTPS** encryption
- **Global CDN** via Google Cloud
- **Database** on Supabase PostgreSQL
- **File Storage** on Google Cloud Storage
- **AI Processing** on dedicated Cloud Run service

## 📱 Mobile App Integration

This API serves the EBS mobile application with:
- **Real-time scanning** results
- **Offline capability** support
- **Push notifications** for processing updates
- **Article synchronization**
- **User analytics** and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is proprietary software for the EBS (E-Waste Detection System) platform.

---

**🔗 Links:**
- [Live API](https://ebs-api-981332637673.asia-southeast2.run.app)
- [Swagger Docs](https://ebs-api-981332637673.asia-southeast2.run.app/api/docs)
- [Frontend App](https://ewastehub.netlify.app)

**📧 Support:** Contact the development team for API access and integration support. 