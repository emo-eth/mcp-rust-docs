// src/sse.ts - SSE implementation for MCP Rust Documentation Server
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from "axios";
import { convert as htmlToText } from "html-to-text";
import { z } from "zod";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option("port", {
        alias: "p",
        description: "Port to run the server on",
        type: "number",
        default: 3001,
    })
    .help()
    .parseSync();

// Define a simple RequestHandlerExtra interface
interface RequestHandlerExtra {
    [key: string]: unknown;
}

// Define types for MCP responses
interface TextContentItem {
    type: "text";
    text: string;
    [key: string]: unknown;
}

interface ImageContentItem {
    type: "image";
    data: string;
    mimeType: string;
    [key: string]: unknown;
}

interface ResourceContentItem {
    type: "resource";
    resource:
        | {
              text: string;
              uri: string;
              mimeType?: string;
              [key: string]: unknown;
          }
        | {
              uri: string;
              blob: string;
              mimeType?: string;
              [key: string]: unknown;
          };
    [key: string]: unknown;
}

type McpContentItem = TextContentItem | ImageContentItem | ResourceContentItem;

interface McpResponse {
    content: McpContentItem[];
    isError?: boolean;
    _meta?: Record<string, unknown>;
    [key: string]: unknown;
}

// Create the MCP server
export function createServer() {
    const server = new McpServer({
        name: "rust-docs",
        version: "1.0.0",
    });

    // Define the parameter schema using Zod
    const lookupCrateDocsParams = {
        crateName: z
            .string()
            .optional()
            .describe("Name of the Rust crate to lookup documentation for"),
    };

    // Define tool with proper Zod schema for parameters
    server.tool(
        "lookup_crate_docs",
        "Lookup documentation for a Rust crate from docs.rs",
        lookupCrateDocsParams,
        async (
            args: { crateName?: string },
            extra: RequestHandlerExtra
        ): Promise<McpResponse> => {
            try {
                // Extract crateName from args or use default
                const crateName = args.crateName || "tokio";

                console.log(`Fetching documentation for crate: ${crateName}`);

                // Construct the docs.rs URL for the crate
                const url = `https://docs.rs/${crateName}/latest/${crateName}/index.html`;
                console.log(`Making request to: ${url}`);

                // Fetch the HTML content
                const response = await axios.get(url);
                console.log(
                    `Received response with status: ${response.status}`
                );

                // Convert HTML to text
                const text = htmlToText(response.data as string, {
                    wordwrap: 130,
                    selectors: [
                        { selector: "a", options: { ignoreHref: true } },
                        { selector: "img", format: "skip" },
                    ],
                });

                // Truncate if necessary
                const maxLength = 8000;
                const truncatedText =
                    text.length > maxLength
                        ? text.substring(0, maxLength) +
                          `\n\n[Content truncated. Full documentation available at ${url}]`
                        : text;

                console.log(`Successfully processed docs for ${crateName}`);
                return {
                    content: [{ type: "text", text: truncatedText }],
                };
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log(`Error fetching documentation:`, errorMessage);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Could not fetch documentation. ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    const cleanup = async () => {
        console.log("Cleaning up resources...");
        // Add any cleanup logic here if needed
    };

    return { server, cleanup };
}

// Initialize Express app
const app = express();

// Create the MCP server
const { server, cleanup } = createServer();

// Variable to hold the SSE transport
let transport: SSEServerTransport;

// SSE endpoint
app.get("/sse", async (req: Request, res: Response) => {
    console.log("Received SSE connection");

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create SSE transport
    transport = new SSEServerTransport("/message", res);

    // Connect the server to the transport
    await server.connect(transport);

    // Handle server close event
    // Using a custom property since McpServer doesn't have onclose
    (server as any).onCloseCallback = async () => {
        await cleanup();
        await server.close();
        console.log("Server closed");
    };

    // Handle client disconnect
    req.on("close", () => {
        console.log("Client disconnected");
    });
});

// Message endpoint for client to send messages to the server
app.post("/message", async (req: Request, res: Response) => {
    console.log("Received message from client");

    if (!transport) {
        return res.status(400).json({ error: "No active SSE connection" });
    }

    try {
        await transport.handlePostMessage(req, res);
    } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).json({ error: "Failed to process message" });
    }
});

// Start the server
const PORT = process.env.PORT || argv.port || 3001;
app.listen(PORT, () => {
    console.log(`MCP Rust Documentation SSE Server is running on port ${PORT}`);
    console.log(`Connect to SSE endpoint at http://localhost:${PORT}/sse`);
    console.log(`Send messages to http://localhost:${PORT}/message`);
});
