import express from 'express';
import morgan from 'morgan';
import logger, { stream } from './utils/logger';
import helmet from 'helmet';
import requestId from './middlewares/requestId';
import corsMiddleware from './middlewares/cors';
import cookieParser from 'cookie-parser';
import sanitizeBody from './middlewares/sanitize';

import env from './config/env';
// Define server port before usage
const PORT = Number(env.PORT) || 8080;

import authRoutes from './routes/auth';
import articleRoutes from './routes/article';
import requestRoutes from './routes/request';
import apiLimiter from './middlewares/rateLimiter';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import errorHandler from './middlewares/errorHandler';

const app = express();

// Security headers
app.use(helmet());
// Sanitize request body data
app.use(sanitizeBody);
// Assign unique request IDs
app.use(requestId);
// Middleware
app.use(corsMiddleware);
// Rate limiting
app.use('/api', apiLimiter);
// HTTP request logging
// Cast options as any due to type overload issue
app.use(morgan('combined', { stream } as any));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/requests', requestRoutes);
// Swagger docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Waste Bank System API',
      version: '1.0.0',
      description: 'API documentation for E-Waste Bank System',
    },
    servers: [{ url: `http://localhost:${PORT}/api` }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Articles', description: 'Article management endpoints' },
      { name: 'Requests', description: 'E-waste request endpoints' },
      { name: 'AI', description: 'AI inference and estimation' },
      { name: 'Reports', description: 'Reporting endpoints' }
    ],
    components: {
      schemas: {
        Article: {
          type: 'object',
          required: ['id', 'title', 'content', 'imageUrl', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            content: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        EWasteRequest: {
          type: 'object',
          required: ['id', 'userId', 'weight', 'status', 'imageUrl', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            weight: { type: 'number' },
            price: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            pickupDate: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          }
        },
        InferenceResponse: { type: 'object' },
        EstimateResponse: { type: 'object' },
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string' }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};
const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});