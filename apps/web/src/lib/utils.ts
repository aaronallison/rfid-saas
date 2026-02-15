import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge for optimal Tailwind CSS class handling
 * @param inputs - Class values to combine
 * @returns Combined and deduplicated class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object into a human-readable format
 * @param date - Date string or Date object to format
 * @returns Formatted date string in 'MMM dd, yyyy, hh:mm AM/PM' format
 * @throws Error if date is invalid
 */
export function formatDate(date: string | Date): string {
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided')
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Generates a URL-friendly slug from text
 * @param text - Text to convert to slug
 * @returns URL-friendly slug string
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
}

/**
 * Exports data to CSV format and triggers download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @throws Error if data is invalid or export fails
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[], 
  filename: string
): void {
  // Validation
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array')
  }
  
  if (!data.length) {
    throw new Error('Data array cannot be empty')
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string')
  }

  // Check browser support
  if (typeof window === 'undefined' || !window.Blob || !window.URL) {
    throw new Error('CSV export is not supported in this environment')
  }

  try {
    const headers = Object.keys(data[0])
    if (headers.length === 0) {
      throw new Error('Data objects cannot be empty')
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          
          // Handle null/undefined values
          if (value == null) return ''
          
          const stringValue = String(value)
          
          // Escape values containing commas, quotes, or newlines
          if (stringValue.includes(',') || 
              stringValue.includes('"') || 
              stringValue.includes('\n') ||
              stringValue.includes('\r')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          
          return stringValue
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    try {
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename.replace(/[^\w\s-]/g, '')}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      // Clean up object URL to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }
  } catch (error) {
    throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}