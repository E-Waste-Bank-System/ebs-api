// scripts/generate-swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

console.log('Generating Swagger specification...');

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
    path.resolve(__dirname, '../src/routes/*.ts'),
    path.resolve(__dirname, '../src/controllers/*.ts'),
    path.resolve(__dirname, '../src/services/*.ts'),
    path.resolve(__dirname, '../src/app.ts'),
  ],
});

const distDir = path.join(__dirname, '../dist');
// Make sure the dist directory exists
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

const outputPath = path.join(distDir, 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log(`Swagger spec generated at: ${outputPath}`);
