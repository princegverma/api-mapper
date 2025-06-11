// Add this at the beginning of the file, after the variable declarations
// ...existing code...

// Port message handler with error handling
port.onMessage.addListener((msg) => {
  try {
    if (msg.type === "CONNECTION_READY") {
      isConnected = true;
      showStatus('Connected to API Mapper', 'success');
      // Request initial data
      port.postMessage({ type: "GET_API_CALLS" });
    } else if (msg.type === "API_CALLS_DATA") {
      apiData.clear();
      hostsList.clear();
      msg.data.forEach(item => {
        // FIX: Convert queryParams array back to Set if needed
        const processedItem = {
          ...item,
          queryParams: Array.isArray(item.queryParams) ? 
            new Set(item.queryParams) : 
            item.queryParams
        };
        apiData.set(item.endpoint, processedItem);
        if (item.host) {
          hostsList.add(item.host);
        }
      });
      updateHostFilter();
      updateEndpointsList();
      if (selectedEndpoint && apiData.has(selectedEndpoint)) {
        showEndpointDetails(selectedEndpoint);
      }
    } else if (msg.type === "DATA_CLEARED") {
      apiData.clear();
      selectedEndpoint = null;
      updateEndpointsList();
      requestDetails.textContent = 'Select an endpoint to view details';
      showStatus('Data cleared', 'success');
    } else if (msg.type === "ERROR") {
      showStatus(`Error: ${msg.message}`, 'error');
    }
  } catch (error) {
    console.error('Error handling message:', error);
    showStatus('Error processing data', 'error');
  }
});

// Chrome runtime message handler
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "API_CALL_DETECTED") {
    // FIX: Convert queryParams array back to Set if needed
    const processedData = {
      ...msg.data,
      queryParams: Array.isArray(msg.data.queryParams) ? 
        new Set(msg.data.queryParams) : 
        msg.data.queryParams
    };
    apiData.set(msg.endpoint, processedData);
    if (msg.data.host && !hostsList.has(msg.data.host)) {
      hostsList.add(msg.data.host);
      updateHostFilter();
    }
    updateEndpointsList();
    if (msg.endpoint === selectedEndpoint) {
      showEndpointDetails(selectedEndpoint);
    }
  }
});

// Also update the generateOpenApiSpec function to show debug info
function generateOpenApiSpec() {
  const paths = {};
  const schemas = {};
  let hostUrl = '';
  
  // DEBUG: Log the data structure
  console.log('=== DEBUG: API Data for Export ===');
  apiData.forEach((data, endpoint) => {
    console.log(`Endpoint: ${endpoint}`);
    console.log(`  queryParams:`, data.queryParams);
    console.log(`  queryParams type:`, typeof data.queryParams);
    console.log(`  queryParams size:`, data.queryParams.size || data.queryParams.length);
    console.log(`  requestBodies count:`, data.requestBodies.length);
    console.log(`  calls count:`, data.calls.length);
    if (data.calls.length > 0) {
      console.log(`  First call queryParams:`, data.calls[0].queryParams);
    }
  });
  
  // Rest of the generateOpenApiSpec function remains the same...
  // ...existing code...
}