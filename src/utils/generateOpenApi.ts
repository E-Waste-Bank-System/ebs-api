import fs from 'fs';
import path from 'path';
import swaggerJsDoc from 'swagger-jsdoc';
import env from '../config/env';

const PORT = Number(env.PORT) || 8080;
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Waste Bank System API',
      version: '1.0.0',
      description: 'API documentation for E-Waste Bank System',
    },
    servers: [{ url: `http://localhost:${PORT}/api` }],
  },
  apis: [path.join(__dirname, '../routes/*.ts')],
};

const swaggerSpec = swaggerJsDoc(options);
const outputPath = path.resolve(__dirname, '../../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI spec generated at ${outputPath}`);
