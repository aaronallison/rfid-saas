// Simple test to verify utils functions work correctly
const { formatDate, generateSlug } = require('./apps/web/src/lib/utils.ts');

// Test formatDate
try {
  console.log('Testing formatDate:');
  console.log(formatDate('2023-01-01')); // Should work
  console.log(formatDate(new Date())); // Should work
  
  try {
    formatDate('invalid date'); // Should throw error
  } catch (e) {
    console.log('✅ formatDate correctly throws error for invalid date:', e.message);
  }
} catch (e) {
  console.log('❌ formatDate test failed:', e.message);
}

// Test generateSlug  
try {
  console.log('Testing generateSlug:');
  console.log(generateSlug('Hello World!')); // Should return "hello-world"
  console.log(generateSlug('  Multiple   Spaces  ')); // Should return "multiple-spaces"
  console.log(generateSlug('')); // Should return ""
  console.log(generateSlug(null)); // Should return ""
} catch (e) {
  console.log('❌ generateSlug test failed:', e.message);
}