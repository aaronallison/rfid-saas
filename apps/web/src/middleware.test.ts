// Simple test to verify middleware logic
// This is a conceptual test - in a real project you'd use Jest or similar

interface TestCase {
  name: string
  pathname: string
  shouldSkip: boolean
}

const testCases: TestCase[] = [
  { name: 'API route', pathname: '/api/billing/checkout', shouldSkip: true },
  { name: 'Next.js static', pathname: '/_next/static/chunk.js', shouldSkip: true },
  { name: 'Image file', pathname: '/image.png', shouldSkip: true },
  { name: 'CSS file', pathname: '/styles.css', shouldSkip: true },
  { name: 'JS file', pathname: '/script.js', shouldSkip: true },
  { name: 'Login page', pathname: '/login', shouldSkip: false },
  { name: 'Dashboard page', pathname: '/dashboard', shouldSkip: false },
  { name: 'Organizations page', pathname: '/orgs', shouldSkip: false },
  { name: 'Root path', pathname: '/', shouldSkip: false },
]

function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  )
}

// Run tests
console.log('Testing middleware skip logic:')
testCases.forEach(({ name, pathname, shouldSkip }) => {
  const result = shouldSkipMiddleware(pathname)
  const status = result === shouldSkip ? '✅' : '❌'
  console.log(`${status} ${name}: ${pathname} -> skip: ${result}`)
})