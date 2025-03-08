import axios from "axios";
import { convert as htmlToText } from "html-to-text";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

export function createServer() {
    console.error("[Server] Creating new MCP server instance");
    const server = new McpServer({
        name: "rust-docs",
        version: "1.0.0",
    });
    console.error("[Server] MCP server instance created");

    // Define the parameter schema using Zod
    const lookupCrateDocsParams = {
        crateName: z
            .string()
            .optional()
            .describe("Name of the Rust crate to lookup documentation for"),
    };

    console.error("[Server] Registering lookup_crate_docs tool");
    // Define tool with proper Zod schema for parameters

    server.tool(
        "lookup_crate_docs",
        "Lookup documentation for a Rust crate from docs.rs",
        lookupCrateDocsParams,
        async (
            args: { crateName?: string },
            extra: RequestHandlerExtra
        ): Promise<McpResponse> => {
            console.error("[Tool] Starting lookup_crate_docs execution");
            try {
                // Extract crateName from args or use default
                const crateName = args.crateName || "tokio";
                console.error(
                    `[Tool] Processing request for crate: ${crateName}`
                );

                // Construct the docs.rs URL for the crate
                const url = `https://docs.rs/${crateName}/latest/${crateName}/index.html`;
                console.error(`[Tool] Fetching documentation from: ${url}`);

                // Simplified axios request to match JavaScript version
                console.error("[Tool] Making HTTP request");
                const axiosResponse = await axios.get(url);
                console.error(
                    `[Tool] Received HTTP response with status: ${axiosResponse.status}`
                );

                // Convert HTML to text
                console.error("[Tool] Converting HTML to text");
                const text = htmlToText(axiosResponse.data as string, {
                    wordwrap: 130,
                    selectors: [
                        { selector: "a", options: { ignoreHref: true } },
                        { selector: "img", format: "skip" },
                    ],
                });
                console.error(
                    `[Tool] Converted HTML to text (length: ${text.length})`
                );

                // Truncate if necessary
                const maxLength = 8000;
                const truncatedText =
                    text.length > maxLength
                        ? text.substring(0, maxLength) +
                          `\n\n[Content truncated. Full documentation available at ${url}]`
                        : text;

                console.error(`[Tool] Preparing MCP response for ${crateName}`);
                const mcpResponse: McpResponse = {
                    content: [
                        {
                            type: "text" as const,
                            text: truncatedText,
                        },
                    ],
                };

                console.error(
                    "[Tool] Response content length:",
                    (mcpResponse.content[0] as TextContentItem).text.length
                );
                console.error(
                    "[Tool] Successfully completed lookup_crate_docs"
                );
                console.error("[Tool] Returning response to transport");
                return mcpResponse;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `[Tool] Error in lookup_crate_docs:`,
                    errorMessage,
                    error instanceof Error ? (error as Error).stack : ""
                );

                const mcpErrorResponse: McpResponse = {
                    content: [
                        {
                            type: "text" as const,
                            text: `Error: Could not fetch documentation. ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };

                console.error("[Tool] Returning error response to transport");
                return mcpErrorResponse;
            }
        }
    );
    console.error("[Server] Tool registration completed");

    const cleanup = async () => {
        console.error("[Server] Starting cleanup");
        // Add any cleanup logic here if needed
        console.error("[Server] Cleanup completed");
    };

    return { server, cleanup };
}

export type {
    McpResponse,
    McpContentItem,
    TextContentItem,
    ImageContentItem,
    ResourceContentItem,
};
