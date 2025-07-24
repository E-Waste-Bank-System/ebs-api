import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const healthSuccessRate = new Rate('health_success_rate');
const healthRequestDuration = new Trend('health_request_duration');
const healthFailures = new Counter('health_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app';
const HEALTH_ENDPOINT = `${BASE_URL}/health`;
const API_ROOT_ENDPOINT = `${BASE_URL}/api/v1`;

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
        { duration: '1m', target: 20 },  // Ramp up to 20 users over 1 minute
        { duration: '3m', target: 20 },  // Stay at 20 users for 3 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'load' },
    },
    // Stress test - find the breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },  // Ramp up to 50 users over 1 minute
        { duration: '2m', target: 50 },  // Stay at 50 users for 2 minutes
        { duration: '1m', target: 100 }, // Ramp up to 100 users over 1 minute
        { duration: '2m', target: 100 }, // Stay at 100 users for 2 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test - sudden surge of users
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },    // Baseline
        { duration: '20s', target: 200 },  // Sudden spike to 200 users
        { duration: '1m', target: 200 },   // Stay at 200 users for 1 minute
        { duration: '10s', target: 0 },    // Quickly ramp down
      ],
      tags: { test_type: 'spike' },
    },
    // Soak test - verify system stability over time
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },   // Ramp up to 30 users over 1 minute
        { duration: '10m', target: 30 },  // Stay at 30 users for 10 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<500'],  // 95% of requests should be below 500ms (health check should be fast)
    'http_req_failed': ['rate<0.01'],     // Less than 1% of requests should fail
    'health_success_rate': ['rate>0.99'], // At least 99% of health checks should succeed
    'health_request_duration': ['p(95)<300'], // 95% of health checks should be below 300ms
  },
};

// Helper function to check the health endpoint
function checkHealth() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(HEALTH_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  healthRequestDuration.add(duration);
  
  const success = check(response, {
    'health check successful': (r) => r.status === 200,
    'health check returns UP status': (r) => {
      const body = r.json();
      return body.status === 'ok' || body.status === 'UP';
    },
  });
  
  healthSuccessRate.add(success);
  
  if (!success) {
    healthFailures.add(1);
    console.log(`Health check failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to check the API root endpoint
function checkApiRoot() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(API_ROOT_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  healthRequestDuration.add(duration);
  
  const success = check(response, {
    'API root check successful': (r) => r.status === 200,
  });
  
  healthSuccessRate.add(success);
  
  if (!success) {
    healthFailures.add(1);
    console.log(`API root check failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // 80% of the time check the health endpoint, 20% check the API root
  const checkType = Math.random();
  
  if (checkType < 0.8) {
    checkHealth();
  } else {
    checkApiRoot();
  }
  
  // Add a small sleep time between requests
  sleep(Math.random() * 1 + 0.5); // Sleep between 0.5-1.5 seconds
}