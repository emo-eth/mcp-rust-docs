# MCP Rust Documentation Server

This is a Model Context Protocol (MCP) server that fetches and returns documentation for Rust crates providing essential context for LLM's when working with Rust code.

## Features

-   Fetches documentation for any Rust crate available on docs.rs
-   Strips HTML and formats the content for readability
-   Limits response size to prevent overwhelming the client
-   Uses the latest MCP SDK (v1.6.1)
-   Written in TypeScript for better type safety and developer experience
-   Dockerized for easy deployment
-   Supports both stdio and SSE (Server-Sent Events) transports
-   Configurable port for SSE server

## Installation

```bash
# Clone the repository
git clone https://github.com/emo-eth/mcp-rust-docs.git
cd mcp-rust-docs

# Install dependencies
npm install
```

### Prerequisites

-   Node.js
-   npm

## Usage

### Running Locally

```bash
# Build the TypeScript code
npm run build

# Start the server with stdio transport (default)
npm start

# Or start the server with SSE transport (default port 3001)
npm run start:sse

# Or build and start in one command
npm run dev
```

### Running with Docker

The Docker setup is configured to run the SSE server on port 27182 by default, unlike the local SSE server which defaults to port 3001.

```bash
# Build and start the Docker container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

Alternatively, you can build and run the Docker container directly:

```bash
# Build the Docker image
docker build -t mcp-rust-docs .

# Run the container
docker run -it -p 27182:27182 --name mcp-rust-docs mcp-rust-docs
```

The server will be available at:

-   SSE endpoint: `http://localhost:27182/sse`
-   Message endpoint: `http://localhost:27182/message`

### Using with Docker

When using Docker, you'll need to adjust your Claude Desktop configuration:

```json
{
    "mcpServers": {
        "rust-docs": {
            "command": "docker",
            "args": ["exec", "-i", "mcp-rust-docs", "npm", "run", "start:sse"]
        }
    }
}
```

Make sure the container is running before starting Claude Desktop.

## Integrating with AI Assistants

### Claude Desktop

Add the following to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
    "mcpServers": {
        "rust-docs": {
            "command": "node",
            "args": ["/absolute/path/to/dist/stdio.js"]
        }
    }
}
```

Replace `/absolute/path/to/dist/stdio.js` with the absolute path to the dist/stdio.js file in this repository.

### Using with Docker

When using Docker, you'll need to adjust your Claude Desktop configuration:

```json
{
    "mcpServers": {
        "rust-docs": {
            "command": "docker",
            "args": ["exec", "-i", "mcp-rust-docs", "npm", "run", "start:sse"]
        }
    }
}
```

Make sure the container is running before starting Claude Desktop.

### Using the SSE Transport

The server also supports Server-Sent Events (SSE) for web-based integrations:

1. Start the server with SSE transport:

    ```bash
    # Start on default port (3001)
    npm run start:sse

    # Start on a specific port
    npm run start:sse -- --port 3002
    # or use the short form
    npm run start:sse -- -p 3002

    # Get help on available options
    npm run start:sse -- --help
    ```

2. The server will be available at:

    - SSE endpoint: `http://localhost:<port>/sse`
    - Message endpoint: `http://localhost:<port>/message`

    Replace `<port>` with the port number you specified (defaults to 3001).

3. Connect to the SSE endpoint from your client application and send messages to the message endpoint.

You can run multiple instances of the server on different ports to handle multiple connections:

```bash
# Run three instances on different ports
npm run start:sse -- -p 3001 &
npm run start:sse -- -p 3002 &
npm run start:sse -- -p 3003 &
```

The port can also be configured using the `PORT` environment variable:

```bash
PORT=3004 npm run start:sse
```

## Example Usage

Once the server is running and configured with your AI assistant, you can ask questions like:

-   "Look up the documentation for the 'tokio' crate"
-   "What features does the 'serde' crate provide?"
-   "Show me the documentation for 'ratatui'"
-   "Can you explain the main modules in the 'axum' crate?"

The AI will use the `lookup_crate_docs` tool to fetch and display the relevant documentation.

## Testing with MCP Inspector

You can test this server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Then select the "Connect to a local server" option and follow the prompts.

## How It Works

This server implements a single MCP tool called `lookup_crate_docs` that:

1. Takes a Rust crate name as input (optional, defaults to 'tokio' if not provided)
2. Fetches the documentation from docs.rs
3. Converts the HTML to plain text using the html-to-text library
4. Truncates the content if it exceeds 8000 characters
5. Returns the formatted documentation in the proper MCP response format

## SDK Implementation Notes

This server uses the MCP SDK with carefully structured import paths. If you're modifying the code, be aware that:

1. The SDK requires importing from specific paths (e.g., `@modelcontextprotocol/sdk/server/mcp.js`)
2. We use the high-level McpServer API rather than the low-level tools
3. The tool definition uses Zod for parameter validation
4. Console output is redirected to stderr to avoid breaking the MCP protocol
5. The tool returns properly formatted MCP response objects
6. The SSE implementation uses Express.js to provide HTTP endpoints

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
