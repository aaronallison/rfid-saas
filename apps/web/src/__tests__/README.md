# Testing Guide

## Overview
This directory contains unit tests for the web application components and utilities.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### middleware.test.ts
Tests for the Next.js middleware that handles authentication and routing:

- **Authentication flow**: Tests for authenticated and unauthenticated users
- **Route protection**: Ensures protected routes redirect to login when unauthenticated
- **Login redirection**: Verifies authenticated users are redirected away from login page
- **Cookie handling**: Tests Supabase cookie management
- **Error handling**: Tests graceful handling of authentication errors
- **Environment validation**: Tests behavior when required environment variables are missing

## Test Utilities

The tests use:
- **Jest**: Testing framework
- **Mock implementations**: For Supabase client and Next.js requests
- **Environment mocking**: To test different configuration scenarios

## Best Practices

1. **Isolation**: Each test is isolated with proper setup/teardown
2. **Mocking**: External dependencies (Supabase) are mocked
3. **Coverage**: Tests cover both success and error scenarios
4. **Environment**: Tests validate environment variable requirements