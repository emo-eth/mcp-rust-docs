import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import express from "express";
import { createServer } from "./rust-docs";

const app = express();

const { server, cleanup } = createServer();

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
    console.log("Received connection");
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    server.close = async () => {
        await cleanup();
        await server.close();
        process.exit(0);
    };
});

app.post("/message", async (req, res) => {
    console.log("Received message");

    await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
