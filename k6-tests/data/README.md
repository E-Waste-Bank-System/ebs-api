# Test Data Directory

This directory contains sample data files for k6 load testing.

## Contents

- Sample images for scan upload tests

## Usage

Place real test images in this directory for use with the scan upload tests. The test scripts are configured to look for images in this location.

## Requirements

- Images should be in JPG, PNG, or WebP format
- Images should be less than 10MB in size
- At least 3 sample images are recommended for varied testing

## Example

To add test images:

1. Place your test e-waste images in this directory
2. Update the `TEST_IMAGES` array in `scan-upload-test.js` if needed
3. Run the tests using the provided scripts

```
./run-tests.sh --test-type smoke scan-upload
```