import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const scansSuccessRate = new Rate('scans_success_rate');
const scansRequestDuration = new Trend('scans_request_duration');
const scansFailures = new Counter('scans_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const SCANS_ENDPOINT = `${BASE_URL}/scans`;
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const ADMIN_SCANS_ENDPOINT = `${BASE_URL}/admin/scans`;

// Test data
const VALID_CREDENTIALS = {
  email: 'ebs@admin.com',
  password: 'admin1234'
};

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
        { duration: '1m', target: 10 },  // Ramp up to 10 users over 1 minute
        { duration: '3m', target: 10 },  // Stay at 10 users for 3 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'load' },
    },
    // Stress test - find the breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 15 },  // Ramp up to 15 users over 1 minute
        { duration: '2m', target: 15 },  // Stay at 15 users for 2 minutes
        { duration: '1m', target: 25 },  // Ramp up to 25 users over 1 minute
        { duration: '2m', target: 25 },  // Stay at 25 users for 2 minutes
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
        { duration: '20s', target: 40 },  // Sudden spike to 40 users
        { duration: '1m', target: 40 },   // Stay at 40 users for 1 minute
        { duration: '10s', target: 0 },   // Quickly ramp down
      ],
      tags: { test_type: 'spike' },
    },
    // Soak test - verify system stability over time
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
        { duration: '10m', target: 10 },  // Stay at 10 users for 10 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<1500'], // 95% of requests should be below 1.5s
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'scans_success_rate': ['rate>0.95'],  // At least 95% of scan requests should succeed
    'scans_request_duration': ['p(95)<2000'], // 95% of scan requests should be below 2s
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

// Helper function to get user scans with pagination
function getUserScans(token, page = 1, limit = 10) {
  const url = `${SCANS_ENDPOINT}?page=${page}&limit=${limit}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  scansRequestDuration.add(duration);
  
  const success = check(response, {
    'user scans request successful': (r) => r.status === 200,
    'user scans data structure valid': (r) => {
      const body = r.json();
      return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
    },
  });
  
  scansSuccessRate.add(success);
  
  if (!success) {
    scansFailures.add(1);
    console.log(`User scans request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get a specific user scan by ID
function getUserScanById(token, scanId) {
  const url = `${SCANS_ENDPOINT}/${scanId}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  scansRequestDuration.add(duration);
  
  const success = check(response, {
    'user scan by ID request successful': (r) => r.status === 200,
    'user scan by ID data structure valid': (r) => {
      const body = r.json();
      return body.id !== undefined && body.imageUrl !== undefined;
    },
  });
  
  scansSuccessRate.add(success);
  
  if (!success) {
    scansFailures.add(1);
    console.log(`User scan by ID request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get admin scans with pagination
function getAdminScans(token, page = 1, limit = 10) {
  const url = `${ADMIN_SCANS_ENDPOINT}?page=${page}&limit=${limit}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  scansRequestDuration.add(duration);
  
  const success = check(response, {
    'admin scans request successful': (r) => r.status === 200,
    'admin scans data structure valid': (r) => {
      const body = r.json();
      return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
    },
  });
  
  scansSuccessRate.add(success);
  
  if (!success) {
    scansFailures.add(1);
    console.log(`Admin scans request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get a specific admin scan by ID
function getAdminScanById(token, scanId) {
  const url = `${ADMIN_SCANS_ENDPOINT}/${scanId}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  scansRequestDuration.add(duration);
  
  const success = check(response, {
    'admin scan by ID request successful': (r) => r.status === 200,
    'admin scan by ID data structure valid': (r) => {
      const body = r.json();
      return body.id !== undefined && body.imageUrl !== undefined;
    },
  });
  
  scansSuccessRate.add(success);
  
  if (!success) {
    scansFailures.add(1);
    console.log(`Admin scan by ID request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // Get authentication token
  const token = getAuthToken();
  
  // 70% of the time do user scan requests, 30% do admin scan requests
  const doAdminRequest = Math.random() < 0.3;
  
  if (doAdminRequest) {
    // 80% of the time get admin scans list, 20% get a specific scan
    const getSpecificScan = Math.random() < 0.2;
    
    if (getSpecificScan) {
      // In a real test, you would get a real scan ID from a previous request
      // For this example, we'll use a placeholder ID
      const scanId = '123e4567-e89b-12d3-a456-426614174000'; // Placeholder UUID
      getAdminScanById(token, scanId);
    } else {
      // Get admin scans with random pagination
      const page = randomIntBetween(1, 3);
      const limit = randomIntBetween(5, 20);
      getAdminScans(token, page, limit);
    }
  } else {
    // 80% of the time get user scans list, 20% get a specific scan
    const getSpecificScan = Math.random() < 0.2;
    
    if (getSpecificScan) {
      // In a real test, you would get a real scan ID from a previous request
      // For this example, we'll use a placeholder ID
      const scanId = '123e4567-e89b-12d3-a456-426614174000'; // Placeholder UUID
      getUserScanById(token, scanId);
    } else {
      // Get user scans with random pagination
      const page = randomIntBetween(1, 5);
      const limit = randomIntBetween(5, 20);
      getUserScans(token, page, limit);
    }
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}