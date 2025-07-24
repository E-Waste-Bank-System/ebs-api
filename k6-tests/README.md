# E-Waste Barter System (EBS) Load and Stress Testing

This directory contains k6 load and stress test scripts for the E-Waste Barter System (EBS) API.

## Overview

These test scripts are designed to evaluate the performance and reliability of the EBS API under various load conditions. The tests cover all major endpoints of the application, including authentication, articles, objects, scans, dashboard, profiles, and health checks.

## Test Scripts

- **login-test.js**: Tests the authentication endpoints
- **articles-test.js**: Tests the articles endpoints (public and admin)
- **objects-test.js**: Tests the objects endpoints (public and admin)
- **scans-test.js**: Tests the scans endpoints (user and admin)
- **dashboard-test.js**: Tests the admin dashboard endpoints
- **profiles-test.js**: Tests the user profiles endpoints
- **health-test.js**: Tests the health check endpoints
- **scan-upload-test.js**: Tests the scan upload functionality
- **main-test.js**: Combined test that runs all tests with weighted distribution

## Test Scenarios

Each test script includes the following test scenarios:

1. **Smoke Test**: Verifies the system works under minimal load (1 VU, 30s-1m)
2. **Load Test**: Verifies the system under normal expected load (ramping up to 5-20 VUs)
3. **Stress Test**: Finds the breaking point by gradually increasing load (ramping up to 20-100 VUs)
4. **Spike Test**: Tests system response to sudden surges of users (quick ramp up to 30-200 VUs)
5. **Soak Test**: Verifies system stability over time (sustained load for 5-30 minutes)

## Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/
2. The tests are configured to use the EBS API at https://ebs-api-981332637673.asia-southeast2.run.app/api/v1

## Running the Tests

### Running Individual Tests

To run a specific test with the default scenario:

```bash
k6 run k6-tests/login-test.js
```

To run a specific test with a specific scenario:

```bash
k6 run --tag test_type=smoke k6-tests/login-test.js
```

Available scenarios: `smoke`, `load`, `stress`, `spike`, `soak`

### Running the Combined Test

To run all tests with weighted distribution:

```bash
k6 run k6-tests/main-test.js
```

### Running with Environment Variables

You can customize the test by setting environment variables:

```bash
k6 run -e BASE_URL=https://ebs-api-981332637673.asia-southeast2.run.app/api/v1 -e VUS=10 -e DURATION=1m k6-tests/login-test.js
```

## Test Data

The tests use the following test credentials by default:

```
Admin credentials:
email: ebs@admin.com
password: admin1234

User credentials:
email: ebs@user.com
password: user1234
```

These credentials are configured for the test environment.

## Performance Thresholds

The tests include the following performance thresholds:

- 95% of requests should complete within specified time limits (varies by endpoint)
- Less than 5% of requests should fail
- Success rates for specific endpoints should be above 95%

## Interpreting Results

After running a test, k6 will output detailed metrics including:

- Request rates
- Response times (min, max, average, percentiles)
- Error rates
- Custom metrics defined in the tests

Pay special attention to:

- **http_req_duration**: How long requests are taking
- **http_req_failed**: The rate of failed requests
- **iterations**: How many test iterations completed
- Custom metrics like **login_success_rate**, **articles_request_duration**, etc.

## Customizing Tests

To customize the tests for your specific environment:

1. Update the `BASE_URL` constant in each test script
2. Modify the `VALID_CREDENTIALS` object with valid test credentials
3. Adjust the test scenarios in the `options` object to match your expected load
4. Update the performance thresholds to match your SLAs

## Best Practices

1. Start with smoke tests to verify basic functionality
2. Run load tests that simulate expected production traffic
3. Use stress tests to find the breaking point of your system
4. Run soak tests to identify memory leaks or resource exhaustion
5. Monitor your system during tests to identify bottlenecks

## Troubleshooting

If tests are failing unexpectedly:

1. Verify the API is running and accessible
2. Check that test credentials are valid
3. Examine the API logs for errors
4. Reduce the load and gradually increase to identify breaking points
5. Check for rate limiting or security measures that might block the tests