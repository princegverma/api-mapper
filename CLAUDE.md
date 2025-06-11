# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

API Mapper is a Chrome Extension that captures and documents API calls from websites. It adds a panel to Chrome DevTools that monitors network requests and exports them as OpenAPI 3.0 specifications.

## Architecture

### Core Components

1. **Background Script (`background.js`)**
   - Uses Chrome's webRequest API to intercept XHR and Fetch requests
   - Maintains a Map of API endpoints with their captured data
   - Implements memory management to limit stored data
   - Communicates with DevTools panel via Chrome runtime messaging
   - Critical: Must include `chrome.runtime.sendMessage()` to send updates to panel

2. **DevTools Panel (`panel.js`)**
   - Main UI logic displaying captured API calls
   - Implements filtering by host, method, and search text
   - Generates OpenAPI 3.0 specifications from captured data
   - Uses port-based messaging for initial connection and runtime messaging for updates
   - Creates cURL commands with optional complete header capture

3. **Security & Configuration (`config.js`)**
   - Contains SecurityUtils object for sanitizing sensitive data
   - Configurable limits for memory management
   - Lists of sensitive headers and parameters to redact

### Key Technical Constraints

1. **Manifest V3 Limitations**
   - Cannot modify request headers in webRequest API
   - Must use `host_permissions: ["<all_urls>"]` not in permissions array
   - Background script runs as service worker

2. **Chrome Extension Messaging**
   - Sets cannot be serialized - must convert to Arrays before sending
   - Panel receives updates via both port messages and runtime messages
   - Background script must handle connection/disconnection gracefully

3. **OpenAPI Generation**
   - Must use valid JSON Schema types only (string, number, boolean, object, array)
   - Use either 'example' OR 'examples' in parameters, never both
   - Path parameters are detected from numeric IDs and UUIDs

## Development Commands

Since this is a Chrome Extension with no build process:

1. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

2. **Debug Background Script**
   - In `chrome://extensions/`, click "Service Worker" link under API Mapper
   - Opens DevTools console for background script

3. **Reload Extension**
   - Click refresh button in `chrome://extensions/` after code changes
   - Or use Ctrl+R on the extensions page

4. **Test Extension**
   - Open any website
   - Open DevTools (F12)
   - Navigate to "API Mapper" tab
   - Make sure "Recording" checkbox is checked
   - Website API calls should appear automatically

## Common Issues & Solutions

1. **Extension not capturing calls**
   - Check if `chrome.runtime.sendMessage()` exists in background.js after capturing calls
   - Verify DevTools is open and API Mapper tab is selected
   - Ensure "Recording" checkbox is checked

2. **Syntax errors in panel.js**
   - Watch for template literal issues with curl commands
   - Ensure proper escaping of quotes in string concatenation

3. **Headers not captured**
   - Verify `onBeforeSendHeaders` listener is present in background.js
   - Check that requestHeaders permission is not needed (Manifest V3)

## Data Flow

1. Website makes API call → 
2. background.js `onBeforeRequest` captures request →
3. background.js `onBeforeSendHeaders` captures headers →
4. Data stored in `apiCalls` Map →
5. `chrome.runtime.sendMessage()` sends update to panel →
6. panel.js updates UI and filters display →
7. User exports → panel.js generates OpenAPI spec

## Configuration Points

- `config.js`: Adjust memory limits, sensitive data lists, UI debounce delays
- `panel.css`: Modify UI styling
- `manifest.json`: Update version, description, permissions