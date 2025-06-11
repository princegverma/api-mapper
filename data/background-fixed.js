const apiCalls = new Map();
let recording = true;
let totalCallsCount = 0;

// Import config
self.importScripts('config.js');

// Memory management - clean up old data
function enforceMemoryLimits() {
  // Remove oldest endpoints if we exceed the limit
  if (apiCalls.size > CONFIG.MAX_TOTAL_ENDPOINTS) {
    const entriesToRemove = apiCalls.size - CONFIG.MAX_TOTAL_ENDPOINTS;
    const entries = Array.from(apiCalls.entries());
    for (let i = 0; i < entriesToRemove; i++) {
      apiCalls.delete(entries[i][0]);
    }
  }
  
  // Limit calls per endpoint
  apiCalls.forEach((data, endpoint) => {
    if (data.calls.length > CONFIG.MAX_CALLS_PER_ENDPOINT) {
      data.calls = data.calls.slice(-CONFIG.MAX_CALLS_PER_ENDPOINT);
    }
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "devtools-panel") {
    port.onMessage.addListener((msg) => {
      try {
        if (msg.type === "GET_API_CALLS") {
          // FIX: Convert Set to Array when serializing data
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
          port.postMessage({ type: "API_CALLS_DATA", data });
        } else if (msg.type === "CLEAR_DATA") {
          apiCalls.clear();
          totalCallsCount = 0;
          port.postMessage({ type: "DATA_CLEARED" });
        } else if (msg.type === "SET_RECORDING") {
          recording = msg.recording;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        port.postMessage({ type: "ERROR", message: error.message });
      }
    });
    
    // Send initial data
    port.postMessage({ type: "CONNECTION_READY" });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!recording) return;
    
    if (details.type === "xmlhttprequest" || details.type === "fetch") {
      const url = new URL(details.url);
      const endpoint = `${details.method} ${url.pathname}`;
      
      if (!apiCalls.has(endpoint)) {
        apiCalls.set(endpoint, {
          method: details.method,
          url: url.href,
          host: url.host,
          pathname: url.pathname,
          calls: [],
          queryParams: new Set(),
          requestBodies: []
        });
      }
      
      const apiCall = apiCalls.get(endpoint);
      
      const queryParams = Array.from(url.searchParams.entries());
      queryParams.forEach(([key, value]) => {
        apiCall.queryParams.add(key);
      });
      
      // Store both sanitized and example values
      const sanitizedQueryParams = {};
      const exampleQueryParams = {};
      queryParams.forEach(([key, value]) => {
        sanitizedQueryParams[key] = SecurityUtils.sanitizeQueryParam(key, value);
        // Store actual value if not sensitive
        exampleQueryParams[key] = sanitizedQueryParams[key] === '***REDACTED***' ? 
          '***REDACTED***' : value;
      });
      
      const callDetails = {
        timestamp: new Date().toISOString(),
        url: SecurityUtils.sanitizeUrl(details.url),
        queryParams: exampleQueryParams, // Use example values instead of sanitized
        requestId: details.requestId,
        tabId: details.tabId
      };
      
      if (details.requestBody && details.requestBody.raw) {
        try {
          const decoder = new TextDecoder();
          const body = details.requestBody.raw.map(data => decoder.decode(data.bytes)).join('');
          callDetails.requestBody = JSON.parse(body);
          apiCall.requestBodies.push(callDetails.requestBody);
        } catch (e) {
          console.log("Could not parse request body");
        }
      }
      
      apiCall.calls.push(callDetails);
      totalCallsCount++;
      
      // Enforce memory limits periodically
      if (totalCallsCount % 50 === 0) {
        enforceMemoryLimits();
      }
      
      // FIX: Send properly serialized data
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
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!recording) return;
    
    if (details.type === "xmlhttprequest" || details.type === "fetch") {
      const url = new URL(details.url);
      const endpoint = `${details.method} ${url.pathname}`;
      
      if (apiCalls.has(endpoint)) {
        const apiCall = apiCalls.get(endpoint);
        const call = apiCall.calls.find(c => c.requestId === details.requestId);
        if (call) {
          call.status = details.statusCode;
          call.statusLine = details.statusLine;
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);