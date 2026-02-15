# Testing

This directory contains unit tests for utility functions.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The tests cover:

- `cn()` - Class name merging utility
- `formatDate()` - Date formatting utility
- `generateSlug()` - Text to slug conversion
- `exportToCsv()` - CSV export functionality

Each function is tested for:
- Happy path scenarios
- Edge cases
- Error handling
- Input validation