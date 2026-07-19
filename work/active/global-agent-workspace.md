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
- The YouTube MCP passed its live API smoke test; search and video-statistics calls also succeeded for a real research topic.
- The first bounded YouTube research note is recorded in `knowledge/youtube/agent-environment-setup.md`. Selected videos did not expose captions to the permitted transcript tool, and that limitation is recorded in the note.
- After the Codex restart, the configured local YouTube MCP appeared in the active tool registry and completed a real Russian-language search. The research note now includes a metadata-and-chapters-based overview of five relevant videos.

## Decisions

- Use Git as the export/import mechanism and canonical history.
- Keep global rules in a managed block so existing user guidance is preserved.
- Keep MCP servers opt-in and secrets outside Git; `youtube-research` is configured locally through the `YOUTUBE_API_KEY` environment variable.
- Record YouTube research as bounded, cited notes rather than claiming an unbounded scan of all videos.
- Do not bypass video access controls or infer spoken claims when a transcript is unavailable.

## Next Action

Use the `youtube-research` skill for the next bounded topic; prefer videos with descriptions and chapter lists, and append transcript evidence only when it is actually available through an authorized tool.

## References
