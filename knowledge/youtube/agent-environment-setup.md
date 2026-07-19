# Research: agent environment setup

- Status: completed with a bounded sample
- Date: 2026-07-19
- Topic: how practitioners configure AI coding agents and the environment around them
- Method: YouTube Data API v3 search and video statistics through the configured local YouTube MCP; caption retrieval through the connected YouTube research tool; product facts checked against official Codex documentation.

## MCP verification

The local server at `tools/youtube-research-mcp/` completed a live API smoke test on 2026-07-19. The server can search public videos through YouTube Data API v3 without storing a key in this repository. This research then used the same enabled API-backed search capability.

The search and statistics calls succeeded. Caption extraction was attempted for the selected videos, including results marked by YouTube search as captioned, but the transcript endpoint reported that no caption tracks were available. This note does not infer spoken content from titles or descriptions, and it does not use scraping or any access-control bypass.

## Bounded sample

Searches run on 2026-07-19:

1. `Codex agent environment setup AI coding agent workflow`, sorted by view count.
2. `настройка AI агентов окружение MCP Codex`, sorted by view count, region `RU`.
3. `Codex setup AGENTS.md MCP skills` and `AI coding agent workflow setup MCP skills`, filtered for captioned results.

The table is a reproducible discovery sample, not a claim to represent every YouTube video. View and engagement values are snapshots from the API on the research date.

