import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const objectsSuccessRate = new Rate('objects_success_rate');
const objectsRequestDuration = new Trend('objects_request_duration');
const objectsFailures = new Counter('objects_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const OBJECTS_ENDPOINT = `${BASE_URL}/objects`;
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const ADMIN_OBJECTS_ENDPOINT = `${BASE_URL}/admin/objects`;

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
    'objects_success_rate': ['rate>0.95'],  // At least 95% of object requests should succeed
    'objects_request_duration': ['p(95)<1500'], // 95% of object requests should be below 1.5s
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
  
  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200 && r.json('access_token') !== undefined,
  });
  
  if (!success) {
    console.log(`Login failed with status ${loginResponse.status}: ${loginResponse.body}`);
    return null;
  }
  
  return loginResponse.json('access_token');
}

// Helper function to get objects with pagination and filters
function getObjects(token, page = 1, limit = 10, scanId = null, category = null, isValidated = null) {
  let url = `${OBJECTS_ENDPOINT}?page=${page}&limit=${limit}`;
  
  if (scanId) {
    url += `&scanId=${scanId}`;
  }
  
  if (category) {
    url += `&category=${category}`;
  }
  
  if (isValidated !== null) {
    url += `&isValidated=${isValidated}`;
  }
  
  // Validate token before proceeding
  if (!token) {
    console.log('Cannot make objects request: No authentication token provided');
    objectsFailures.add(1);
    objectsSuccessRate.add(0);
    return null;
  }
  
  console.log(`Making objects request to: ${url}`);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  objectsRequestDuration.add(duration);
  
  const success = check(response, {
    'objects request successful': (r) => r.status === 200,
    'objects data structure valid': (r) => {
      if (r.status !== 200) return false;
      try {
        const body = r.json();
        return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
      } catch (e) {
        console.log(`Error parsing objects response: ${e.message}`);
        return false;
      }
    },
  });
  
  objectsSuccessRate.add(success);
  
  if (!success) {
    objectsFailures.add(1);
    console.log(`Objects request failed with status ${response.status}: ${response.body}`);
    console.log(`Request URL: ${url}`);
    console.log(`Request headers: ${JSON.stringify(params.headers)}`);
  }
  
  return response;
}

// Helper function to get admin objects (requires authentication)
function getAdminObjects(token, page = 1, limit = 10, scanId = null, category = null, isValidated = null) {
  // Validate token before proceeding
  if (!token) {
    console.log('Cannot make admin objects request: No authentication token provided');
    objectsFailures.add(1);
    objectsSuccessRate.add(0);
    return null;
  }

  let url = `${ADMIN_OBJECTS_ENDPOINT}?page=${page}&limit=${limit}`;
  
  if (scanId) {
    url += `&scanId=${scanId}`;
  }
  
  if (category) {
    url += `&category=${category}`;
  }
  
  if (isValidated !== null) {
    url += `&isValidated=${isValidated}`;
  }
  
  console.log(`Making admin objects request to: ${url}`);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  objectsRequestDuration.add(duration);
  
  const success = check(response, {
    'admin objects request successful': (r) => r.status === 200,
    'admin objects data structure valid': (r) => {
      if (r.status !== 200) return false;
      try {
        const body = r.json();
        return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
      } catch (e) {
        console.log(`Error parsing admin objects response: ${e.message}`);
        return false;
      }
    },
  });
  
  objectsSuccessRate.add(success);
  
  if (!success) {
    objectsFailures.add(1);
    console.log(`Admin objects request failed with status ${response.status}: ${response.body}`);
    console.log(`Request URL: ${url}`);
    console.log(`Request headers: ${JSON.stringify(params.headers)}`);
  }
  
  return response;
}

// Helper function to validate an object (admin only)
function validateObject(token, objectId, isValid = true) {
  // Validate token before proceeding
  if (!token) {
    console.log('Cannot validate object: No authentication token provided');
    objectsFailures.add(1);
    objectsSuccessRate.add(0);
    return null;
  }

  const url = `${ADMIN_OBJECTS_ENDPOINT}/${objectId}/validate`;
  
  const payload = {
    isValid: isValid
  };
  
  console.log(`Making object validation request to: ${url}`);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.patch(url, JSON.stringify(payload), params);
  const duration = new Date().getTime() - startTime;
  
  objectsRequestDuration.add(duration);
  
  const success = check(response, {
    'object validation successful': (r) => r.status === 200,
  });
  
  objectsSuccessRate.add(success);
  
  if (!success) {
    objectsFailures.add(1);
    console.log(`Object validation failed with status ${response.status}: ${response.body}`);
    console.log(`Request URL: ${url}`);
    console.log(`Request headers: ${JSON.stringify(params.headers)}`);
    console.log(`Request payload: ${JSON.stringify(payload)}`);
  }
  
  return response;
}

export default function() {
  // 70% of the time do public object requests, 30% do admin object requests
  const doAdminRequest = Math.random() < 0.3;
  
  // Get authentication token for all requests
  const token = getAuthToken();
  
  if (doAdminRequest) {
    // Skip admin operations if authentication failed
    if (!token) {
      console.log('Skipping admin operations due to authentication failure');
      // Fallback to public objects request
      const page = randomIntBetween(1, 5);
      const limit = randomIntBetween(5, 20);
      getObjects(token, page, limit, null, null, true);
      return;
    }
    
    // 80% of the time just get admin objects, 20% of the time validate an object
    const doValidation = Math.random() < 0.2;
    
    if (doValidation) {
      // In a real test, you would get a real object ID from a previous request
      // For this example, we'll use a placeholder ID
      const objectId = '123e4567-e89b-12d3-a456-426614174000'; // Placeholder UUID
      const isValid = Math.random() < 0.8; // 80% of validations are positive
      validateObject(token, objectId, isValid);
    } else {
      // Get admin objects with random pagination and filters
      const page = randomIntBetween(1, 3);
      const limit = randomIntBetween(5, 20);
      
      // 30% of the time include a category filter
      const includeCategory = Math.random() < 0.3;
      const categories = ['CPU', 'GPU', 'RAM', 'HDD', 'SSD', 'MOTHERBOARD', 'PSU', 'FAN'];
      const category = includeCategory ? categories[randomIntBetween(0, categories.length - 1)] : null;
      
      // 40% of the time filter by validation status
      const includeValidation = Math.random() < 0.4;
      const isValidated = includeValidation ? (Math.random() < 0.5) : null;
      
      getAdminObjects(token, page, limit, null, category, isValidated);
    }
  } else {
    // Get public objects with random pagination and filters
    const page = randomIntBetween(1, 5);
    const limit = randomIntBetween(5, 20);
    
    // 30% of the time include a category filter
    const includeCategory = Math.random() < 0.3;
    const categories = ['CPU', 'GPU', 'RAM', 'HDD', 'SSD', 'MOTHERBOARD', 'PSU', 'FAN'];
    const category = includeCategory ? categories[randomIntBetween(0, categories.length - 1)] : null;
    
    // 20% of the time filter by validation status
    const includeValidation = Math.random() < 0.2;
    const isValidated = includeValidation ? true : null; // Only show validated objects in public API
    
    getObjects(token, page, limit, null, category, isValidated);
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}