#!/bin/bash

# E-Waste Barter System (EBS) Load and Stress Test Runner
# This script runs k6 load and stress tests for the EBS API

# Set default values
BASE_URL="https://ebs-api-981332637673.asia-southeast2.run.app/api/v1"
OUTPUT_DIR="./results"
TEST_TYPE="smoke" # Options: smoke, load, stress, spike, soak

# Function to display usage information
usage() {
  echo "Usage: $0 [options] [test_name]"
  echo ""
  echo "Options:"
  echo "  -h, --help                 Display this help message"
  echo "  -u, --url URL              Set the base URL (default: $BASE_URL)"
  echo "  -o, --output-dir DIR       Set the output directory (default: $OUTPUT_DIR)"
  echo "  -t, --test-type TYPE       Set the test type (default: $TEST_TYPE)"
  echo "                             Valid types: smoke, load, stress, spike, soak"
  echo "  -a, --all                  Run all tests"
  echo ""
  echo "Available tests:"
  echo "  login                      Test authentication endpoints"
  echo "  articles                   Test articles endpoints"
  echo "  objects                    Test objects endpoints"
  echo "  scans                      Test scans endpoints"
  echo "  scan-upload                Test scan upload functionality"
  echo "  dashboard                  Test dashboard endpoints"
  echo "  profiles                   Test profiles endpoints"
  echo "  health                     Test health check endpoints"
  echo "  main                       Run combined test with weighted distribution"
  echo ""
  echo "Examples:"
  echo "  $0 --test-type load login  Run load test for login endpoints"
  echo "  $0 --all                   Run all tests with default settings"
  echo "  $0 --test-type stress --url http://api.example.com/api/v1 main"
  exit 1
}

# Parse command line arguments
RUN_ALL=false
TEST_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      usage
      ;;
    -u|--url)
      BASE_URL="$2"
      shift 2
      ;;
    -o|--output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -t|--test-type)
      TEST_TYPE="$2"
      shift 2
      ;;
    -a|--all)
      RUN_ALL=true
      shift
      ;;
    -*)
      echo "Unknown option: $1"
      usage
      ;;
    *)
      TEST_NAME="$1"
      shift
      ;;
  esac
done

# Validate test type
if [[ ! "$TEST_TYPE" =~ ^(smoke|load|stress|spike|soak)$ ]]; then
  echo "Error: Invalid test type '$TEST_TYPE'"
  echo "Valid types: smoke, load, stress, spike, soak"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Function to run a single test
run_test() {
  local test_script="$1"
  local test_name="$2"
  local output_file="$OUTPUT_DIR/${test_name}_${TEST_TYPE}_$(date +%Y%m%d_%H%M%S).json"
  
  echo "Running $TEST_TYPE test for $test_name..."
  k6 run --tag test_type="$TEST_TYPE" -e BASE_URL="$BASE_URL" "$test_script" --out json="$output_file"
  
  echo "Test completed. Results saved to $output_file"
  echo ""
}

# Run tests
if [ "$RUN_ALL" = true ]; then
  echo "Running all tests with test type: $TEST_TYPE"
  echo "Base URL: $BASE_URL"
  echo "Output directory: $OUTPUT_DIR"
  echo ""
  
  run_test "$( dirname "$0" )/login-test.js" "login"
  run_test "$( dirname "$0" )/articles-test.js" "articles"
  run_test "$( dirname "$0" )/objects-test.js" "objects"
  run_test "$( dirname "$0" )/scans-test.js" "scans"
  run_test "$( dirname "$0" )/scan-upload-test.js" "scan_upload"
  run_test "$( dirname "$0" )/dashboard-test.js" "dashboard"
  run_test "$( dirname "$0" )/profiles-test.js" "profiles"
  run_test "$( dirname "$0" )/health-test.js" "health"
  run_test "$( dirname "$0" )/main-test.js" "main"
  
  echo "All tests completed!"
else
  if [ -z "$TEST_NAME" ]; then
    echo "Error: No test specified"
    usage
  fi
  
  echo "Running $TEST_TYPE test for $TEST_NAME"
  echo "Base URL: $BASE_URL"
  echo "Output directory: $OUTPUT_DIR"
  echo ""
  
  case "$TEST_NAME" in
    login)
      run_test "$( dirname "$0" )/login-test.js" "login"
      ;;
    articles)
      run_test "$( dirname "$0" )/articles-test.js" "articles"
      ;;
    objects)
      run_test "$( dirname "$0" )/objects-test.js" "objects"
      ;;
    scans)
      run_test "$( dirname "$0" )/scans-test.js" "scans"
      ;;
    scan-upload)
      run_test "$( dirname "$0" )/scan-upload-test.js" "scan_upload"
      ;;
    dashboard)
      run_test "$( dirname "$0" )/dashboard-test.js" "dashboard"
      ;;
    profiles)
      run_test "$( dirname "$0" )/profiles-test.js" "profiles"
      ;;
    health)
      run_test "$( dirname "$0" )/health-test.js" "health"
      ;;
    main)
      run_test "$( dirname "$0" )/main-test.js" "main"
      ;;
    *)
      echo "Error: Unknown test '$TEST_NAME'"
      usage
      ;;
  esac
fi