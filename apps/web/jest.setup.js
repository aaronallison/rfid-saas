import '@testing-library/jest-dom'

// Global mocks for browser APIs
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'blob:mock-url'),
})

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
})

// Mock Blob constructor
global.Blob = jest.fn((content, options) => ({ content, options }))

// Mock document methods used in exportToCsv
Object.defineProperty(global.document, 'createElement', {
  writable: true,
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    click: jest.fn(),
    style: {}
  })),
})

Object.defineProperty(global.document.body, 'appendChild', {
  writable: true,
  value: jest.fn(),
})

Object.defineProperty(global.document.body, 'removeChild', {
  writable: true,
  value: jest.fn(),
})