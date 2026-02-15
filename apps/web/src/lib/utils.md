# Utility Functions Documentation

This document describes the utility functions available in `apps/web/src/lib/utils.ts`.

## Functions

### `cn(...inputs: ClassValue[])`

A utility function for merging Tailwind CSS classes with conflict resolution.

**Parameters:**
- `inputs`: Variable number of class values (strings, objects, arrays)

**Returns:** 
- `string`: Merged and deduplicated CSS classes

**Example:**
```typescript
cn('px-4 py-2', 'bg-blue-500', { 'text-white': true })
// Returns: 'px-4 py-2 bg-blue-500 text-white'
```

### `formatDate(date: string | Date, locale?: string)`

Formats a date using Intl.DateTimeFormat with error handling.

**Parameters:**
- `date`: Date string or Date object to format
- `locale`: Optional locale string (defaults to 'en-US')

**Returns:**
- `string`: Formatted date string or 'Invalid date' if parsing fails

**Example:**
```typescript
formatDate('2023-12-01T10:30:00Z')
// Returns: 'Dec 1, 2023, 10:30 AM'

formatDate('2023-12-01T10:30:00Z', 'fr-FR')
// Returns: '1 déc. 2023 à 10:30'
```

### `generateSlug(text: string)`

Converts text to a URL-friendly slug format.

**Parameters:**
- `text`: String to convert to slug

**Returns:**
- `string`: URL-friendly slug or empty string if input is invalid

**Example:**
```typescript
generateSlug('Hello World!')
// Returns: 'hello-world'

generateSlug('  Special@#$ Characters  ')
// Returns: 'special-characters'
```

### `exportToCsv<T>(data: T[], filename: string)`

Exports array of objects to CSV format and triggers download.

**Type Parameters:**
- `T`: Object type extending `Record<string, unknown>`

**Parameters:**
- `data`: Array of objects to export
- `filename`: Name for the downloaded file (without .csv extension)

**Returns:**
- `void`

**Features:**
- Handles null/undefined values
- Escapes CSV special characters (commas, quotes, newlines)
- Converts complex objects to JSON strings
- Client-side only (checks for browser environment)
- Comprehensive error handling and logging

**Example:**
```typescript
const data = [
  { name: 'John', age: 30, city: 'New York' },
  { name: 'Jane', age: 25, city: 'San Francisco' }
]

exportToCsv(data, 'users-export')
// Downloads: users-export.csv
```

### `truncateText(text: string, maxLength: number)`

Truncates text to specified length and adds ellipsis.

**Parameters:**
- `text`: Text to truncate
- `maxLength`: Maximum length before truncation

**Returns:**
- `string`: Truncated text with ellipsis if needed

**Example:**
```typescript
truncateText('This is a very long text', 10)
// Returns: 'This is a...'

truncateText('Short', 10)
// Returns: 'Short'
```

### `capitalizeWords(text: string)`

Capitalizes the first letter of each word.

**Parameters:**
- `text`: Text to capitalize

**Returns:**
- `string`: Text with each word capitalized

**Example:**
```typescript
capitalizeWords('hello world')
// Returns: 'Hello World'

capitalizeWords('tEST CaSe')
// Returns: 'Test Case'
```

### `debounce<T>(func: T, wait: number)`

Creates a debounced version of a function that delays execution.

**Type Parameters:**
- `T`: Function type

**Parameters:**
- `func`: Function to debounce
- `wait`: Wait time in milliseconds

**Returns:**
- `(...args: Parameters<T>) => void`: Debounced function

**Example:**
```typescript
const debouncedSearch = debounce((query: string) => {
  console.log('Searching for:', query)
}, 300)

// Will only execute once after 300ms of no calls
debouncedSearch('hello')
debouncedSearch('hello w')
debouncedSearch('hello world') // Only this will execute
```

## Error Handling

All functions include appropriate error handling:

- **Input validation**: Check for invalid or malformed inputs
- **Console warnings**: Log warnings for recoverable issues
- **Console errors**: Log errors for serious problems
- **Graceful degradation**: Return sensible defaults when possible
- **Environment checks**: Ensure browser-only functions don't run on server

## Browser Compatibility

- **exportToCsv**: Requires browser environment (uses DOM APIs)
- All other functions work in both browser and Node.js environments

## Type Safety

All functions are fully typed with TypeScript:
- Proper parameter types
- Return type annotations
- Generic type parameters where appropriate
- JSDoc comments for IDE support