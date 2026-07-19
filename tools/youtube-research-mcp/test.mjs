import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

const serverPath = fileURLToPath(new URL("./index.mjs", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: { ...process.env, YOUTUBE_API_KEY: "" },
  stderr: "pipe",
});
const client = new Client({ name: "youtube-research-mcp-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const listed = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ["youtube_search", "youtube_video_details"]);

  const result = await client.request(
    { method: "tools/call", params: { name: "youtube_search", arguments: { query: "Codex" } } },
    CallToolResultSchema,
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /YOUTUBE_API_KEY is not set/);
  console.log("[OK] YouTube MCP protocol test passed.");
} finally {
  await transport.close();
}
