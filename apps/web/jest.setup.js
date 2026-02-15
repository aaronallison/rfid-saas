// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Extend Jest matchers with custom matchers
// This gives us helpful methods like .toBeInTheDocument()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Suppress console errors during testing (optional)
// You might want to remove this if you need to see console output
global.console = {
  ...console,
  // Suppress specific console methods if needed
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Mock environment variables if needed
process.env.NODE_ENV = 'test';

// Setup for any global test utilities
beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
});