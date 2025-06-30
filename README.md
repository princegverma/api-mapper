# API Mapper - Chrome Extension

![API Mapper Icon](favicon/android-chrome-192x192.png)

Welcome to the API Mapper project! This Chrome DevTools extension simplifies the process of monitoring and documenting APIs. It captures all API calls made by any website and exports them as OpenAPI 3.0 specifications. This tool is essential for developers looking to streamline their API documentation workflow.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Usage](#usage)
4. [How It Works](#how-it-works)
5. [Contributing](#contributing)
6. [License](#license)
7. [Links](#links)

## Features

- **Real-time API Monitoring**: The extension captures all XHR and Fetch requests, providing a complete view of API interactions.
- **Automatic Endpoint Grouping**: API calls are grouped by HTTP method and path, making it easy to navigate through requests.
- **Smart Tagging System**: Organize endpoints with custom tags for better documentation and easy retrieval.
- **Multi-Select Filtering**: Filter requests by multiple HTTP methods, hosts, and tags simultaneously for precise analysis.
- **Parameter Detection**: Tracks query parameters and path parameters to give a full picture of API requests.
- **Complete Header Capture**: Records all request headers, including User-Agent and cookies, for thorough documentation.
- **Request Body Analysis**: Analyzes JSON request body structure to ensure accurate representation in documentation.
- **OpenAPI Export**: Exports captured API data as OpenAPI 3.0 specifications (Swagger), facilitating easy integration with other tools.
- **Direct Swagger Integration**: Open the exported specifications directly in Swagger for immediate testing and validation.

## Installation

To install the API Mapper Chrome Extension, follow these steps:

1. **Download the latest release** from the [Releases page](https://github.com/princegverma/api-mapper/releases). 
2. **Unzip the downloaded file** to a location of your choice.
3. **Open Chrome** and navigate to `chrome://extensions/`.
4. **Enable Developer Mode** by toggling the switch in the top right corner.
5. **Click on "Load unpacked"** and select the unzipped folder containing the extension files.
6. The API Mapper extension should now appear in your extensions list.

## Usage

After installation, you can start using the API Mapper extension:

1. **Open Chrome DevTools** by right-clicking on any webpage and selecting "Inspect" or pressing `Ctrl + Shift + I`.
2. **Navigate to the API Mapper tab** in the DevTools panel.
3. **Monitor API calls** as you interact with the website. The extension will automatically capture and display all API requests.
4. **Use the filtering options** to narrow down the displayed requests based on your needs.
5. **Export your API documentation** by clicking the export button. Choose the OpenAPI 3.0 format for compatibility with various tools.

## How It Works

The API Mapper extension operates by hooking into the network request lifecycle of Chrome. It listens for all XHR and Fetch requests made by the browser. As these requests occur, the extension captures essential details such as:

- Request method (GET, POST, etc.)
- Request URL
- Query parameters
- Request headers
- Request body (if applicable)

This information is then organized and displayed in a user-friendly interface within the DevTools panel. The extension allows users to filter and group requests, making it easy to analyze API interactions.

The captured data can be exported as OpenAPI 3.0 specifications. This format is widely accepted and can be used with various tools for API documentation and testing.

## Contributing

We welcome contributions to the API Mapper project! If you would like to help improve the extension, please follow these steps:

1. **Fork the repository** on GitHub.
2. **Create a new branch** for your feature or bug fix.
3. **Make your changes** and commit them with clear messages.
4. **Push your branch** to your forked repository.
5. **Open a pull request** against the main repository.

Please ensure that your code adheres to our coding standards and includes tests where applicable.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Links

For the latest releases, visit our [Releases page](https://github.com/princegverma/api-mapper/releases). Download the latest version and start mapping your APIs today!

For any questions or support, feel free to open an issue in the repository. Your feedback is valuable and helps improve the extension for everyone.