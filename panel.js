let apiData = new Map();
let selectedEndpoint = null;
let filterText = '';
let filterMethod = 'all';
let filterHost = 'all';
let hostsList = new Set();
let isConnected = false;
let updateTimer = null;

const port = chrome.runtime.connect({ name: "devtools-panel" });

// DOM elements
const endpointsList = document.getElementById('endpoints-list');
const requestDetails = document.getElementById('request-details');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const recordCheckbox = document.getElementById('record-checkbox');

// Safe DOM creation helper
function createElement(tag, className, textContent, attributes = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Filter endpoints based on search text, method, and host
function getFilteredEndpoints() {
  let filtered = Array.from(apiData.entries());
  
  if (filterText) {
    filtered = filtered.filter(([endpoint, data]) => {
      return endpoint.toLowerCase().includes(filterText.toLowerCase()) ||
             data.pathname.toLowerCase().includes(filterText.toLowerCase()) ||
             data.host.toLowerCase().includes(filterText.toLowerCase());
    });
  }
  
  if (filterMethod !== 'all') {
    filtered = filtered.filter(([endpoint, data]) => {
      return data.method.toLowerCase() === filterMethod.toLowerCase();
    });
  }
  
  if (filterHost !== 'all') {
    filtered = filtered.filter(([endpoint, data]) => {
      return data.host === filterHost;
    });
  }
  
  return filtered.sort((a, b) => a[0].localeCompare(b[0]));
}

// Update endpoints list with safe DOM manipulation
const updateEndpointsList = debounce(() => {
  // Clear existing content
  while (endpointsList.firstChild) {
    endpointsList.removeChild(endpointsList.firstChild);
  }
  
  const filteredEndpoints = getFilteredEndpoints();
  
  if (filteredEndpoints.length === 0) {
    const emptyMessage = createElement('div', 'empty-message', 
      filterText || filterMethod !== 'all' ? 'No endpoints match your filters' : 'No API calls captured yet');
    endpointsList.appendChild(emptyMessage);
    return;
  }
  
  filteredEndpoints.forEach(([endpoint, data]) => {
    const div = createElement('div', 'endpoint-item');
    if (endpoint === selectedEndpoint) {
      div.classList.add('selected');
    }
    
    const methodSpan = createElement('span', `method ${data.method.toLowerCase()}`, data.method);
    const pathSpan = createElement('span', 'path', data.pathname);
    const hostSpan = createElement('span', 'host', data.host);
    const countSpan = createElement('span', 'count', `(${data.calls.length})`);
    
    div.appendChild(methodSpan);
    div.appendChild(pathSpan);
    if (filterHost === 'all') {
      div.appendChild(hostSpan);
    }
    div.appendChild(countSpan);
    
    div.addEventListener('click', () => {
      selectedEndpoint = endpoint;
      updateEndpointsList();
      showEndpointDetails(endpoint);
    });
    
    endpointsList.appendChild(div);
  });
}, CONFIG.DEBOUNCE_DELAY);

// Show endpoint details safely
function showEndpointDetails(endpoint) {
  const data = apiData.get(endpoint);
  if (!data) {
    requestDetails.textContent = 'Endpoint not found';
    return;
  }
  
  // Clear existing content
  while (requestDetails.firstChild) {
    requestDetails.removeChild(requestDetails.firstChild);
  }
  
  // Create sections
  const title = createElement('h2', null, 'Endpoint Details');
  requestDetails.appendChild(title);
  
  // General Information section
  const generalSection = createElement('div', 'detail-section');
  generalSection.appendChild(createElement('h3', null, 'General Information'));
  
  const infoList = createElement('div', 'info-list');
  infoList.appendChild(createInfoItem('Method', data.method));
  infoList.appendChild(createInfoItem('Path', data.pathname));
  infoList.appendChild(createInfoItem('Host', data.host));
  infoList.appendChild(createInfoItem('Total Calls', data.calls.length));
  generalSection.appendChild(infoList);
  requestDetails.appendChild(generalSection);
  
  // Query Parameters section
  if (data.queryParams.size > 0) {
    const querySection = createElement('div', 'detail-section');
    querySection.appendChild(createElement('h3', null, 'Query Parameters'));
    
    const paramList = createElement('ul');
    Array.from(data.queryParams).forEach(param => {
      const li = createElement('li', null, param);
      paramList.appendChild(li);
    });
    querySection.appendChild(paramList);
    requestDetails.appendChild(querySection);
  }
  
  // Request Headers section
  if (data.requestHeaders && data.requestHeaders.size > 0) {
    const headersSection = createElement('div', 'detail-section');
    headersSection.appendChild(createElement('h3', null, 'Request Headers'));
    
    const headerList = createElement('ul');
    Array.from(data.requestHeaders).sort().forEach(header => {
      const li = createElement('li', null, header);
      headerList.appendChild(li);
    });
    headersSection.appendChild(headerList);
    requestDetails.appendChild(headersSection);
  }
  
  // Request Body Structure section
  if (data.requestBodies.length > 0) {
    const bodySection = createElement('div', 'detail-section');
    bodySection.appendChild(createElement('h3', null, 'Request Body Structure'));
    
    const pre = createElement('pre');
    pre.textContent = JSON.stringify(analyzeStructure(data.requestBodies[0]), null, 2);
    bodySection.appendChild(pre);
    requestDetails.appendChild(bodySection);
  }
  
  // Recent Calls section
  const callsSection = createElement('div', 'detail-section');
  callsSection.appendChild(createElement('h3', null, 'Recent Calls'));
  
  const callsList = createElement('div', 'calls-list');
  const recentCalls = data.calls.slice(-5).reverse();
  
  if (recentCalls.length === 0) {
    callsList.appendChild(createElement('p', null, 'No calls recorded'));
  } else {
    recentCalls.forEach((call, idx) => {
      const callItem = createElement('div', 'call-item');
      
      callItem.appendChild(createInfoItem('Time', new Date(call.timestamp).toLocaleTimeString()));
      callItem.appendChild(createInfoItem('Status', call.status || 'Pending'));
      
      if (Object.keys(call.queryParams).length > 0) {
        callItem.appendChild(createInfoItem('Query', JSON.stringify(call.queryParams)));
      }
      
      if (call.requestBody) {
        const details = createElement('details');
        const summary = createElement('summary', null, 'Request Body');
        details.appendChild(summary);
        
        const pre = createElement('pre');
        pre.textContent = JSON.stringify(call.requestBody, null, 2);
        details.appendChild(pre);
        
        callItem.appendChild(details);
      }
      
      // Add copy curl button for each call
      const curlButton = createElement('button', 'copy-curl-btn', 'Copy cURL', {
        'data-call-index': idx,
        'data-endpoint': endpoint
      });
      curlButton.addEventListener('click', (e) => {
        e.stopPropagation();
        copyCurlCommand(data, call);
      });
      callItem.appendChild(curlButton);
      
      callsList.appendChild(callItem);
    });
  }
  
  callsSection.appendChild(callsList);
  requestDetails.appendChild(callsSection);
}

// Helper to create info items
function createInfoItem(label, value) {
  const p = createElement('p');
  const strong = createElement('strong', null, `${label}: `);
  p.appendChild(strong);
  p.appendChild(document.createTextNode(String(value)));
  return p;
}

// Analyze structure with better type detection
function analyzeStructure(obj) {
  if (obj === null) return "null";
  if (obj === undefined) return "string"; // Default to string instead of "undefined"
  
  const type = Array.isArray(obj) ? "array" : typeof obj;
  
  // Map JavaScript types to valid JSON Schema types
  if (type === "function") return "string";
  if (type === "symbol") return "string";
  if (type === "bigint") return "number";
  
  if (type === "object" && obj !== null) {
    const structure = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const analyzed = analyzeStructure(obj[key]);
        // Ensure we don't propagate invalid types
        if (typeof analyzed === "string" && !["string", "number", "boolean", "null", "array", "object"].includes(analyzed)) {
          structure[key] = "string";
        } else {
          structure[key] = analyzed;
        }
      }
    }
    return structure;
  } else if (type === "array") {
    if (obj.length === 0) {
      return [];
    }
    // Analyze all items to find common structure
    const itemTypes = obj.map(item => analyzeStructure(item));
    // For now, use the first item's structure
    return [itemTypes[0]];
  } else if (type === "string" || type === "number" || type === "boolean") {
    return type;
  } else {
    // Default any unknown types to string
    return "string";
  }
}

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
        // Convert arrays back to Sets if needed
        const processedItem = {
          ...item,
          queryParams: Array.isArray(item.queryParams) ? 
            new Set(item.queryParams) : 
            item.queryParams,
          requestHeaders: Array.isArray(item.requestHeaders) ? 
            new Set(item.requestHeaders) : 
            (item.requestHeaders || new Set())
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

// Handle disconnection
port.onDisconnect.addListener(() => {
  isConnected = false;
  showStatus('Disconnected from background script', 'error');
  clearInterval(updateTimer);
});

// Chrome runtime message handler
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "API_CALL_DETECTED") {
    // Convert arrays back to Sets if needed
    const processedData = {
      ...msg.data,
      queryParams: Array.isArray(msg.data.queryParams) ? 
        new Set(msg.data.queryParams) : 
        msg.data.queryParams,
      requestHeaders: Array.isArray(msg.data.requestHeaders) ? 
        new Set(msg.data.requestHeaders) : 
        (msg.data.requestHeaders || new Set())
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

// Show status messages
function showStatus(message, type = 'info') {
  // Create or update status element
  let status = document.getElementById('status-message');
  if (!status) {
    status = createElement('div', 'status-message', '', { id: 'status-message' });
    document.body.appendChild(status);
  }
  
  status.textContent = message;
  status.className = `status-message ${type}`;
  
  setTimeout(() => {
    status.style.opacity = '0';
    setTimeout(() => {
      if (status.parentNode) {
        status.parentNode.removeChild(status);
      }
    }, 300);
  }, 3000);
}

// Copy curl command to clipboard
function copyCurlCommand(data, call) {
  const includeAllHeaders = document.getElementById('complete-curl-checkbox')?.checked || false;
  
  // Build curl command
  let curl = `curl -X ${data.method} \\\n  'https://${data.host}${data.pathname}`;
  
  // Add query parameters
  if (Object.keys(call.queryParams).length > 0) {
    const queryPairs = Object.entries(call.queryParams).map(([key, value]) => {
      if (value === '***REDACTED***') {
        return `${key}=YOUR_${key.toUpperCase()}_HERE`;
      }
      return `${key}=${encodeURIComponent(value)}`;
    });
    curl += `?${queryPairs.join('&')}`;
  }
  curl += "'";
  
  // Add headers
  if (includeAllHeaders && call.allHeaders) {
    // Include ALL headers
    const sortedHeaders = Object.entries(call.allHeaders).sort((a, b) => a[0].localeCompare(b[0]));
    sortedHeaders.forEach(([header, value]) => {
      if (value === '***REDACTED***') {
        curl += ` \\\n  -H '${header}: YOUR_${header.toUpperCase().replace(/-/g, '_')}_HERE'`;
      } else {
        const escapedValue = value.replace(/'/g, "'\\''");
        curl += ` \\\n  -H '${header}: ${escapedValue}'`;
      }
    });
  } else if (call.requestHeaders) {
    // Include only custom headers
    Object.entries(call.requestHeaders).forEach(([header, value]) => {
      if (!['Accept', 'Content-Type', 'User-Agent', 'Referer', 'Origin'].includes(header)) {
        if (value === '***REDACTED***') {
          curl += ` \\\n  -H '${header}: YOUR_${header.toUpperCase().replace(/-/g, '_')}_HERE'`;
        } else {
          const escapedValue = value.replace(/'/g, "'\\''");
          curl += ` \\\n  -H '${header}: ${escapedValue}'`;
        }
      }
    });
  }
  
  // Add request body
  if (call.requestBody) {
    curl += ` \\\n  -d '${JSON.stringify(call.requestBody)}'`;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(curl).then(() => {
    showStatus('cURL command copied to clipboard', 'success');
  }).catch(() => {
    showStatus('Failed to copy to clipboard', 'error');
  });
}

// Event listeners
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all captured data?')) {
    port.postMessage({ type: "CLEAR_DATA" });
  }
});

exportBtn.addEventListener('click', () => {
  try {
    const openApiSpec = generateOpenApiSpec();
    
    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openapi-spec-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('Export successful', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showStatus('Export failed', 'error');
  }
});

recordCheckbox.addEventListener('change', (e) => {
  port.postMessage({ type: "SET_RECORDING", recording: e.target.checked });
  showStatus(e.target.checked ? 'Recording enabled' : 'Recording paused', 'info');
});

// Add filter controls to header
function addFilterControls() {
  const controls = document.querySelector('.controls');
  
  // Search input
  const searchInput = createElement('input', 'search-input', '', {
    type: 'text',
    placeholder: 'Filter endpoints...',
    id: 'search-input'
  });
  
  searchInput.addEventListener('input', (e) => {
    filterText = e.target.value;
    updateEndpointsList();
  });
  
  // Host filter
  const hostSelect = createElement('select', 'host-filter', '', {
    id: 'host-filter',
    title: 'Filter by host'
  });
  
  const allHostOption = createElement('option', null, 'All hosts', { value: 'all' });
  hostSelect.appendChild(allHostOption);
  
  hostSelect.addEventListener('change', (e) => {
    filterHost = e.target.value;
    updateEndpointsList();
  });
  
  // Method filter
  const methodSelect = createElement('select', 'method-filter', '', {
    id: 'method-filter',
    title: 'Filter by method'
  });
  
  const methods = ['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  methods.forEach(method => {
    const option = createElement('option', null, method, { value: method.toLowerCase() });
    methodSelect.appendChild(option);
  });
  
  methodSelect.addEventListener('change', (e) => {
    filterMethod = e.target.value;
    updateEndpointsList();
  });
  
  // Insert before existing controls
  controls.insertBefore(searchInput, controls.firstChild);
  controls.insertBefore(hostSelect, searchInput.nextSibling);
  controls.insertBefore(methodSelect, hostSelect.nextSibling);
}

// Update host filter dropdown
function updateHostFilter() {
  const hostSelect = document.getElementById('host-filter');
  if (!hostSelect) return;
  
  // Save current selection
  const currentValue = hostSelect.value;
  
  // Clear existing options except "All hosts"
  while (hostSelect.options.length > 1) {
    hostSelect.remove(1);
  }
  
  // Count calls per host
  const hostCounts = new Map();
  apiData.forEach((data) => {
    const count = hostCounts.get(data.host) || 0;
    hostCounts.set(data.host, count + data.calls.length);
  });
  
  // Add sorted hosts
  const sortedHosts = Array.from(hostsList).sort((a, b) => {
    // Sort by call count (descending)
    const aCount = hostCounts.get(a) || 0;
    const bCount = hostCounts.get(b) || 0;
    if (aCount !== bCount) return bCount - aCount;
    
    // Then by domain importance
    const aIsMain = !a.includes('cdn') && !a.includes('analytics') && !a.includes('google');
    const bIsMain = !b.includes('cdn') && !b.includes('analytics') && !b.includes('google');
    if (aIsMain && !bIsMain) return -1;
    if (!aIsMain && bIsMain) return 1;
    return a.localeCompare(b);
  });
  
  sortedHosts.forEach(host => {
    const count = hostCounts.get(host) || 0;
    const endpointCount = Array.from(apiData.values()).filter(d => d.host === host).length;
    const text = `${host} (${endpointCount} endpoints, ${count} calls)`;
    const option = createElement('option', null, text, { value: host });
    hostSelect.appendChild(option);
  });
  
  // Restore selection if it still exists
  if (currentValue && Array.from(hostSelect.options).some(opt => opt.value === currentValue)) {
    hostSelect.value = currentValue;
  }
}

// Initialize
addFilterControls();

// Update data periodically
updateTimer = setInterval(() => {
  if (isConnected) {
    port.postMessage({ type: "GET_API_CALLS" });
  }
}, CONFIG.UPDATE_INTERVAL);

// OpenAPI generation functions (keep existing implementations)
function generateOpenApiSpec() {
  const paths = {};
  const schemas = {};
  let hostUrl = '';
  
  apiData.forEach((data, endpoint) => {
    if (!hostUrl && data.host) {
      hostUrl = `https://${data.host}`;
    }
    
    // Collect all pathnames for this endpoint to detect variable segments
    const allPaths = data.calls.map(call => {
      const url = new URL(call.url);
      return url.pathname;
    });
    
    const pathParams = extractPathParams(data.pathname, allPaths);
    const path = pathParams.path;
    const method = data.method.toLowerCase();
    
    if (!paths[path]) {
      paths[path] = {};
    }
    
    const operation = {
      summary: `${data.method} ${data.pathname}`,
      operationId: `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
      description: generateOperationDescription(data),
      responses: {}
    };
    
    if (pathParams.params.length > 0) {
      operation.parameters = pathParams.params.map(param => ({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: pathParams.values[param]
      }));
    }
    
    if (data.queryParams.size > 0) {
      if (!operation.parameters) operation.parameters = [];
      
      // Collect all query parameter examples
      const paramExamples = new Map();
      data.calls.forEach(call => {
        Object.entries(call.queryParams).forEach(([key, value]) => {
          if (!paramExamples.has(key)) {
            paramExamples.set(key, []);
          }
          // Skip redacted values when collecting examples
          if (value !== '***REDACTED***' && !paramExamples.get(key).includes(value)) {
            paramExamples.get(key).push(value);
          }
        });
      });
      
      Array.from(data.queryParams).forEach(param => {
        const examples = paramExamples.get(param) || [];
        const paramDef = {
          name: param,
          in: 'query',
          required: false,
          schema: { type: 'string' }
        };
        
        // Only add examples if we have non-redacted values
        if (examples.length > 0) {
          if (examples.length === 1) {
            // Single example - use 'example'
            paramDef.example = examples[0];
          } else {
            // Multiple examples - use 'examples' (not both!)
            paramDef.examples = {};
            examples.slice(0, 5).forEach((ex, idx) => {
              paramDef.examples[`example${idx + 1}`] = {
                value: ex,
                summary: `Example value ${idx + 1}`
              };
            });
          }
        } else {
          // If all values were redacted, add a placeholder
          paramDef.example = "value";
          paramDef.description = "This parameter contains sensitive data that was redacted";
        }
        
        operation.parameters.push(paramDef);
      });
    }
    
    // Add request headers as parameters
    if (data.requestHeaders && data.requestHeaders.size > 0) {
      if (!operation.parameters) operation.parameters = [];
      
      // Collect header examples from calls
      const headerExamples = new Map();
      data.calls.forEach(call => {
        if (call.requestHeaders) {
          Object.entries(call.requestHeaders).forEach(([header, value]) => {
            if (!headerExamples.has(header)) {
              headerExamples.set(header, []);
            }
            if (value !== '***REDACTED***' && !headerExamples.get(header).includes(value)) {
              headerExamples.get(header).push(value);
            }
          });
        }
      });
      
      Array.from(data.requestHeaders).forEach(header => {
        // Skip common headers that are usually set automatically
        if (['Accept', 'Content-Type', 'User-Agent', 'Referer', 'Origin'].includes(header)) {
          return;
        }
        
        const examples = headerExamples.get(header) || [];
        const headerDef = {
          name: header,
          in: 'header',
          required: false,
          schema: { type: 'string' }
        };
        
        if (examples.length > 0) {
          if (examples.length === 1) {
            headerDef.example = examples[0];
          } else {
            headerDef.examples = {};
            examples.slice(0, 3).forEach((ex, idx) => {
              headerDef.examples[`example${idx + 1}`] = {
                value: ex,
                summary: `Example value ${idx + 1}`
              };
            });
          }
        } else {
          headerDef.description = "This header contains sensitive data that was redacted";
        }
        
        operation.parameters.push(headerDef);
      });
    }
    
    if (data.requestBodies.length > 0 && ['post', 'put', 'patch'].includes(method)) {
      const schemaName = `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}Request`;
      schemas[schemaName] = convertToJsonSchema(analyzeStructure(data.requestBodies[0]));
      
      operation.requestBody = {
        content: {
          'application/json': {
            schema: { '$ref': `#/components/schemas/${schemaName}` }
          }
        }
      };
      
      // Add examples based on count
      if (data.requestBodies.length === 1) {
        // Single example - use 'example'
        operation.requestBody.content['application/json'].example = data.requestBodies[0];
      } else if (data.requestBodies.length > 1) {
        // Multiple examples - use 'examples' (not both!)
        operation.requestBody.content['application/json'].examples = {};
        data.requestBodies.slice(0, 3).forEach((body, idx) => {
          operation.requestBody.content['application/json'].examples[`example${idx + 1}`] = {
            value: body,
            summary: `Request example ${idx + 1}`
          };
        });
      }
    }
    
    const statusCodes = new Set();
    data.calls.forEach(call => {
      if (call.status) {
        statusCodes.add(call.status.toString());
      }
    });
    
    if (statusCodes.size === 0) {
      operation.responses['200'] = { description: 'Successful response' };
    } else {
      statusCodes.forEach(status => {
        operation.responses[status] = { 
          description: getStatusDescription(parseInt(status)) 
        };
      });
    }
    
    paths[path][method] = operation;
  });
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Auto-generated API documentation from API Mapper'
    },
    servers: hostUrl ? [{ url: hostUrl }] : [],
    paths: paths,
    components: {
      schemas: schemas
    }
  };
}

