import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const scanSuccessRate = new Rate('scan_success_rate');
const scanRequestDuration = new Trend('scan_request_duration');
const scanFailures = new Counter('scan_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const SCAN_ENDPOINT = `${BASE_URL}/scans`;
const ADMIN_SCANS_ENDPOINT = `${BASE_URL}/admin/scans`;

// Test data
const VALID_CREDENTIALS = {
  email: 'ebs@admin.com',
  password: 'admin1234'
};

// Sample images to use for testing
// In a real scenario, you would have multiple test images in a directory
// For this example, we'll simulate having 3 test images
const TEST_IMAGES = new SharedArray('test_images', function() {
  return [
    { name: 'test_image_1.jpg', data: 'data/test_image_1.jpg' },
    { name: 'test_image_2.jpg', data: 'data/test_image_2.jpg' },
    { name: 'test_image_3.jpg', data: 'data/test_image_3.jpg' }
  ];
});

export const options = {
  // Test scenarios
  scenarios: {
    // Smoke test - verify the system works under minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    // Load test - verify the system under normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },   // Ramp up to 5 users over 1 minute
        { duration: '3m', target: 5 },   // Stay at 5 users for 3 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'load' },
    },
    // Stress test - find the breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },  // Ramp up to 10 users over 1 minute
        { duration: '2m', target: 10 },  // Stay at 10 users for 2 minutes
        { duration: '1m', target: 15 },  // Ramp up to 15 users over 1 minute
        { duration: '2m', target: 15 },  // Stay at 15 users for 2 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test - sudden surge of users
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },   // Baseline
        { duration: '20s', target: 20 },  // Sudden spike to 20 users
        { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
        { duration: '10s', target: 0 },   // Quickly ramp down
      ],
      tags: { test_type: 'spike' },
    },
    // Soak test - verify system stability over time
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },    // Ramp up to 5 users over 1 minute
        { duration: '5m', target: 5 },    // Stay at 5 users for 5 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<5000'],  // 95% of requests should be below 5s (scan processing takes time)
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'scan_success_rate': ['rate>0.95'],   // At least 95% of scans should succeed
    'scan_request_duration': ['p(95)<8000'], // 95% of scan requests should be below 8s
  },
};

// Helper function to get an authentication token
function getAuthToken() {
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const loginResponse = http.post(LOGIN_ENDPOINT, JSON.stringify(VALID_CREDENTIALS), loginParams);
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200 && r.json('access_token') !== undefined,
  });
  
  return loginResponse.json('access_token');
}

// Simulate file upload by using a binary file
// In a real test, you would use actual image files
function simulateFileUpload(token) {
  // In a real scenario, you would load actual files
  // For this example, we'll simulate the file data
  // const imageIndex = randomIntBetween(0, TEST_IMAGES.length - 1);
  // const imageInfo = TEST_IMAGES[imageIndex];
  
  // Simulate binary data for an image (in a real test, you would use actual files)
  // This is a placeholder - in a real test you would use:
  // const imageData = open(imageInfo.data, 'b');
  
  // For this example, we'll create a small binary file in memory
  const imageData = encoding.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); // 1x1 transparent GIF
  
  const filename = `test_image_${uuidv4()}.jpg`;
  
  const requestParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // Create a FormData object for the file upload
  const fd = new FormData();
  fd.append('file', http.file(imageData, filename, 'image/jpeg'));
  
  // Make the scan request
  const startTime = new Date().getTime();
  const response = http.post(SCAN_ENDPOINT, fd, requestParams);
  const duration = new Date().getTime() - startTime;
  
  // Record the scan request duration
  scanRequestDuration.add(duration);
  
  // Check if the scan was successful
  const success = check(response, {
    'scan successful': (r) => r.status === 201 && r.json('id') !== undefined,
  });
  
  // Record success/failure metrics
  scanSuccessRate.add(success);
  
  if (!success) {
    scanFailures.add(1);
    console.log(`Scan failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // Get authentication token
  const token = getAuthToken();
  
  // Perform scan upload
  const scanResponse = simulateFileUpload(token);
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 5 + 2); // Sleep between 2-7 seconds
}

// Setup function - runs once per VU
export function setup() {
  console.log('Setting up scan upload test');
  // In a real scenario, you might want to prepare test data here
  // For example, you could create test users or prepare test files
}

// Teardown function - runs once at the end of the test
export function teardown(data) {
  console.log('Tearing down scan upload test');
  // In a real scenario, you might want to clean up test data here
  // For example, you could delete test users or files created during the test
}