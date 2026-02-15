import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale: string = 'en-US'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch (error) {
    console.warn('Invalid date provided to formatDate:', date)
    return 'Invalid date'
  }
}

export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided to generateSlug:', text)
    return ''
  }
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Converts an array of objects to CSV format and triggers a download
 * @param data - Array of objects to convert to CSV
 * @param filename - Name of the downloaded file (without .csv extension)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data provided to exportToCsv: data must be an array')
    return
  }
  
  if (!data.length) {
    console.warn('Empty data array provided to exportToCsv')
    return
  }

  if (!filename || typeof filename !== 'string') {
    console.error('Invalid filename provided to exportToCsv')
    return
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.error('exportToCsv can only be used in browser environments')
    return
  }

  try {
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          
          // Handle null/undefined values
          if (value == null) return ''
          
          // Convert complex objects to strings
          let stringValue: string
          if (typeof value === 'object') {
            stringValue = JSON.stringify(value)
          } else {
            stringValue = String(value)
          }
          
          // Escape CSV special characters
          if (
            stringValue.includes(',') || 
            stringValue.includes('"') || 
            stringValue.includes('\n') ||
            stringValue.includes('\r')
          ) {
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
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL object
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting CSV:', error)
  }
}

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return ''
  if (maxLength < 0) return text
  
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`
}

/**
 * Capitalizes the first letter of each word in a string
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}