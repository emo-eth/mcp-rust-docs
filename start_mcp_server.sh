#!/bin/bash

# Navigate to the MCP server directory
cd "$(dirname "$0")"

# Check if the container is running and start it if needed
if ! docker ps | grep -q mcp-rust-docs; then
  echo "Starting MCP container..."
  docker-compose up -d
  
  # Wait a moment for the container to fully start
  sleep 3
  
  # Check if container started successfully
  if ! docker ps | grep -q mcp-rust-docs; then
    echo "Failed to start MCP container. Check docker logs for details."
    exit 1
  fi
fi

# Check if the server is already running inside the container
if docker exec mcp-rust-docs ps aux | grep -q "node dist/index.js"; then
  echo "MCP server is already running inside the container."
else
  # Start the MCP server in detached mode
  echo "Starting MCP server..."
  docker exec -d mcp-rust-docs npm start
  
  # Give it a moment to start
  sleep 2
  
  # Verify the server started correctly
  if ! docker exec mcp-rust-docs ps aux | grep -q "node dist/index.js"; then
    echo "Failed to start MCP server. Check logs with: docker logs mcp-rust-docs"
    exit 1
  fi
fi

# Output success message
echo "MCP server ready" 