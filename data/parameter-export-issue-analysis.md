# API Mapper Parameter Export Issue Analysis

## Problem Summary

The API Mapper extension is not properly including query parameters and request body examples in the OpenAPI export. This is due to a data serialization issue when passing data between the background script and the DevTools panel.

## Root Cause

The issue occurs in the background.js file when converting the Map data structure for transmission via Chrome's messaging API:

```javascript
// Current problematic code:
const data = Array.from(apiCalls.entries()).map(([key, value]) => ({
  endpoint: key,
  ...value  // This spreads the object, but Sets are not properly serialized
}));
```

The problem is that JavaScript Sets (used for `queryParams`) cannot be directly serialized in Chrome's messaging system. When the spread operator is used, the Set is converted to an empty object `{}`.

## Data Flow Analysis

1. **Data Capture (background.js)**:
   - Query parameters are correctly captured from URLs
   - They are stored in a Set: `apiCall.queryParams.add(key)`
   - Request bodies are properly stored in an array

2. **Data Transmission**:
   - When sending data via `port.postMessage()`, the Set is lost
   - The receiving end gets `queryParams: {}` instead of the actual Set

3. **Data Display & Export (panel.js)**:
   - The panel receives empty queryParams
   - OpenAPI generation has no parameters to include

## Solution

### Fix 1: Background.js Changes

Convert Sets to Arrays before transmission:

```javascript
const data = Array.from(apiCalls.entries()).map(([key, value]) => ({
  endpoint: key,
  method: value.method,
  url: value.url,
  host: value.host,
  pathname: value.pathname,
  calls: value.calls,
  queryParams: Array.from(value.queryParams), // Convert Set to Array
  requestBodies: value.requestBodies
}));
```

Also update the real-time message sending:

```javascript
chrome.runtime.sendMessage({
  type: "API_CALL_DETECTED",
  endpoint,
  data: {
    method: apiCall.method,
    url: apiCall.url,
    host: apiCall.host,
    pathname: apiCall.pathname,
    calls: apiCall.calls,
    queryParams: Array.from(apiCall.queryParams), // Convert Set to Array
    requestBodies: apiCall.requestBodies
  }
}).catch(() => {});
```

### Fix 2: Panel.js Changes

Convert Arrays back to Sets when receiving data:

```javascript
port.onMessage.addListener((msg) => {
  if (msg.type === "API_CALLS_DATA") {
    msg.data.forEach(item => {
      const processedItem = {
        ...item,
        queryParams: Array.isArray(item.queryParams) ? 
          new Set(item.queryParams) : 
          item.queryParams
      };
      apiData.set(item.endpoint, processedItem);
    });
  }
});
```

### Fix 3: Preserve Example Values

Currently, sensitive query parameters are being sanitized to `***REDACTED***`, which removes useful example values. The fix stores actual values for non-sensitive parameters:

```javascript
const exampleQueryParams = {};
queryParams.forEach(([key, value]) => {
  sanitizedQueryParams[key] = SecurityUtils.sanitizeQueryParam(key, value);
  // Store actual value if not sensitive
  exampleQueryParams[key] = sanitizedQueryParams[key] === '***REDACTED***' ? 
    '***REDACTED***' : value;
});
```

## Verification

The test script demonstrates that the data structure is correct before serialization:

- Query parameters are properly captured in the Set
- Request bodies are properly stored
- Individual call details include the actual parameter values

But after serialization (simulating the messaging), the Sets become empty objects.

## Implementation Steps

1. Update background.js with the Set-to-Array conversion
2. Update panel.js to handle Array-to-Set conversion
3. Test with real API calls to verify parameters appear in the export
4. Consider adding debugging logs to track data flow

## Additional Recommendations

1. **Add validation**: Check if queryParams is being properly converted at each step
2. **Add examples**: The current code collects examples but may need adjustment for the new data structure
3. **Path parameters**: The code already detects numeric and UUID segments in paths, which is good
4. **Request body examples**: These are already being collected and should work once the data flow is fixed