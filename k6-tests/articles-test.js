import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const articlesSuccessRate = new Rate('articles_success_rate');
const articlesRequestDuration = new Trend('articles_request_duration');
const articlesFailures = new Counter('articles_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const ARTICLES_ENDPOINT = `${BASE_URL}/articles`;
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const ADMIN_ARTICLES_ENDPOINT = `${BASE_URL}/admin/articles`;

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
        { duration: '1m', target: 20 },  // Ramp up to 20 users over 1 minute
        { duration: '2m', target: 20 },  // Stay at 20 users for 2 minutes
        { duration: '1m', target: 40 },  // Ramp up to 40 users over 1 minute
        { duration: '2m', target: 40 },  // Stay at 40 users for 2 minutes
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
        { duration: '20s', target: 80 },  // Sudden spike to 80 users
        { duration: '1m', target: 80 },   // Stay at 80 users for 1 minute
        { duration: '10s', target: 0 },   // Quickly ramp down
      ],
      tags: { test_type: 'spike' },
    },
    // Soak test - verify system stability over time
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 15 },   // Ramp up to 15 users over 1 minute
        { duration: '10m', target: 15 },  // Stay at 15 users for 10 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<1000'], // 95% of requests should be below 1s
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'articles_success_rate': ['rate>0.95'],  // At least 95% of article requests should succeed
    'articles_request_duration': ['p(95)<1500'], // 95% of article requests should be below 1.5s
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

// Helper function to get articles with pagination and filters
function getArticles(token, page = 1, limit = 10, tag = null, search = null) {
  let url = `${ARTICLES_ENDPOINT}?page=${page}&limit=${limit}`;
  
  if (tag) {
    url += `&tag=${tag}`;
  }
  
  if (search) {
    url += `&search=${search}`;
  }
  
  // Validate token before proceeding
  if (!token) {
    console.log('Cannot make articles request: No authentication token provided');
    articlesFailures.add(1);
    articlesSuccessRate.add(0);
    return null;
  }
  
  console.log(`Making articles request to: ${url}`);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  articlesRequestDuration.add(duration);
  
  const success = check(response, {
    'articles request successful': (r) => r.status === 200,
    'articles data structure valid': (r) => {
      if (r.status !== 200) return false;
      try {
        const body = r.json();
        return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
      } catch (e) {
        console.log(`Error parsing articles response: ${e.message}`);
        return false;
      }
    },
  });
  
  articlesSuccessRate.add(success);
  
  if (!success) {
    articlesFailures.add(1);
    console.log(`Articles request failed with status ${response.status}: ${response.body}`);
    console.log(`Request URL: ${url}`);
    console.log(`Request headers: ${JSON.stringify(params.headers)}`);
  }
  
  return response;
}

// Helper function to get admin articles (requires authentication)
function getAdminArticles(token, page = 1, limit = 10) {
  const url = `${ADMIN_ARTICLES_ENDPOINT}?page=${page}&limit=${limit}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  articlesRequestDuration.add(duration);
  
  const success = check(response, {
    'admin articles request successful': (r) => r.status === 200,
    'admin articles data structure valid': (r) => {
      const body = r.json();
      return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
    },
  });
  
  articlesSuccessRate.add(success);
  
  if (!success) {
    articlesFailures.add(1);
    console.log(`Admin articles request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // Get authentication token for all requests
  const token = getAuthToken();
  
  // Skip operations if authentication failed
  if (!token) {
    console.log('Skipping operations due to authentication failure');
    return;
  }
  
  // 70% of the time do public article requests, 30% do admin article requests
  const doAdminRequest = Math.random() < 0.3;
  
  if (doAdminRequest) {
    // Get admin articles with random pagination
    const page = randomIntBetween(1, 3);
    const limit = randomIntBetween(5, 20);
    getAdminArticles(token, page, limit);
  } else {
    // Get public articles with random pagination and filters
    const page = randomIntBetween(1, 5);
    const limit = randomIntBetween(5, 20);
    
    // 30% of the time include a tag filter
    const includeTag = Math.random() < 0.3;
    const tag = includeTag ? 'e-waste' : null; // Example tag
    
    // 20% of the time include a search term
    const includeSearch = Math.random() < 0.2;
    const searchTerms = ['recycling', 'electronic', 'waste', 'environment'];
    const search = includeSearch ? searchTerms[randomIntBetween(0, searchTerms.length - 1)] : null;
    
    getArticles(token, page, limit, tag, search);
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}