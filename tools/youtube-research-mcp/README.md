# YouTube Research MCP

This local, read-only MCP server uses the official YouTube Data API v3.

## Setup

1. Create a Google Cloud project and enable YouTube Data API v3.
2. Create an API key restricted to YouTube Data API v3.
3. Set the key only in the local environment:

```powershell
[Environment]::SetEnvironmentVariable("YOUTUBE_API_KEY", "paste-key-here", "User")
```

4. Restart Codex after setting the variable.
5. Install the server dependency once:

```powershell
npm install
```

The server exposes `youtube_search`, `youtube_video_details`, and `youtube_research_candidates`.

`youtube_research_candidates` accepts up to four queries, combines the public search results, deduplicates videos, enriches them with public descriptions, external links, statistics, and the API caption flag. In `auto` mode it returns 15, 30, or 50 candidates based on the number of unique results; `focused`, `broad`, and `wide` select those limits explicitly. It always returns up to six deep-dive videos. It does not download captions or access private YouTube data.

For a repeatable research run, first create the report and task card:

```powershell
powershell -ExecutionPolicy Bypass -File ..\..\scripts\start-youtube-research.ps1 -Slug agent-environment-research -Title "Agent environment research" -Topic "agent environment setup" -Plan
```

Use `-Apply` only after reviewing the plan. Then ask the agent: `исследуй тему: <тема>`.

After setup, verify the real MCP path without printing the key:

```powershell
npm run smoke
```

## Optional browser-free transcript provider

`youtube_transcript_extract` sends up to six selected public YouTube URLs to the Supadata API and returns timestamped transcript segments or an explicit unavailable status. It is designed for the deep-dive stage of `topic-research`, so the user does not copy a transcript for each video.

Supadata documents a free tier of 100 requests per month without a payment card. Its batch endpoint is listed as paid, so this MCP deliberately runs a bounded sequential request set on the free tier. The provider states that it can use Whisper when captions are unavailable, but it is a third-party service, not YouTube. Its terms make the user responsible for compliance with YouTube's terms and applicable law. Review its current documentation and terms before enabling it:

- https://supadata.ai/youtube-transcript-api
- https://supadata.ai/pricing
- https://supadata.ai/terms

Create an API key in the provider dashboard only if you accept those terms, then store it only in the local user environment. Do not put it in `config.toml`, a repository file, or a chat message.

```powershell
[Environment]::SetEnvironmentVariable("SUPADATA_API_KEY", "paste-key-here", "User")
```

Restart Codex after setting the variable. The MCP never writes the key or full transcript text to public Git.
