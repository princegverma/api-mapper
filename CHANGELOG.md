# Changelog

All notable changes to API Mapper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Tagging System**: Add custom tags to endpoints for better organization
  - Tag autocomplete suggestions
  - Filter endpoints by tags
  - Group endpoints by tags
  - Tags included in OpenAPI export
- **Selective Export**: Choose specific endpoints to export
  - Checkbox selection for each endpoint
  - Select All/Select None buttons
  - Selection counter showing "X of Y selected"
- **Direct Swagger Integration**: Open API specs directly in Swagger Editor
  - One-click "Open in Swagger" button
  - Automatic clipboard copy
  - Seamless integration with Swagger Editor
- **Multi-Select Filters**: Enhanced filtering capabilities
  - Multi-select method filter (GET, POST, PUT, etc.)
  - Multi-select host filter for multi-domain APIs
  - Multi-select tag filter
  - All filters work together
- **Modern UI Design**: Complete visual overhaul
  - Professional color scheme with CSS variables
  - Smooth animations and transitions
  - Better typography and spacing
  - Hover effects and visual feedback
  - Proper logo integration
  - Enhanced tooltip system
- **Multi-Server Support**: OpenAPI spec now includes all captured hosts
  - Proper `servers` array in OpenAPI 3.0 format
  - Supports APIs spanning multiple domains

### Changed
- Method and host filters converted from single-select to multi-select
- Export and Swagger buttons now only work with selected endpoints
- Improved tag input field to prevent focus loss issues
- Updated button styling with contextual colors (danger for Clear, success for Swagger)
- Empty state now shows friendly message with emoji

### Fixed
- Tag input field losing focus while typing
- Periodic UI updates interfering with user input
- OpenAPI export now properly includes multiple servers
- Improved memory management during tag operations

## [1.0.0] - 2024-01-15

### Initial Release
- Real-time API monitoring for XHR and Fetch requests
- Automatic endpoint grouping by method and path
- Parameter detection (query and path parameters)
- Complete header capture with optional inclusion in cURL
- Request body analysis for JSON payloads
- OpenAPI 3.0 specification export
- Advanced filtering by host, method, and search text
- Chrome DevTools panel integration
- Recording toggle control
- Automatic security redaction for sensitive data
- Memory management with configurable limits
- cURL command generation
- Response status code tracking
- Detailed endpoint information display

### Technical Features
- Background script using Chrome's webRequest API
- Real-time messaging between background and panel
- Debounced UI updates for performance
- Configurable security and memory settings
- No build process required - runs from source