// scripts/generate-swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Waste Bank API',
      version: '1.0.2',
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

fs.writeFileSync(
  path.join(__dirname, '../dist/swagger.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

console.log('Swagger spec generated!');
