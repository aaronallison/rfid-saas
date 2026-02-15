// Simple tests for utils functions
// This file can be run with any test runner or even just logged to console

import { formatDate, generateSlug, capitalizeWords, truncateText } from '../utils'

// Test formatDate
console.log('Testing formatDate:')
console.log(formatDate('2023-12-01T10:30:00Z')) // Should work
console.log(formatDate(new Date())) // Should work  
console.log(formatDate('invalid-date')) // Should return 'Invalid date'

// Test generateSlug
console.log('\nTesting generateSlug:')
console.log(generateSlug('Hello World!')) // should be 'hello-world'
console.log(generateSlug('  Test  with  Spaces  ')) // should be 'test-with-spaces'
console.log(generateSlug('Special@#$%Characters!')) // should be 'specialcharacters'
console.log(generateSlug('')) // should be ''

// Test capitalizeWords
console.log('\nTesting capitalizeWords:')
console.log(capitalizeWords('hello world')) // should be 'Hello World'
console.log(capitalizeWords('tEST CaSe')) // should be 'Test Case'

// Test truncateText
console.log('\nTesting truncateText:')
console.log(truncateText('This is a long text', 10)) // should be 'This is a...'
console.log(truncateText('Short', 10)) // should be 'Short'