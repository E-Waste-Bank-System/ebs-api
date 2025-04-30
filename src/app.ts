import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
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

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: env.clientOrigin || '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(mongoSanitize());
app.use(sanitize);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger setup
const swaggerSpec = swaggerJSDoc({
  definition: { openapi: '3.0.0', info: { title: 'E-Waste Bank API', version: '1.0.0' } },
  apis: ['./src/routes/*.ts'],
});
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