import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildSearchPlan, extractExternalLinks, rankResearchCandidates, selectCandidateLimit, validateResearchReport } from "./research.mjs";

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
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ["youtube_research_candidates", "youtube_search", "youtube_video_details"]);

  const result = await client.request(
    { method: "tools/call", params: { name: "youtube_search", arguments: { query: "Codex" } } },
    CallToolResultSchema,
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /YOUTUBE_API_KEY is not set/);

  assert.deepEqual(buildSearchPlan("agent environment", ["настройка агента", "agent environment"]), ["настройка агента", "agent environment", "agent environment tutorial", "agent environment best practices"]);
  assert.equal(selectCandidateLimit("auto", 10), 15);
  assert.equal(selectCandidateLimit("auto", 30), 30);
  assert.equal(selectCandidateLimit("auto", 50), 50);
  assert.equal(selectCandidateLimit("wide", 1), 50);
  assert.deepEqual(extractExternalLinks("Docs: https://example.com/docs. Also https://example.org/x"), ["https://example.com/docs", "https://example.org/x"]);

  const ranked = rankResearchCandidates([
    { id: "one", snippet: { title: "Agent environment tutorial", description: "https://docs.example.com", channelId: "a", channelTitle: "Official", publishedAt: "2026-01-01T00:00:00Z" }, contentDetails: { caption: "true" }, statistics: { viewCount: "100" } },
    { id: "two", snippet: { title: "Agent environment best practices", description: "", channelId: "b", channelTitle: "Independent", publishedAt: "2026-01-02T00:00:00Z" }, contentDetails: { caption: "false" }, statistics: { viewCount: "10" } },
  ], "agent environment", 15, 6);
  assert.equal(ranked.candidates.length, 2);
  assert.equal(ranked.deepDive.length, 2);
  assert.equal(ranked.candidates[0].captionStatus, "available");
  assert.deepEqual(ranked.candidates[0].externalLinks, ["https://docs.example.com"]);

  const reportCheck = validateResearchReport(`## Цель\n## Охват\n## Источники\nhttps://www.youtube.com/watch?v=one\nТекст доступен\n## Подтверждённые выводы\n## Не подтверждено\n## Практические рекомендации\n## Кандидаты на внедрение\n## Следующее действие`);
  assert.equal(reportCheck.valid, true);
  console.log("[OK] YouTube MCP protocol test passed.");
} finally {
  await transport.close();
}
