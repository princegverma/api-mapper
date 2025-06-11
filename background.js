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
          const data = Array.from(apiCalls.entries()).map(([key, value]) => ({
            endpoint: key,
            method: value.method,
            url: value.url,
            host: value.host,
            pathname: value.pathname,
            calls: value.calls,
            queryParams: Array.from(value.queryParams), // Convert Set to Array for serialization
            requestBodies: value.requestBodies,
            requestHeaders: value.requestHeaders ? Array.from(value.requestHeaders) : []
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

// Store request details temporarily to match with headers
const pendingRequests = new Map();

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
          requestBodies: [],
          requestHeaders: new Set()
        });
      }
      
      const apiCall = apiCalls.get(endpoint);
      
      const queryParams = Array.from(url.searchParams.entries());
      queryParams.forEach(([key, value]) => {
        apiCall.queryParams.add(key);
      });
      
      // Sanitize sensitive data
      const sanitizedQueryParams = {};
      queryParams.forEach(([key, value]) => {
        sanitizedQueryParams[key] = SecurityUtils.sanitizeQueryParam(key, value);
      });
      
      const callDetails = {
        timestamp: new Date().toISOString(),
        url: SecurityUtils.sanitizeUrl(details.url),
        queryParams: sanitizedQueryParams,
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
      
      // Store temporarily to match with headers
      pendingRequests.set(details.requestId, {
        endpoint,
        callDetails
      });
      
      apiCall.calls.push(callDetails);
      totalCallsCount++;
      
      // Enforce memory limits periodically
      if (totalCallsCount % 50 === 0) {
        enforceMemoryLimits();
      }
      
      // Send update to panel
      chrome.runtime.sendMessage({
        type: "API_CALL_DETECTED",
        endpoint,
        data: {
          method: apiCall.method,
          url: apiCall.url,
          host: apiCall.host,
          pathname: apiCall.pathname,
          calls: apiCall.calls,
          queryParams: Array.from(apiCall.queryParams),
          requestBodies: apiCall.requestBodies,
          requestHeaders: apiCall.requestHeaders ? Array.from(apiCall.requestHeaders) : []
        }
      }).catch(() => {});
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Capture request headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!recording) return;
    
    if (details.type === "xmlhttprequest" || details.type === "fetch") {
      const pending = pendingRequests.get(details.requestId);
      if (pending && details.requestHeaders) {
        const url = new URL(details.url);
        const endpoint = `${details.method} ${url.pathname}`;
        
        if (apiCalls.has(endpoint)) {
          const apiCall = apiCalls.get(endpoint);
          const call = apiCall.calls.find(c => c.requestId === details.requestId);
          
          if (call) {
            // Store ALL headers for complete curl generation
            call.allHeaders = {};
            call.requestHeaders = {};
            
            details.requestHeaders.forEach(header => {
              const sanitizedValue = SecurityUtils.sanitizeHeader(header.name, header.value);
              call.allHeaders[header.name] = sanitizedValue;
              
              // Also add to the Set for unique header tracking
              apiCall.requestHeaders.add(header.name);
              
              // Store custom headers separately (non-standard ones)
              const lowerName = header.name.toLowerCase();
              if (!['accept', 'accept-encoding', 'accept-language', 'cache-control', 
                   'connection', 'content-length', 'content-type', 'host', 'origin', 
                   'referer', 'user-agent', 'sec-', 'upgrade-insecure-requests'].some(std => lowerName.startsWith(std))) {
                call.requestHeaders[header.name] = sanitizedValue;
              }
            });
          }
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
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
      
      // Clean up pending request
      pendingRequests.delete(details.requestId);
    }
  },
  { urls: ["<all_urls>"] }
);