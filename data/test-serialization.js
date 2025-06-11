// Test to demonstrate the Set serialization issue

console.log('=== Set Serialization Test ===\n');

// Create test data structure similar to apiCalls
const testData = {
  method: 'GET',
  url: 'https://api.example.com/users',
  queryParams: new Set(['page', 'limit', 'sort']),
  requestBodies: [{ name: 'test' }]
};

console.log('Original data:');
console.log('queryParams (Set):', testData.queryParams);
console.log('queryParams values:', Array.from(testData.queryParams));

// Test 1: Direct JSON.stringify (what happens in Chrome messaging)
console.log('\n--- Test 1: JSON.stringify ---');
const jsonString = JSON.stringify(testData);
console.log('JSON string:', jsonString);
const parsed = JSON.parse(jsonString);
console.log('Parsed queryParams:', parsed.queryParams);
console.log('Type:', typeof parsed.queryParams);

// Test 2: Using spread operator
console.log('\n--- Test 2: Spread operator ---');
const spread = { ...testData };
console.log('Spread result:', JSON.stringify(spread));

// Test 3: Manual serialization (the fix)
console.log('\n--- Test 3: Manual conversion (FIX) ---');
const fixed = {
  ...testData,
  queryParams: Array.from(testData.queryParams)
};
console.log('Fixed result:', JSON.stringify(fixed));
const fixedParsed = JSON.parse(JSON.stringify(fixed));
console.log('Parsed queryParams:', fixedParsed.queryParams);
console.log('Type:', typeof fixedParsed.queryParams);
console.log('Is Array:', Array.isArray(fixedParsed.queryParams));

// Test 4: Chrome messaging simulation
console.log('\n--- Test 4: Chrome Messaging Simulation ---');
// Simulate Chrome's structured clone algorithm
try {
  // This simulates what happens in port.postMessage()
  const messageData = { type: 'TEST', data: testData };
  const serialized = JSON.parse(JSON.stringify(messageData));
  console.log('Message after serialization:', serialized);
  console.log('queryParams in message:', serialized.data.queryParams);
} catch (e) {
  console.error('Serialization error:', e);
}