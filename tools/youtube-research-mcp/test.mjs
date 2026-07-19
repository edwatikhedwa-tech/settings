import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildSearchPlan, extractExternalLinks, rankResearchCandidates, selectCandidateLimit, validateResearchReport } from "./research.mjs";
import { fetchSupadataTranscripts, validateYouTubeUrl } from "./supadata.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readSupadataBudget, reserveSupadataRequest } from "./budget.mjs";

const serverPath = fileURLToPath(new URL("./index.mjs", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: { ...process.env, YOUTUBE_API_KEY: "", SUPADATA_API_KEY: "" },
  stderr: "pipe",
});
const client = new Client({ name: "youtube-research-mcp-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const listed = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ["youtube_capture_enqueue", "youtube_capture_job_status", "youtube_capture_latest", "youtube_research_candidates", "youtube_search", "youtube_transcript_budget", "youtube_transcript_extract", "youtube_video_details"]);

  const result = await client.request(
    { method: "tools/call", params: { name: "youtube_search", arguments: { query: "Codex" } } },
    CallToolResultSchema,
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /YOUTUBE_API_KEY is not set/);

  const transcriptToolResult = await client.request(
    { method: "tools/call", params: { name: "youtube_transcript_extract", arguments: { video_urls: ["https://youtu.be/dQw4w9WgXcQ"] } } },
    CallToolResultSchema,
  );
  assert.equal(transcriptToolResult.isError, true);
  assert.match(transcriptToolResult.content[0].text, /SUPADATA_API_KEY is not set/);

  assert.equal(validateYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), "https://youtu.be/dQw4w9WgXcQ");
  assert.throws(() => validateYouTubeUrl("https://example.com/video"), /youtube\.com or youtu\.be/);
  const transcriptResults = await fetchSupadataTranscripts(["https://www.youtube.com/watch?v=one", "https://www.youtube.com/watch?v=two"], {
    apiKey: "test-key",
    fetchFn: async (url) => ({
      ok: url.searchParams.get("url").includes("one"),
      status: 404,
      json: async () => url.searchParams.get("url").includes("one")
        ? { lang: "en", content: [{ text: "A transcript segment.", offset: 0, duration: 1000 }] }
        : { message: "No transcript available" },
    }),
    reserveRequest: async () => ({ allowed: true, used: 1, limit: 80, remaining: 79 }),
  });
  assert.equal(transcriptResults[0].status, "available");
  assert.equal(transcriptResults[0].segmentCount, 1);
  assert.equal(transcriptResults[1].status, "unavailable");
  assert.match(transcriptResults[1].error, /No transcript available/);

  const budgetDirectory = await mkdtemp(path.join(os.tmpdir(), "supadata-budget-"));
  try {
    assert.equal((await readSupadataBudget({ directory: budgetDirectory, limit: 2, now: new Date("2026-07-19T00:00:00Z") })).remaining, 2);
    assert.equal((await reserveSupadataRequest({ directory: budgetDirectory, limit: 2, now: new Date("2026-07-19T00:00:00Z") })).allowed, true);
    assert.equal((await reserveSupadataRequest({ directory: budgetDirectory, limit: 2, now: new Date("2026-07-19T00:00:00Z") })).remaining, 0);
    assert.equal((await reserveSupadataRequest({ directory: budgetDirectory, limit: 2, now: new Date("2026-07-19T00:00:00Z") })).allowed, false);
  } finally { await rm(budgetDirectory, { recursive: true, force: true }); }

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
