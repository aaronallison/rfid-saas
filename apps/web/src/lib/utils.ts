import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines and merges Tailwind CSS classes with clsx
 * @param inputs - Class values to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date using Intl.DateTimeFormat
 * @param date - Date string or Date object to format
 * @param locale - Locale string for formatting (defaults to 'en-US')
 * @returns Formatted date string or 'Invalid Date' if parsing fails
 */
export function formatDate(date: string | Date, locale = 'en-US') {
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date')
    }
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  } catch (error) {
    console.error('Failed to format date:', error)
    return 'Invalid Date'
  }
}

/**
 * Generates a URL-friendly slug from a text string
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
    // Remove accents and special characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Keep only alphanumeric characters, spaces, underscores, and hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace multiple spaces/underscores/hyphens with single hyphen
    .replace(/[\s_-]+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
}

/**
 * Exports array of objects to CSV file and triggers download
 * @param data - Array of objects to export
 * @param filename - Name of the CSV file (without .csv extension)
 * @throws Error if data is invalid or export fails
 */
export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  // Input validation
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array')
  }
  
  if (!data.length) {
    console.warn('No data to export')
    return
  }
  
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string')
  }

  // Sanitize filename to remove invalid characters
  const sanitizedFilename = filename.replace(/[^\w\s-]/g, '').trim()
  
  if (!sanitizedFilename) {
    throw new Error('Filename contains only invalid characters')
  }

  try {
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Handle null/undefined values and escape commas/quotes/newlines
          if (value == null) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${sanitizedFilename}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the blob URL to prevent memory leaks
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export CSV:', error)
    throw new Error('Failed to export data to CSV')
  }
}