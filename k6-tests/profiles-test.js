import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const profilesSuccessRate = new Rate('profiles_success_rate');
const profilesRequestDuration = new Trend('profiles_request_duration');
const profilesFailures = new Counter('profiles_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const PROFILES_ENDPOINT = `${BASE_URL}/profiles`;
const AUTH_PROFILE_ENDPOINT = `${BASE_URL}/auth/profile`;

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
        { duration: '20s', target: 60 },  // Sudden spike to 60 users
        { duration: '1m', target: 60 },   // Stay at 60 users for 1 minute
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
    'profiles_success_rate': ['rate>0.95'],  // At least 95% of profile requests should succeed
    'profiles_request_duration': ['p(95)<1500'], // 95% of profile requests should be below 1.5s
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

// Helper function to get profiles with pagination
function getProfiles(token, page = 1, limit = 10) {
  const url = `${PROFILES_ENDPOINT}?page=${page}&limit=${limit}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  profilesRequestDuration.add(duration);
  
  const success = check(response, {
    'profiles request successful': (r) => r.status === 200,
    'profiles data structure valid': (r) => {
      const body = r.json();
      return body.data !== undefined && Array.isArray(body.data) && body.meta !== undefined;
    },
  });
  
  profilesSuccessRate.add(success);
  
  if (!success) {
    profilesFailures.add(1);
    console.log(`Profiles request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get a specific profile by ID
function getProfileById(token, profileId) {
  const url = `${PROFILES_ENDPOINT}/${profileId}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;
  
  profilesRequestDuration.add(duration);
  
  const success = check(response, {
    'profile by ID request successful': (r) => r.status === 200,
    'profile by ID data structure valid': (r) => {
      const body = r.json();
      return body.id !== undefined && body.email !== undefined;
    },
  });
  
  profilesSuccessRate.add(success);
  
  if (!success) {
    profilesFailures.add(1);
    console.log(`Profile by ID request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get the current user's profile
function getCurrentUserProfile(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(AUTH_PROFILE_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  profilesRequestDuration.add(duration);
  
  const success = check(response, {
    'current user profile request successful': (r) => r.status === 200,
    'current user profile data structure valid': (r) => {
      const body = r.json();
      return body.id !== undefined && body.email !== undefined;
    },
  });
  
  profilesSuccessRate.add(success);
  
  if (!success) {
    profilesFailures.add(1);
    console.log(`Current user profile request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to update the current user's profile
function updateCurrentUserProfile(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // Get the current profile first
  const currentProfile = getCurrentUserProfile(token).json();
  
  // Prepare update payload (just update the name slightly)
  const updatePayload = {
    firstName: currentProfile.firstName || 'Test',
    lastName: currentProfile.lastName || 'User',
    // Don't update critical fields like email or role
  };
  
  const startTime = new Date().getTime();
  const response = http.patch(AUTH_PROFILE_ENDPOINT, JSON.stringify(updatePayload), params);
  const duration = new Date().getTime() - startTime;
  
  profilesRequestDuration.add(duration);
  
  const success = check(response, {
    'profile update request successful': (r) => r.status === 200,
    'profile update data structure valid': (r) => {
      const body = r.json();
      return body.id !== undefined && body.email !== undefined;
    },
  });
  
  profilesSuccessRate.add(success);
  
  if (!success) {
    profilesFailures.add(1);
    console.log(`Profile update request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // Get authentication token
  const token = getAuthToken();
  
  // Randomly select which profile endpoint to test
  const requestType = Math.random();
  
  if (requestType < 0.4) {
    // 40% of the time get profiles list
    const page = randomIntBetween(1, 3);
    const limit = randomIntBetween(5, 20);
    getProfiles(token, page, limit);
  } else if (requestType < 0.7) {
    // 30% of the time get a specific profile
    // In a real test, you would get a real profile ID from a previous request
    // For this example, we'll use a placeholder ID
    const profileId = '123e4567-e89b-12d3-a456-426614174000'; // Placeholder UUID
    getProfileById(token, profileId);
  } else if (requestType < 0.9) {
    // 20% of the time get current user profile
    getCurrentUserProfile(token);
  } else {
    // 10% of the time update current user profile
    updateCurrentUserProfile(token);
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}