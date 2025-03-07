// index.ts - TypeScript version
import axios from "axios";
import { convert as htmlToText } from "html-to-text";

// Import specific modules from the SDK with corrected paths
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define a simple RequestHandlerExtra interface since we can't import it
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

// Redirect console.log to stderr to avoid breaking the MCP protocol
const originalConsoleLog = console.log;
console.log = function (...args: any[]): void {
    console.error.apply(console, args);
};

// Initialize the MCP server
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

// Add timeout configuration for axios
const AXIOS_TIMEOUT = 5000; // 5 seconds

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

            console.error(
                `Fetching documentation for default crate: ${crateName}`
            );

            // Construct the docs.rs URL for the crate
            const url = `https://docs.rs/${crateName}/latest/${crateName}/index.html`;
            console.error(`Making request to: ${url}`);

            // Add timeout to axios request
            const response = await axios.get(url, {
                timeout: AXIOS_TIMEOUT,
                maxContentLength: 10 * 1024 * 1024, // 10MB limit
            });
            console.error(`Received response with status: ${response.status}`);

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

            console.error(`Successfully processed docs for ${crateName}`);
            return {
                content: [{ type: "text", text: truncatedText }],
            };
        } catch (error) {
            if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Request timed out after ${
                                AXIOS_TIMEOUT / 1000
                            } seconds. The documentation may be too large or docs.rs may be unresponsive.`,
                        },
                    ],
                    isError: true,
                };
            }
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            console.error(`Error fetching documentation:`, errorMessage);
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

// Connect to the stdio transport and start the server
server
    .connect(new StdioServerTransport())
    .then(() => {
        console.error("MCP Crate Docs Server is running...");
    })
    .catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Failed to start MCP server:", errorMessage);
        process.exit(1);
    });
