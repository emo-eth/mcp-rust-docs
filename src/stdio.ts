import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { createServer } from "./rust-docs";

const { server } = createServer();

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
