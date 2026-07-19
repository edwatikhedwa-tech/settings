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
