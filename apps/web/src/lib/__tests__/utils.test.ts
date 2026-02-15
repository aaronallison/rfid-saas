// Basic tests for utils.ts functions
import { formatDate, generateSlug, exportToCsv } from '../utils'

// Mock DOM APIs for testing
Object.defineProperty(global, 'Blob', {
  value: class {
    constructor(public content: any[], public options: any) {}
  }
})

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
  }
})

// Mock document methods
const mockLink = {
  setAttribute: jest.fn(),
  click: jest.fn(),
  style: {}
}

Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(() => mockLink)
})

Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
})

describe('utils', () => {
  describe('formatDate', () => {
    it('should format valid dates correctly', () => {
      const date = new Date('2023-12-01T10:30:00Z')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/Dec \d{1,2}, 2023 at \d{1,2}:\d{2} AM|PM/)
    })

    it('should handle invalid dates gracefully', () => {
      const result = formatDate('invalid-date')
      expect(result).toBe('Invalid Date')
    })

    it('should accept locale parameter', () => {
      const date = new Date('2023-12-01T10:30:00Z')
      const formatted = formatDate(date, 'es-ES')
      expect(formatted).toBeTruthy()
    })
  })

  describe('generateSlug', () => {
    it('should generate correct slugs', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('Test   Multiple   Spaces')).toBe('test-multiple-spaces')
      expect(generateSlug('Special!@#$%Characters')).toBe('specialcharacters')
      expect(generateSlug('  Leading and trailing spaces  ')).toBe('leading-and-trailing-spaces')
    })

    it('should handle empty or invalid input', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug(null as any)).toBe('')
      expect(generateSlug(undefined as any)).toBe('')
    })

    it('should handle accented characters', () => {
      expect(generateSlug('Café résumé')).toBe('cafe-resume')
    })
  })

  describe('exportToCsv', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should export data correctly', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ]
      
      expect(() => exportToCsv(data, 'test-export')).not.toThrow()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('should handle empty data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      exportToCsv([], 'test-export')
      expect(consoleSpy).toHaveBeenCalledWith('No data to export')
      consoleSpy.mockRestore()
    })

    it('should validate input parameters', () => {
      expect(() => exportToCsv('not-an-array' as any, 'test')).toThrow('Data must be an array')
      expect(() => exportToCsv([{ test: 'data' }], '')).toThrow('Filename must be a non-empty string')
      expect(() => exportToCsv([{ test: 'data' }], '!@#$%')).toThrow('Filename contains only invalid characters')
    })

    it('should sanitize filenames', () => {
      const data = [{ test: 'data' }]
      exportToCsv(data, 'test!@#$%file')
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'testfile.csv')
    })
  })
})