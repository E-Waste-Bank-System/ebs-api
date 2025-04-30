import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import env from './config/env';
import logger from './utils/logger';
import errorHandler from './middlewares/errorHandler';
import sanitize from './middlewares/sanitize';
// Route imports
import authRoutes from './routes/auth';
import articleRoutes from './routes/article';
import requestRoutes from './routes/request';
import reportRoutes from './routes/report';
import proxyRoutes from './routes/proxy';
import fs from 'fs';
import path from 'path';

const app = express();

// Trust proxy for correct client IP detection (needed for Cloud Run, rate limiting, etc.)
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({ origin: env.clientOrigin || '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(sanitize);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger setup
let swaggerSpec: any;
if (process.env.NODE_ENV === 'production') {
  swaggerSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));
} else {
  swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'E-Waste Bank API',
        version: '1.0.0',
        description: 'API for E-Waste Bank System. Features: authentication, articles, requests, reports, AI inference, and more.'
      },
      servers: [
        { url: 'http://localhost:8080/api', description: 'Local dev server' },
        { url: 'https://ebs-api-981332637673.asia-southeast2.run.app/api', description: 'Production server' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: [
      './src/routes/*.ts',
      './src/controllers/*.ts',
      './src/services/*.ts',
      './src/app.ts',
    ],
  });
}
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/proxy', proxyRoutes);

// Error handling
app.use(errorHandler);

export default app;