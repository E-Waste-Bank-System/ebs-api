import express from 'express';
import morgan from 'morgan';
import logger, { stream } from './utils/logger';
import helmet from 'helmet';
import requestId from './middlewares/requestId';
import corsMiddleware from './middlewares/cors';
import cookieParser from 'cookie-parser';
import sanitizeBody from './middlewares/sanitize';
import fs from 'fs';
import path from 'path';

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
let swaggerSpec;
if (process.env.NODE_ENV === 'production') {
  // Serve static openapi.json in production
  swaggerSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '../openapi.json'), 'utf8'));
  // Dynamically set the servers URL for production
  swaggerSpec.servers = [
    { url: 'https://ebs-api-981332637673.asia-southeast2.run.app/' }
  ];
} else {
  // Use swagger-jsdoc in development
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'E-Waste Bank System API',
        version: '1.0.0',
        description: 'API documentation for E-Waste Bank System',
      },
      servers: [{ url: `http://localhost:${process.env.PORT}/` }],
    },
    apis: ['./src/routes/*.ts'],
  };
  swaggerSpec = swaggerJsDoc(swaggerOptions);
}
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});