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

The server exposes `youtube_search` and `youtube_video_details`. It does not download captions or access private YouTube data.

After setup, verify the real MCP path without printing the key:

```powershell
npm run smoke
```
