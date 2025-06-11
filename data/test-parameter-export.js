// Test script to verify parameter and example export functionality

// Simulate API call data structure as captured by background.js
const testApiData = new Map();

// Test endpoint 1: GET with query parameters
testApiData.set('GET /api/users', {
  method: 'GET',
  url: 'https://api.example.com/api/users?page=1&limit=10&sort=name',
  host: 'api.example.com',
  pathname: '/api/users',
  calls: [
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users?page=1&limit=10&sort=name',
      queryParams: {
        page: '1',
        limit: '10',
        sort: 'name'
      },
      requestId: '123',
      tabId: 1,
      status: 200,
      statusLine: 'HTTP/1.1 200 OK'
    },
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users?page=2&limit=20&sort=email',
      queryParams: {
        page: '2',
        limit: '20',
        sort: 'email'
      },
      requestId: '124',
      tabId: 1,
      status: 200,
      statusLine: 'HTTP/1.1 200 OK'
    }
  ],
  queryParams: new Set(['page', 'limit', 'sort']),
  requestBodies: []
});

// Test endpoint 2: POST with request body
testApiData.set('POST /api/users', {
  method: 'POST',
  url: 'https://api.example.com/api/users',
  host: 'api.example.com',
  pathname: '/api/users',
  calls: [
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users',
      queryParams: {},
      requestId: '125',
      tabId: 1,
      status: 201,
      statusLine: 'HTTP/1.1 201 Created',
      requestBody: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true
      }
    },
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users',
      queryParams: {},
      requestId: '126',
      tabId: 1,
      status: 201,
      statusLine: 'HTTP/1.1 201 Created',
      requestBody: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        active: false
      }
    }
  ],
  queryParams: new Set(),
  requestBodies: [
    {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 25,
      active: false
    }
  ]
});

// Test endpoint 3: GET with path parameter
testApiData.set('GET /api/users/123', {
  method: 'GET',
  url: 'https://api.example.com/api/users/123',
  host: 'api.example.com',
  pathname: '/api/users/123',
  calls: [
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users/123',
      queryParams: {},
      requestId: '127',
      tabId: 1,
      status: 200,
      statusLine: 'HTTP/1.1 200 OK'
    },
    {
      timestamp: new Date().toISOString(),
      url: 'https://api.example.com/api/users/456',
      queryParams: {},
      requestId: '128',
      tabId: 1,
      status: 200,
      statusLine: 'HTTP/1.1 200 OK'
    }
  ],
  queryParams: new Set(),
  requestBodies: []
});

// Function to check if parameters are being captured
function checkParameterCapture() {
  console.log('=== PARAMETER CAPTURE TEST ===\n');
  
  testApiData.forEach((data, endpoint) => {
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Query Parameters Set: ${Array.from(data.queryParams).join(', ')}`);
    console.log(`Request Bodies Count: ${data.requestBodies.length}`);
    
    console.log('Calls:');
    data.calls.forEach((call, idx) => {
      console.log(`  Call ${idx + 1}:`);
      console.log(`    Query Params: ${JSON.stringify(call.queryParams)}`);
      if (call.requestBody) {
        console.log(`    Request Body: ${JSON.stringify(call.requestBody)}`);
      }
    });
    console.log('');
  });
}

// Run the test
checkParameterCapture();

// Export as JSON to see the structure
const exportData = Array.from(testApiData.entries()).map(([key, value]) => ({
  endpoint: key,
  ...value
}));

console.log('\n=== EXPORTED DATA STRUCTURE ===');
console.log(JSON.stringify(exportData, null, 2));