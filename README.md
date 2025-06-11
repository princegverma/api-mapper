# API Mapper - Chrome Extension

A Chrome DevTools extension that automatically maps and documents APIs by monitoring network requests. It captures all API calls made by any website and exports them as OpenAPI 3.0 specification.

## Features

- **Real-time API Monitoring**: Captures all XHR and Fetch requests
- **Automatic Endpoint Grouping**: Groups API calls by HTTP method and path
- **Parameter Detection**: Tracks query parameters and path parameters
- **Complete Header Capture**: Records ALL request headers including User-Agent, cookies, etc.
- **Request Body Analysis**: Analyzes JSON request body structure
- **OpenAPI Export**: Exports captured API data as OpenAPI 3.0 specification (Swagger)
- **Advanced Filtering**: Filter captured endpoints by host, HTTP method, or search text
- **DevTools Integration**: Adds a custom "API Mapper" panel in Chrome DevTools
- **Recording Control**: Toggle recording on/off to control when calls are captured
- **Security**: Automatically redacts sensitive headers and parameters
- **Memory Management**: Automatically limits stored data to prevent performance issues
- **Complete cURL Export**: Generate curl commands with all browser headers for exact request replication

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `api-mapper` directory

## Usage

### Opening API Mapper

1. Open Chrome DevTools (F12 or right-click → Inspect)
2. Look for the "API Mapper" tab in the DevTools panel
3. Click on it to open the API mapping interface

### Monitoring APIs

1. With API Mapper open, navigate to any website
2. The extension will automatically capture all API calls
3. Endpoints are grouped by HTTP method and path
4. Click on any endpoint to view:
   - Request details
   - Query parameters used
   - Request body structure
   - Recent call examples
   - Response status codes

### Exporting API Documentation

1. Click the "Export" button in the top right
2. The extension generates an OpenAPI 3.0 specification file
3. The file is automatically downloaded as `openapi-spec-YYYY-MM-DD.json`
4. This file can be imported into:
   - Swagger UI
   - Postman
   - API documentation tools
   - Code generation tools

### Controls

- **Recording Toggle**: Check/uncheck to start/stop capturing API calls
- **Clear Button**: Removes all captured data
- **Export Button**: Downloads the OpenAPI specification
- **Complete cURL Toggle**: When enabled, copies curl commands with ALL browser headers
- **Search Box**: Filter endpoints by path, host, or any text
- **Host Filter**: Dropdown to filter by specific host (shows call counts)
- **Method Filter**: Filter by HTTP method (GET, POST, PUT, etc.)

## How It Works

The extension consists of several components:

1. **Background Script** (`background.js`): Intercepts network requests using Chrome's webRequest API
2. **DevTools Panel** (`panel.js`): Displays captured API data in an organized interface
3. **Content Analysis**: Automatically detects:
   - Path parameters (numeric IDs and UUIDs)
   - Query parameters
   - Request body JSON structure
   - Response status codes

## OpenAPI Export Format

The exported specification includes complete examples and documentation:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "API Documentation",
    "version": "1.0.0",
    "description": "Auto-generated API documentation from API Mapper"
  },
  "servers": [
    {
      "url": "https://api.example.com"
    }
  ],
  "paths": {
    "/users/{id}": {
      "get": {
        "summary": "GET /users/123",
        "operationId": "getusersid",
        "description": "Endpoint: GET /users/123\nTotal calls captured: 5\n\n## Example Requests\n\n### Example 1\n\n```bash\ncurl -X GET 'https://api.example.com/users/123?include=profile' \\\n  -H 'Accept: application/json'\n```\n\n**Response Status:** 200\n\n## Query Parameters\n\n- `include`\n- `fields`\n",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" },
            "example": "123"
          },
          {
            "name": "include",
            "in": "query",
            "required": false,
            "schema": { "type": "string" },
            "example": "profile",
            "examples": {
              "example1": { "value": "profile", "summary": "Example value 1" },
              "example2": { "value": "orders", "summary": "Example value 2" }
            }
          }
        ],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "postusersRequest": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" }
        },
        "required": ["name", "email"]
      }
    }
  }
}
```

### Enhanced Features

- **Complete curl examples**: Each endpoint includes ready-to-use curl commands
- **Full header capture**: Option to include ALL browser headers in curl commands (User-Agent, Accept-Language, etc.)
- **Parameter examples**: All parameters include actual values captured from real API calls
- **Multiple examples**: When different parameter combinations are used, multiple examples are provided
- **Request body examples**: POST/PUT/PATCH requests include complete JSON payloads
- **Query parameter documentation**: All observed query parameters are listed with examples
- **Automatic path parameter detection**: Numeric IDs and UUIDs are automatically detected and documented
- **Smart filtering**: Filter captured endpoints by host to focus on specific APIs and reduce noise
- **Memory management**: Automatic cleanup of old data (configurable limits)
- **Security redaction**: Automatic masking of sensitive data in headers and parameters

## Configuration

The extension can be configured by editing `config.js`:

- `MAX_CALLS_PER_ENDPOINT`: Maximum number of calls to store per endpoint (default: 100)
- `MAX_TOTAL_ENDPOINTS`: Maximum number of endpoints to track (default: 500)
- `UPDATE_INTERVAL`: How often to refresh the UI in milliseconds (default: 1000)
- `DEBOUNCE_DELAY`: Delay for UI updates to improve performance (default: 300)
- `SENSITIVE_HEADERS`: List of header names to automatically redact
- `SENSITIVE_QUERY_PARAMS`: List of query parameter names to automatically redact

## Limitations

- Only captures XHR and Fetch requests (not WebSocket or SSE)
- Response bodies are not captured (only status codes)
- Works only with JSON request bodies
- Path parameter detection is based on common patterns (numeric IDs and UUIDs)

## Troubleshooting

### OpenAPI Validation Errors

The generated OpenAPI spec should be valid, but if you encounter validation errors:

1. **Invalid type errors**: The extension now properly maps all JavaScript types to valid OpenAPI types
2. **Empty required arrays**: Fixed to only include required arrays when they have items
3. **Null handling**: Null values are properly marked as nullable

### Common Issues

- **Extension not capturing API calls**: Make sure DevTools is open and the API Mapper tab is selected
- **Too many API calls**: Use the host filter to focus on specific APIs and filter out analytics/tracking calls
- **Sensitive data**: API keys and tokens are automatically redacted (configurable in config.js)
- **Memory usage**: The extension automatically limits stored data to prevent performance issues
- **"Recording" checkbox unchecked**: The extension only captures calls when recording is enabled
- **Copy cURL not working**: Make sure to click the "Copy cURL" button for individual calls in the details view

## Privacy

This extension only captures API calls while the DevTools panel is open and recording is enabled. All data is stored locally in memory and cleared when you close DevTools or click the Clear button. No data is sent to external servers.

## Development

### Project Structure

```
api-mapper/
├── manifest.json          # Chrome extension manifest
├── background.js          # Background script for network interception
├── config.js             # Configuration for security and limits
├── devtools.html          # DevTools page
├── devtools.js           # Creates the custom panel
├── panel.html            # Panel UI structure
├── panel.js              # Panel functionality
├── panel.css             # Panel styling
└── favicon/              # Extension icons
```

### Building from Source

No build process required. The extension runs directly from source files.

## License

MIT License

## Contributing

Feel free to submit issues and enhancement requests!