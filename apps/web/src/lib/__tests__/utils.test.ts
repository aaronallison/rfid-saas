import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { cn, formatDate, capitalize, debounce, safeJsonParse, truncate } from '../utils'

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
    })

    it('should handle conditional classes', () => {
      expect(cn('px-2', true && 'py-1', false && 'py-2')).toBe('px-2 py-1')
    })
  })

  describe('formatDate', () => {
    it('should format valid date', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      expect(result).toBe('January 15, 2024')
    })

    it('should throw error for invalid date', () => {
      const invalidDate = new Date('invalid')
      expect(() => formatDate(invalidDate)).toThrow('Invalid date provided to formatDate')
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.clearAllTimers()
      jest.useFakeTimers()
    })

    it('should delay function execution', () => {
      const fn = jest.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should throw error for negative delay', () => {
      const fn = jest.fn()
      expect(() => debounce(fn, -1)).toThrow('Delay must be non-negative')
    })
  })

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true }
      const result = safeJsonParse('invalid json', fallback)
      expect(result).toBe(fallback)
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longString = 'a'.repeat(150)
      const result = truncate(longString, 100)
      expect(result).toBe('a'.repeat(100) + '...')
    })

    it('should not truncate short strings', () => {
      const shortString = 'hello world'
      expect(truncate(shortString, 100)).toBe(shortString)
    })

    it('should handle empty string', () => {
      expect(truncate('', 100)).toBe('')
    })
  })
})