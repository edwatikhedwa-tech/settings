import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildSearchPlan, rankResearchCandidates, selectCandidateLimit } from "./research.mjs";
import { defaultCaptureDirectory, listCaptures } from "../youtube-research-capture/capture-store.mjs";

const apiBase = "https://www.googleapis.com/youtube/v3";
const server = new Server(
  { name: "agent-control-plane-youtube-research", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set in the local environment.");
  return key;
}

async function youtubeGet(path, parameters) {
  const url = new URL(`${apiBase}/${path}`);
  for (const [name, value] of Object.entries({ ...parameters, key: apiKey() })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, String(value));
  }
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `YouTube API request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

function textResult(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "youtube_search",
      description: "Search public YouTube videos by query and return a bounded result set with metadata.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 1 },
          max_results: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          order: { type: "string", enum: ["relevance", "date", "viewCount", "rating", "title"], default: "relevance" },
          language: { type: "string", minLength: 2, maxLength: 5 },
          published_after: { type: "string", description: "RFC 3339 timestamp, for example 2026-01-01T00:00:00Z." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "youtube_video_details",
      description: "Fetch public metadata and statistics for up to 50 YouTube video IDs.",
      inputSchema: {
        type: "object",
        properties: {
          video_ids: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: { type: "string", minLength: 1 },
          },
        },
        required: ["video_ids"],
        additionalProperties: false,
      },
    },
    {
      name: "youtube_research_candidates",
      description: "Search several bounded queries, deduplicate results, enrich them with public metadata, and return an adaptive 15, 30, or 50-video candidate set plus a six-video deep-dive set.",
      inputSchema: {
        type: "object",
        properties: {
          topic: { type: "string", minLength: 1 },
          queries: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 1 } },
          selection_scope: { type: "string", enum: ["auto", "focused", "broad", "wide"], default: "auto" },
          max_candidates: { type: "integer", minimum: 1, maximum: 50, description: "Optional explicit limit. Overrides selection_scope." },
          deep_dive_count: { type: "integer", minimum: 1, maximum: 6, default: 6 },
          language: { type: "string", minLength: 2, maxLength: 5 },
          published_after: { type: "string", description: "RFC 3339 timestamp, for example 2026-01-01T00:00:00Z." },
        },
        required: ["topic"],
        additionalProperties: false,
      },
    },
    {
      name: "youtube_capture_latest",
      description: "Read a private local capture made by the user with YouTube Research Capture. It can contain text copied by the user from YouTube Summary or text visible in YouTube, and is never committed to Git.",
      inputSchema: {
        type: "object",
        properties: {
          video_url: { type: "string", description: "Optional exact YouTube watch URL to select a capture." },
          include_segments: { type: "boolean", default: true, description: "Return the user-provided text for research analysis." }
        },
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments ?? {};
    if (request.params.name === "youtube_search") {
      const payload = await youtubeGet("search", {
        part: "snippet",
        type: "video",
        q: args.query,
        maxResults: args.max_results ?? 10,
        order: args.order ?? "relevance",
        relevanceLanguage: args.language,
        publishedAfter: args.published_after,
      });
      return textResult(payload);
    }
    if (request.params.name === "youtube_video_details") {
      const payload = await youtubeGet("videos", {
        part: "snippet,contentDetails,statistics,status",
        id: args.video_ids.join(","),
      });
      return textResult(payload);
    }
    if (request.params.name === "youtube_research_candidates") {
      const queries = buildSearchPlan(args.topic, args.queries ?? []);
      const searchPayloads = await Promise.all(queries.map((query) => youtubeGet("search", {
        part: "snippet",
        type: "video",
        q: query,
        maxResults: 15,
        order: "relevance",
        relevanceLanguage: args.language,
        publishedAfter: args.published_after,
      })));
      const uniqueVideoIds = [...new Set(searchPayloads.flatMap((payload) => payload.items ?? []).map((item) => item.id?.videoId).filter(Boolean))];
      const candidateLimit = args.max_candidates ?? selectCandidateLimit(args.selection_scope ?? "auto", uniqueVideoIds.length);
      const videoIds = uniqueVideoIds.slice(0, 50);
      const details = videoIds.length === 0 ? { items: [] } : await youtubeGet("videos", {
        part: "snippet,contentDetails,statistics,status",
        id: videoIds.join(","),
      });
      const ranked = rankResearchCandidates(details.items ?? [], args.topic, candidateLimit, args.deep_dive_count ?? 6);
      return textResult({
        topic: args.topic,
        queries,
        selection: { scope: args.selection_scope ?? "auto", uniqueResultsFound: uniqueVideoIds.length, candidateLimit },
        candidateCount: ranked.candidates.length,
        ...ranked,
      });
    }
    if (request.params.name === "youtube_capture_latest") {
      const captures = await listCaptures(defaultCaptureDirectory);
      const capture = args.video_url ? captures.find((item) => item.videoUrl === args.video_url) : captures[0];
      if (!capture) return textResult({ found: false, message: "No matching local YouTube capture is available yet." });
      const { capturePath, segments, ...metadata } = capture;
      return textResult({
        found: true,
        ...metadata,
        segmentCount: segments.length,
        segments: args.include_segments === false ? undefined : segments,
        storage: "private/research-cache/youtube-captures (gitignored)",
      });
    }
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "YouTube API request failed." }] };
  }
});

await server.connect(new StdioServerTransport());
