# Global agent workspace

- Status: active
- Started: 2026-07-19
- Last updated: 2026-07-19

## Goal

Create a portable global configuration and working memory for Codex, then extend the same source of truth to other supported clients.

## Context

The repository is the canonical source for policies, skills, MCP registry, task cards, and research notes. Codex is installed; Claude Code is not currently available in PATH. ChatGPT requires a supported manual import surface for durable instructions.

## Current State

- Global Codex guidance is installed in the managed block of `~/.codex/AGENTS.md`.
- Nine repository skills are linked into `~/.agents/skills`.
- Re-running `bootstrap.ps1 -Apply -Client codex` is idempotent.
- `work/` and `knowledge/` now store task continuity and research summaries in Git.
- A local read-only YouTube Data API MCP server is available in `tools/youtube-research-mcp/`.

## Decisions

- Use Git as the export/import mechanism and canonical history.
- Keep global rules in a managed block so existing user guidance is preserved.
- Keep MCP servers opt-in; `youtube-research` is registered but disabled until its key is configured.
- Record YouTube research as bounded, cited notes rather than claiming an unbounded scan of all videos.

## Next Action

Create a Google Cloud project, enable YouTube Data API v3, create a restricted `YOUTUBE_API_KEY`, then enable the registered local MCP server.

## References