function extractPathParams(pathname, allPaths = []) {
  const segments = pathname.split('/');
  const params = [];
  const paramValues = {};
  
  const pathSegments = segments.map((segment, idx) => {
    // Check if this segment varies across different calls
    const segmentVaries = allPaths.some(p => {
      const otherSegments = p.split('/');
      return otherSegments[idx] && otherSegments[idx] !== segment;
    });
    
    if (segmentVaries || /^\d+$/.test(segment) || /^[a-f0-9-]{36}$/i.test(segment)) {
      const paramName = params.length === 0 ? 'id' : `id${params.length + 1}`;
      params.push(paramName);
      paramValues[paramName] = segment;
      return `{${paramName}}`;
    }
    return segment;
  });
  
  return {
    path: pathSegments.join('/'),
    params: params,
    values: paramValues
  };
}

function convertToJsonSchema(structure) {
  // Direct type mappings
  if (structure === 'string') return { type: 'string' };
  if (structure === 'number') return { type: 'number' };
  if (structure === 'boolean') return { type: 'boolean' };
  if (structure === 'null') return { type: 'string', nullable: true }; // Use string with nullable
  
  // Handle any other string values that might have slipped through
  if (typeof structure === 'string') {
    // Validate it's a proper type, otherwise default to string
    const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
    if (!validTypes.includes(structure)) {
      return { type: 'string' };
    }
  }
  
  if (Array.isArray(structure)) {
    return {
      type: 'array',
      items: structure.length > 0 ? convertToJsonSchema(structure[0]) : { type: 'string' }
    };
  }
  
  if (typeof structure === 'object' && structure !== null) {
    const properties = {};
    const required = [];
    
    Object.keys(structure).forEach(key => {
      const value = structure[key];
      const propSchema = convertToJsonSchema(value);
      
      // Clean the key name (remove special characters that might cause issues)
      const cleanKey = key.replace(/[\$\-]/g, '_');
      properties[cleanKey] = propSchema;
      
      // Only add to required if it's not nullable/optional
      if (value !== 'null' && value !== null && value !== undefined) {
        required.push(cleanKey);
      }
    });
    
    const schema = {
      type: 'object',
      properties: properties
    };
    
    // Only add required array if it has items
    if (required.length > 0) {
      schema.required = required;
    }
    
    return schema;
  }
  
  return { type: 'string' }; // Default fallback
}

