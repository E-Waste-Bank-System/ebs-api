import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const loginRequestDuration = new Trend('login_request_duration');
const loginFailures = new Counter('login_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;

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
        { duration: '1m', target: 20 },  // Ramp up to 20 users over 1 minute
        { duration: '2m', target: 20 },  // Stay at 20 users for 2 minutes
        { duration: '1m', target: 30 },  // Ramp up to 30 users over 1 minute
        { duration: '2m', target: 30 },  // Stay at 30 users for 2 minutes
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
        { duration: '20s', target: 50 },  // Sudden spike to 50 users
        { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
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
    'http_req_duration': ['p(95)<1000'], // 95% of requests should be below 1s
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'login_success_rate': ['rate>0.95'],  // At least 95% of logins should succeed
    'login_request_duration': ['p(95)<1500'], // 95% of login requests should be below 1.5s
  },
};

// Helper function to generate random invalid credentials
function generateInvalidCredentials() {
  return {
    email: `user_${randomString(8)}@example.com`,
    password: randomString(10)
  };
}

export default function() {
  // 80% of the time use valid credentials, 20% use invalid
  const useValidCredentials = Math.random() < 0.8;
  const credentials = useValidCredentials ? VALID_CREDENTIALS : generateInvalidCredentials();
  
  // Set up request parameters
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Make the login request
  const startTime = new Date().getTime();
  const response = http.post(LOGIN_ENDPOINT, JSON.stringify(credentials), params);
  const duration = new Date().getTime() - startTime;
  
  // Record the login request duration
  loginRequestDuration.add(duration);
  
  // Check if the login was successful
  const success = useValidCredentials 
    ? check(response, {
        'login successful': (r) => r.status === 200 && r.json('access_token') !== undefined,
      })
    : check(response, {
        'invalid login rejected': (r) => r.status === 401,
      });
  
  // Record success/failure metrics
  loginSuccessRate.add(success);
  
  if (!success) {
    loginFailures.add(1);
    console.log(`Login failed with status ${response.status}: ${response.body}`);
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}