| Video | Channel | Published | Views | Why it is in the sample |
| --- | --- | ---: | ---: | --- |
| [Intro to Agent Builder](https://www.youtube.com/watch?v=44eFf-tRiSg) | OpenAI | 2025-10-06 | 1,716,596 | Official overview of an agent-workflow builder. |
| [You've Been Using AI the Hard Way (Use This Instead)](https://www.youtube.com/watch?v=MsQACpcuTkU) | NetworkChuck | 2025-10-28 | 2,101,329 | High-reach practitioner workflow perspective. |
| [Cursor AI: полный гайд по вайб-кодингу (настройки, фишки, rules, MCP)](https://www.youtube.com/watch?v=eXp8TC0Sm6o) | Олег Стефанов | 2025-07-05 | 360,853 | Russian-language configuration example covering rules and MCP. |
| [Cursor AI: Полный гайд по вайбкодингу с нуля. Subagents, Hooks, Skills, Rules, Commands, MCP](https://www.youtube.com/watch?v=qVY52uUixbM) | Alexey Andreevsky | 2026-02-08 | 101,298 | Russian-language cross-client example of the same configuration concepts. |
| [Codex: ПОЛНЫЙ ГАЙД 2026](https://www.youtube.com/watch?v=h4b5FwztscA) | Матвей Шульга | 2026-04-03 | 82,616 | Codex-specific practitioner guide. |
| [Automate tasks with the Codex app](https://www.youtube.com/watch?v=xHnlzAPD9QI) | OpenAI | 2026-02-03 | not collected | Official Codex automation example. |
| [Agent Skills or MCP in the era of Claude Code?](https://www.youtube.com/watch?v=pvxNcQTcIy4) | Confluent Developer | 2026-03-10 | not collected | Direct discussion of the boundary between skills and MCP. |
| [How to build an AI Agent and MCP Server (step-by-step)](https://www.youtube.com/watch?v=wBnnA8aIxUs) | Google Cloud Tech | 2026-06-18 | not collected | Official vendor example of an agent/MCP integration. |

## What the sample supports

These are discovery observations only: the repeated vocabulary across independently published titles and descriptions is `rules`, `skills`, `MCP`, `subagents`, `hooks`, `commands`, and `automations`. It supports using separate, explicit layers for durable instructions, reusable workflows, and integrations rather than a single giant prompt. It does not prove that any particular third-party configuration is correct or portable.

## Extracted overview from public video metadata

This is a concise review of authors' public descriptions and chapter lists returned by the local MCP. It is not a reconstruction of spoken content: the selected records report `caption: false` or the authorized transcript tool could not access their caption track.

### 1. [OpenAI Codex Tutorial #6 - Using the AGENTS.md file](https://www.youtube.com/watch?v=NlNuoH5PPl4)

- Source: Net Ninja, 2025-10-04, 4m45s, 52,063 views at collection time.
- Extracted program: the series positions `AGENTS.md` alongside Codex Cloud, the local CLI, and the IDE extension; the description links to the official Codex docs and the `agents.md` convention.
- Practical takeaway: instructions are a first-class part of the environment and should be stored as a file, not repeated manually in every chat.

### 2. [OpenAI Adds Agent Skills to Codex](https://www.youtube.com/watch?v=MsJzacfjzp8)

- Source: JeredBlu, 2025-12-22, 6m41s, 24,942 views.
- Extracted chapters: skills overview, installing a skill from GitHub, transferring an existing skill, creating a skills folder, and running a transferred skill.
- Practical takeaway: reusable procedures belong in versioned skill files; portability is stronger when the procedure is kept separate from client-specific connection settings. The claim that skills transfer without changes is the author's claim and must not be treated as a universal guarantee.

### 3. [AI Coding Agents Advanced Guide](https://www.youtube.com/watch?v=DAaw7Ao_zUc)

- Source: pookie, 2026-01-23, 1h09m51s, 8,422 views.
- Extracted chapters: rules (`AGENTS.md`/`CLAUDE.md`), slash commands, skills, primary agent and subagents, MCP, LSP, and hooks.
- Practical takeaway: these are different layers with different jobs. Global rules guide behavior; commands and skills package repeatable workflows; MCP connects external capabilities; hooks and LSP are client/runtime integrations. Do not merge them into one unstructured configuration file.

### 4. [Codex: ПОЛНЫЙ ГАЙД 2026](https://www.youtube.com/watch?v=h4b5FwztscA)

- Source: Матвей Шульга, 2026-04-03, 1h23m14s, 82,616 views.
- Extracted chapters: permissions, planning, `AGENTS.md`, `PLANS.md`, MCP, skills, plugins, subagents, worktrees, Git, automations, and hooks.
- Practical takeaway: a workable Codex environment needs both configuration and an operating loop: plan the task, keep instructions near the work, isolate parallel changes with worktrees when appropriate, and preserve decisions in Git.

### 5. [Cursor AI: Полный гайд по вайбкодингу](https://www.youtube.com/watch?v=qVY52uUixbM)

- Source: Alexey Andreevsky, 2026-02-08, 2h43m21s, 101,298 views.
- Extracted chapters: agent modes, context handling, Git, privacy settings, documentation for agents, commands, rules, subagents, skills, hooks, MCP, and orchestration.
- Practical takeaway: the same separation of concerns appears outside Codex. This supports keeping the repository's canonical policy and skill content client-neutral, with small client adapters only where configuration formats differ.

## Short conclusion

The recurring operational pattern is clear: do not try to make one huge prompt do every job. Keep stable behavior in `AGENTS.md`, repeatable procedures in `skills/`, service connections in MCP configuration, and project/task context in versioned Markdown. The current repository already implements that pattern and adds an explicit export/import mechanism through Git and the bootstrap scripts.

## Confirmed implementation guidance

Official Codex documentation confirms the parts that are actionable for this workspace:

- Global guidance can live in `~/.codex/AGENTS.md`, while project-specific `AGENTS.md` files add closer instructions. The bootstrap script in this repository installs only its managed global block and preserves other text.
- Global reusable skills can be discovered from `$HOME/.agents/skills`. This repository links its versioned skills into that location.
- Local MCP server definitions belong in `~/.codex/config.toml`; secrets should be referenced through environment-variable names rather than committed. The YouTube entry uses `YOUTUBE_API_KEY` as an environment variable and the key is not stored in Git.
- Git is the practical export/import layer: clone the repository, run the bootstrap script, and keep changes reviewable through commits and pull requests.

Primary reference: [Codex manual: customization, skills, rules, MCP, and integrations](https://developers.openai.com/codex/codex-manual.md).

## Decision for this repository

The current architecture matches the portable pattern suggested by the sample and supported by Codex documentation:

1. `AGENTS.md` managed block: concise global operating rules.
2. `skills/`: reusable, versioned procedures.
3. `mcp/servers.yaml` and local config: opt-in integrations with no secrets in Git.
4. `work/`: active task cards and next steps.
5. `knowledge/`: bounded research notes with sources and limitations.

Keep client-specific adapters small. Do not make the global layer depend on an individual IDE's proprietary file format.

## Limitation and follow-up

No selected video exposed a transcript to the permitted transcript tool at research time, even when the YouTube metadata field reported captions. A future pass may analyze only videos whose captions are actually available through the authorized tool, then append timestamped evidence here. Do not treat this note as a transcript-based review of the videos.
