# Using the Rust Docs MCP Server with Cursor AI

This repository contains an MCP (Model Context Protocol) server that provides Rust crate documentation to Cursor AI.

## Setup Instructions

1. Make sure Docker is installed and running on your system.

2. When you open Cursor, you can tell Cursor AI to run the following command to start and access the MCP server in one step:

```bash
./start_mcp_server.sh
```

This script will:

-   Check if the MCP server container is running
-   Start it if it's not running
-   Automatically start and connect to the MCP server

No additional commands or manual intervention is required. The script handles everything in a single step.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like Cursor AI to access external tools and data sources. This MCP server specifically provides access to Rust crate documentation, allowing Cursor AI to give you more accurate and up-to-date information about Rust libraries.

## Troubleshooting

If you encounter any issues:

1. Make sure Docker is running
2. Try running the script manually in your terminal
3. Check Docker logs with `docker logs mcp-rust-docs`
