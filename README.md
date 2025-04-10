# E-Waste Bank System API

A RESTful API backend for an Electronic Waste Bank System built with Express.js, TypeScript, Prisma, and MySQL.

## Features

- 🔐 JWT Authentication & Authorization
- 👥 User & Admin roles
- 📦 E-waste management
- 💰 Transaction handling
- 📅 Pickup scheduling
- 🤖 AI-powered e-waste detection (YOLOv8)
- 📝 Dynamic content management
- 🔄 Real-time price prediction
- 📸 Image upload support
- ✨ TypeScript for type safety
- 🗃️ MySQL with Prisma ORM

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- Python 3.8+ (for AI features)
- YOLOv8 dependencies (for object detection)

## Project Structure

```
src/
├── config/         # Configuration files (database, JWT)
├── controllers/    # Request handlers
├── middlewares/    # Custom middlewares
├── models/         # Type definitions
├── routes/         # API routes
├── services/       # Business logic
├── types/         # TypeScript type declarations
├── utils/         # Utility functions
└── index.ts       # Application entry point
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ebs-api.git
cd ebs-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL="mysql://username:password@localhost:3306/ebs_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"
```

4. Set up the database:
```bash
# Create database tables
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

5. (Optional) Set up Python environment for AI features:
```bash
# Install Python dependencies
pip install ultralytics opencv-python numpy
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Documentation

### Auth Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user/admin
- `GET /api/auth/profile` - Get user profile

### User Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/ewaste` - Upload e-waste
- `GET /api/user/transactions` - Get transaction history
- `GET /api/user/schedules` - Get pickup schedules
- `PATCH /api/user/schedules/:id/confirm` - Confirm schedule

### Admin Endpoints
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/block` - Block user
- `GET /api/admin/ewaste/pending` - Get pending e-waste
- `PATCH /api/admin/ewaste/:id/approve` - Approve e-waste
- `PATCH /api/admin/ewaste/:id/reject` - Reject e-waste
- `GET /api/admin/transactions` - Get all transactions
- `PUT /api/admin/pricing` - Update pricing

### Content Endpoints
- `GET /api/content` - Get all content
- `GET /api/content/:id` - Get content by ID
- `POST /api/content` - Create content (Admin)
- `PUT /api/content/:id` - Update content (Admin)
- `DELETE /api/content/:id` - Delete content (Admin)

### AI Endpoints
- `POST /api/detect` - Detect e-waste from image
- `POST /api/predict-price` - Predict e-waste price

## Testing with Postman

1. Import the Postman collection:
   - Open Postman
   - Click "Import" -> "Raw Text"
   - Paste the contents of `postman/EBS-API.postman_collection.json`

2. Set up environment variables:
   - Create a new environment
   - Add variables:
     - `base_url`: `http://localhost:5000`
     - `token`: (leave empty, will be auto-filled after login)

3. Test flow:
   - Register a new user
   - Login to get JWT token
   - Token will be automatically set for subsequent requests
   - Test other endpoints as needed

## Database Schema

### User
```prisma
model User {
  id            String       @id @default(uuid())
  name          String
  email         String       @unique
  password      String
  role          Role         @default(USER)
  isBlocked     Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

### E-waste
```prisma
model Ewaste {
  id              String       @id @default(uuid())
  userId          String
  category        String
  weight          Float
  status          EwasteStatus @default(PENDING)
  image           String
  rejectionReason String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

## Error Handling

The API uses a custom error handling middleware that returns errors in the format:
```json
{
  "status": "error",
  "message": "Error message here"
}
```

## Security

- Password hashing using bcrypt
- JWT token authentication
- Role-based access control
- Request validation
- File upload validation
- SQL injection protection via Prisma
- CORS enabled

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 