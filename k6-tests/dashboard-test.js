import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const dashboardSuccessRate = new Rate('dashboard_success_rate');
const dashboardRequestDuration = new Trend('dashboard_request_duration');
const dashboardFailures = new Counter('dashboard_failures');

// Configuration
const BASE_URL = 'https://ebs-api-981332637673.asia-southeast2.run.app/api/v1';
const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const DASHBOARD_ENDPOINT = `${BASE_URL}/admin/dashboard`;
const DASHBOARD_STATS_OBJECTS_ENDPOINT = `${DASHBOARD_ENDPOINT}/stats/objects`;
const DASHBOARD_ACTIVITY_ENDPOINT = `${DASHBOARD_ENDPOINT}/activity`;

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
        { duration: '20s', target: 30 },  // Sudden spike to 30 users
        { duration: '1m', target: 30 },   // Stay at 30 users for 1 minute
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
        { duration: '10m', target: 5 },   // Stay at 5 users for 10 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s (dashboard may be more complex)
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'dashboard_success_rate': ['rate>0.95'],  // At least 95% of dashboard requests should succeed
    'dashboard_request_duration': ['p(95)<3000'], // 95% of dashboard requests should be below 3s
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

// Helper function to get dashboard summary
function getDashboardSummary(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(DASHBOARD_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  dashboardRequestDuration.add(duration);
  
  const success = check(response, {
    'dashboard summary request successful': (r) => r.status === 200,
    'dashboard summary data structure valid': (r) => {
      const body = r.json();
      return body.totalScans !== undefined && 
             body.totalObjects !== undefined && 
             body.totalUsers !== undefined;
    },
  });
  
  dashboardSuccessRate.add(success);
  
  if (!success) {
    dashboardFailures.add(1);
    console.log(`Dashboard summary request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get dashboard object statistics
function getDashboardObjectStats(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(DASHBOARD_STATS_OBJECTS_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  dashboardRequestDuration.add(duration);
  
  const success = check(response, {
    'dashboard object stats request successful': (r) => r.status === 200,
    'dashboard object stats data structure valid': (r) => {
      const body = r.json();
      return body.objectsByCategory !== undefined && 
             body.objectsByRiskLevel !== undefined;
    },
  });
  
  dashboardSuccessRate.add(success);
  
  if (!success) {
    dashboardFailures.add(1);
    console.log(`Dashboard object stats request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

// Helper function to get dashboard activity
function getDashboardActivity(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.get(DASHBOARD_ACTIVITY_ENDPOINT, params);
  const duration = new Date().getTime() - startTime;
  
  dashboardRequestDuration.add(duration);
  
  const success = check(response, {
    'dashboard activity request successful': (r) => r.status === 200,
    'dashboard activity data structure valid': (r) => {
      const body = r.json();
      return body.recentScans !== undefined && 
             Array.isArray(body.recentScans) && 
             body.recentUsers !== undefined && 
             Array.isArray(body.recentUsers);
    },
  });
  
  dashboardSuccessRate.add(success);
  
  if (!success) {
    dashboardFailures.add(1);
    console.log(`Dashboard activity request failed with status ${response.status}: ${response.body}`);
  }
  
  return response;
}

export default function() {
  // Get authentication token
  const token = getAuthToken();
  
  // Randomly select which dashboard endpoint to test
  const dashboardEndpointType = Math.random();
  
  if (dashboardEndpointType < 0.4) {
    // 40% of the time get dashboard summary
    getDashboardSummary(token);
  } else if (dashboardEndpointType < 0.7) {
    // 30% of the time get dashboard object stats
    getDashboardObjectStats(token);
  } else {
    // 30% of the time get dashboard activity
    getDashboardActivity(token);
  }
  
  // Add some randomized sleep time between requests to simulate real user behavior
  sleep(Math.random() * 3 + 2); // Sleep between 2-5 seconds
}