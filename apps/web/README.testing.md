# Testing Setup for Web Application

This document outlines the testing infrastructure for the web application.

## Overview

The testing setup uses:
- **Jest** as the test runner
- **React Testing Library** for component testing
- **jsdom** as the test environment
- **@testing-library/jest-dom** for additional matchers

## Configuration Files

### `jest.config.js`
Main Jest configuration with Next.js integration using `next/jest`.

### `jest.setup.js`
Test setup file that runs before each test:
- Imports `@testing-library/jest-dom` matchers
- Mocks Next.js components (router, Image)
- Sets up global test utilities

### `tsconfig.test.json`
TypeScript configuration specifically for test files.

## Available Scripts

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## File Structure

```
src/
├── __tests__/          # Test files
│   └── example.test.tsx
├── components/         # Component files
└── ...
```

## Writing Tests

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing with User Interactions

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

Current coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Mocked Dependencies

The following Next.js modules are automatically mocked:
- `next/navigation` (useRouter, useSearchParams, usePathname)
- `next/image`

## Best Practices

1. **Test Structure**: Use `describe` blocks to group related tests
2. **Test Names**: Write descriptive test names that explain the expected behavior
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and assertion phases
4. **Mock External Dependencies**: Mock API calls, external services, and complex dependencies
5. **Test User Behavior**: Focus on testing what users see and do, not implementation details

## Common Issues

### ESM vs CommonJS
The setup uses CommonJS (`require`) in `jest.setup.js` to avoid module import issues.

### Next.js Router
Router-dependent components should work out of the box with the provided mocks.

### Absolute Imports
Path mapping is configured to support `@/` imports in test files.

## Debugging Tests

To debug tests in VS Code:
1. Set breakpoints in your test files
2. Use the Jest extension or create a debug configuration
3. Run tests in debug mode

For console debugging:
```bash
npm run test -- --verbose
```