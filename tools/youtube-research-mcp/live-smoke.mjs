import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

if (!process.env.YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY is not set in this process.");
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["index.mjs"],
  cwd: process.cwd(),
  env: process.env,
  stderr: "pipe",
});
const client = new Client({ name: "youtube-research-mcp-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const result = await client.request(
    { method: "tools/call", params: { name: "youtube_search", arguments: { query: "Codex OpenAI", max_results: 1 } } },
    CallToolResultSchema,
  );
  if (result.isError) throw new Error(result.content[0]?.text || "MCP tool returned an error.");
  const payload = JSON.parse(result.content[0].text);
  if (!payload.items?.length) throw new Error("MCP returned no search results.");

  const research = await client.request(
    {
      method: "tools/call",
      params: {
        name: "youtube_research_candidates",
        arguments: {
          topic: "agent environment setup",
          queries: ["agent environment setup", "AI agent workspace setup", "настройка окружения агентов"],
          selection_scope: "auto",
          deep_dive_count: 6,
        },
      },
    },
    CallToolResultSchema,
  );
  if (research.isError) throw new Error(research.content[0]?.text || "MCP research tool returned an error.");
  const researchPayload = JSON.parse(research.content[0].text);
  if (!researchPayload.candidates?.length || !researchPayload.deepDive?.length) {
    throw new Error("MCP research tool returned no candidates or deep-dive videos.");
  }
  if (researchPayload.candidates.length > 50 || researchPayload.deepDive.length > 6) {
    throw new Error("MCP research tool exceeded its bounded result limits.");
  }
  if (process.env.RESEARCH_SMOKE_OUTPUT === "1") console.log(JSON.stringify(researchPayload));
  console.log("[OK] YouTube MCP live search passed.");
} finally {
  await transport.close();
}