function getStatusDescription(status) {
  return CONFIG.STATUS_DESCRIPTIONS[status] || `HTTP ${status}`;
}

function generateOperationDescription(data) {
  let description = `Endpoint: ${data.method} ${data.pathname}\n`;
  description += `Total calls captured: ${data.calls.length}\n\n`;
  
  // Add curl examples
  if (data.calls.length > 0) {
    description += `## Example Requests\n\n`;
    
    // Get up to 3 unique examples
    const uniqueExamples = [];
    const seenExamples = new Set();
    
    for (const call of data.calls.slice().reverse()) {
      const exampleKey = JSON.stringify({
        query: call.queryParams,
        body: call.requestBody
      });
      
      if (!seenExamples.has(exampleKey)) {
        seenExamples.add(exampleKey);
        uniqueExamples.push(call);
        if (uniqueExamples.length >= 3) break;
      }
    }
    
    uniqueExamples.forEach((call, idx) => {
      description += `### Example ${idx + 1}\n\n`;
      
      // Build COMPLETE curl command with ALL headers
      let curl = `curl -X ${data.method} \\\n  'https://${data.host}${data.pathname}`;
      
      // Add query parameters
      if (Object.keys(call.queryParams).length > 0) {
        // Build query string, replacing redacted values with placeholders
        const queryPairs = Object.entries(call.queryParams).map(([key, value]) => {
          if (value === '***REDACTED***') {
            return `${key}=YOUR_${key.toUpperCase()}_HERE`;
          }
          return `${key}=${encodeURIComponent(value)}`;
        });
        curl += `?${queryPairs.join('&')}`;
      }
      curl += "'";
      
      // Add ALL headers if available (including User-Agent, etc)
      if (call.allHeaders) {
        // Sort headers for consistent output
        const sortedHeaders = Object.entries(call.allHeaders).sort((a, b) => a[0].localeCompare(b[0]));
        sortedHeaders.forEach(([header, value]) => {
          if (value === '***REDACTED***') {
            curl += ` \\\n  -H '${header}: YOUR_${header.toUpperCase().replace(/-/g, '_')}_HERE'`;
          } else {
            // Escape single quotes in header values
            const escapedValue = value.replace(/'/g, "'\\''");
            curl += ` \\\n  -H '${header}: ${escapedValue}'`;
          }
        });
      } else if (call.requestHeaders) {
        // Fallback to custom headers only
        Object.entries(call.requestHeaders).forEach(([header, value]) => {
          if (value === '***REDACTED***') {
            curl += ` \\\n  -H '${header}: YOUR_${header.toUpperCase().replace(/-/g, '_')}_HERE'`;
          } else {
            const escapedValue = value.replace(/'/g, "'\\''");
            curl += ` \\\n  -H '${header}: ${escapedValue}'`;
          }
        });
      }
      
      // Add request body
      if (call.requestBody) {
        curl += ` \\\n  -d '${JSON.stringify(call.requestBody)}'`;
      }
      
      description += `\`\`\`bash\n${curl}\n\`\`\`\n\n`;
      
      if (call.status) {
        description += `**Response Status:** ${call.status}\n\n`;
      }
    });
  }
  
  // Add observed query parameters
  if (data.queryParams.size > 0) {
    description += `## Query Parameters\n\n`;
    description += Array.from(data.queryParams).map(param => `- \`${param}\``).join('\n');
    description += '\n\n';
  }
  
  // Add observed headers
  if (data.requestHeaders && data.requestHeaders.size > 0) {
    const customHeaders = Array.from(data.requestHeaders).filter(h => 
      !['Accept', 'Content-Type', 'User-Agent', 'Referer', 'Origin'].includes(h)
    );
    if (customHeaders.length > 0) {
      description += `## Custom Headers\n\n`;
      description += customHeaders.map(header => `- \`${header}\``).join('\n');
      description += '\n\n';
    }
  }
  
  return description;
}