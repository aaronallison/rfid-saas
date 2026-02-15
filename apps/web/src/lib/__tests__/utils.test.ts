import { cn, formatDate, generateSlug, exportToCsv } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
    })

    it('should handle conditional classes', () => {
      expect(cn('px-4', undefined, 'py-2')).toBe('px-4 py-2')
      expect(cn('px-4', false && 'hidden', 'py-2')).toBe('px-4 py-2')
      expect(cn('px-4', true && 'hidden', 'py-2')).toBe('px-4 hidden py-2')
    })

    it('should handle tailwind merge conflicts', () => {
      expect(cn('px-4', 'px-6')).toBe('px-6')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })
  })

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2023-12-01T15:30:00Z')
      const formatted = formatDate(date)
      
      // Check that it contains expected elements (month, day, year, time)
      expect(formatted).toContain('2023')
      expect(formatted).toContain('Dec')
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('should format date string correctly', () => {
      const dateString = '2023-12-01T15:30:00Z'
      const formatted = formatDate(dateString)
      
      // Check that it contains expected elements
      expect(formatted).toContain('2023')
      expect(formatted).toContain('Dec')
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('should return consistent format for same date', () => {
      const date1 = formatDate('2023-12-01T15:30:00Z')
      const date2 = formatDate(new Date('2023-12-01T15:30:00Z'))
      expect(date1).toBe(date2)
    })

    it('should handle invalid date gracefully', () => {
      // Invalid dates should throw or return "Invalid Date"
      expect(() => {
        const result = formatDate('invalid-date')
        if (result.includes('Invalid Date')) {
          throw new Error('Invalid Date')
        }
      }).toThrow()
    })
  })

  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('UPPERCASE TEXT')).toBe('uppercase-text')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Hello! @#$ World')).toBe('hello-world')
      expect(generateSlug('Text with (parentheses) & symbols')).toBe('text-with-parentheses-symbols')
    })

    it('should handle multiple spaces and separators', () => {
      expect(generateSlug('Multiple   spaces')).toBe('multiple-spaces')
      expect(generateSlug('Text___with___underscores')).toBe('text-with-underscores')
      expect(generateSlug('Mixed - _ spaces')).toBe('mixed-spaces')
    })

    it('should trim leading and trailing dashes', () => {
      expect(generateSlug('-leading dash')).toBe('leading-dash')
      expect(generateSlug('trailing dash-')).toBe('trailing-dash')
      expect(generateSlug('---multiple---')).toBe('multiple')
    })

    it('should handle empty or whitespace-only strings', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      expect(generateSlug('---')).toBe('')
    })

    it('should handle unicode characters', () => {
      expect(generateSlug('Café & Naïve')).toBe('caf-nave')
      expect(generateSlug('测试文本')).toBe('')
    })
  })

  describe('exportToCsv', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks()
    })

    it('should export simple data to CSV', () => {
      const data = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'Los Angeles' }
      ]

      exportToCsv(data, 'test-file')

      expect(global.Blob).toHaveBeenCalledWith(
        ['name,age,city\nJohn,25,New York\nJane,30,Los Angeles'],
        { type: 'text/csv;charset=utf-8;' }
      )
      expect(global.document.createElement).toHaveBeenCalledWith('a')
      expect(global.document.body.appendChild).toHaveBeenCalled()
      expect(global.document.body.removeChild).toHaveBeenCalled()
    })

    it('should handle data with commas and quotes', () => {
      const data = [
        { name: 'John "Johnny" Doe', description: 'Lives in New York, NY' },
        { name: 'Jane Smith', description: 'Works at "Tech Corp"' }
      ]

      exportToCsv(data, 'test-file')

      expect(global.Blob).toHaveBeenCalledWith(
        ['name,description\n"John ""Johnny"" Doe","Lives in New York, NY"\nJane Smith,"Works at ""Tech Corp""'],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should handle null and undefined values', () => {
      const data = [
        { name: 'John', age: null, city: undefined },
        { name: 'Jane', age: 30, city: 'Los Angeles' }
      ]

      exportToCsv(data, 'test-file')

      expect(global.Blob).toHaveBeenCalledWith(
        ['name,age,city\nJohn,,\nJane,30,Los Angeles'],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should handle data with newlines', () => {
      const data = [
        { name: 'John', bio: 'First line\nSecond line' }
      ]

      exportToCsv(data, 'test-file')

      expect(global.Blob).toHaveBeenCalledWith(
        ['name,bio\nJohn,"First line\nSecond line"'],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should return early for empty data', () => {
      exportToCsv([], 'test-file')

      expect(global.Blob).not.toHaveBeenCalled()
      expect(global.document.createElement).not.toHaveBeenCalled()
    })

    it('should handle boolean and number values', () => {
      const data = [
        { active: true, count: 42, ratio: 3.14 },
        { active: false, count: 0, ratio: 0.0 }
      ]

      exportToCsv(data, 'test-file')

      expect(global.Blob).toHaveBeenCalledWith(
        ['active,count,ratio\ntrue,42,3.14\nfalse,0,0'],
        { type: 'text/csv;charset=utf-8;' }
      )
    })
  })
})