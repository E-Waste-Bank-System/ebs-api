import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Import all test modules
import healthTest from './health-test.js';
import loginTest from './login-test.js';
import dashboardTest from './dashboard-test.js';
import profilesTest from './profiles-test.js';
import articlesTest from './articles-test.js';
import objectsTest from './objects-test.js';
import scansTest from './scans-test.js';

// Define test distribution weights
const TEST_WEIGHTS = {
  login: 15,      // 15% of requests
  articles: 15,   // 15% of requests
  objects: 15,    // 15% of requests
  scans: 20,      // 20% of requests
  dashboard: 10,  // 10% of requests
  profiles: 10,   // 10% of requests
  health: 15      // 15% of requests
};

// Calculate cumulative weights for random selection
const CUMULATIVE_WEIGHTS = [];
let cumulativeWeight = 0;
for (const [test, weight] of Object.entries(TEST_WEIGHTS)) {
  cumulativeWeight += weight;
  CUMULATIVE_WEIGHTS.push({ test, weight: cumulativeWeight });
}

// Test configuration
export const options = {
  // Test scenarios
  scenarios: {
    // Smoke test - verify the system works under minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Load test - verify the system under normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to 20 users over 2 minutes
        { duration: '5m', target: 20 },  // Stay at 20 users for 5 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'load' },
    },
    // Stress test - find the breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },  // Ramp up to 30 users over 2 minutes
        { duration: '5m', target: 30 },  // Stay at 30 users for 5 minutes
        { duration: '2m', target: 60 },  // Ramp up to 60 users over 2 minutes
        { duration: '5m', target: 60 },  // Stay at 60 users for 5 minutes
        { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
        { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
        { duration: '2m', target: 0 },   // Ramp down to 0 users over 2 minutes
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test - sudden surge of users
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 0 },    // Baseline
        { duration: '1m', target: 150 },   // Sudden spike to 150 users over 1 minute
        { duration: '3m', target: 150 },   // Stay at 150 users for 3 minutes
        { duration: '1m', target: 0 },     // Quickly ramp down over 1 minute
      ],
      tags: { test_type: 'spike' },
    },
    // Soak test - verify system stability over time
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },    // Ramp up to 30 users over 2 minutes
        { duration: '30m', target: 30 },   // Stay at 30 users for 30 minutes
        { duration: '2m', target: 0 },     // Ramp down to 0 users over 2 minutes
      ],
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    // Define performance thresholds
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
  },
};

// Helper function to select a random test based on weights
function selectRandomTest() {
  const random = Math.random() * 100; // Random number between 0-100
  
  for (const { test, weight } of CUMULATIVE_WEIGHTS) {
    if (random <= weight) {
      return test;
    }
  }
  
  // Fallback to health test if something goes wrong
  return 'health';
}

// Main test function
export default function() {
  // Select a random test based on weights
  const testType = selectRandomTest();
  
  // Execute the selected test
  switch (testType) {
    case 'login':
      group('Login Test', () => {
        loginTest();
      });
      break;
    case 'articles':
      group('Articles Test', () => {
        articlesTest();
      });
      break;
    case 'objects':
      group('Objects Test', () => {
        objectsTest();
      });
      break;
    case 'scans':
      group('Scans Test', () => {
        scansTest();
      });
      break;
    case 'dashboard':
      group('Dashboard Test', () => {
        dashboardTest();
      });
      break;
    case 'profiles':
      group('Profiles Test', () => {
        profilesTest();
      });
      break;
    case 'health':
      group('Health Test', () => {
        healthTest();
      });
      break;
    default:
      console.log(`Unknown test type: ${testType}`);
      // Fallback to health test
      group('Health Test (Fallback)', () => {
        healthTest();
      });
  }
  
  // Add a small random sleep between tests
  sleep(Math.random() * 1 + 0.5); // Sleep between 0.5-1.5 seconds
}

// Setup function - runs once per VU
export function setup() {
  console.log('Setting up main test');
  // In a real scenario, you might want to prepare test data here
}

// Teardown function - runs once at the end of the test
export function teardown(data) {
  console.log('Tearing down main test');
  // In a real scenario, you might want to clean up test data here
}