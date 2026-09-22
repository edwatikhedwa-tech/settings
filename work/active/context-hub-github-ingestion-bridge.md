# Context Hub GitHub ingestion bridge

- Status: active
- Started: 2026-09-22
- Last updated: 2026-09-22

## Goal

Обеспечить доставку сообщений от ChatGPT/Codex в Personal Context Hub через GitHub, когда MCP Hub недоступен в исходной сессии.

## Current State

- Транспортная очередь определена в `work/inbox/context-hub/pending/`.
- Протокол описан в `work/inbox/context-hub/README.md`.
- Первое сообщение о `video-shotcraft` и Skill Routing помещено в очередь со статусом `pending`.

## Decisions

- GitHub используется как очередь доставки, а не как каноническая память.
- Context Hub остаётся источником истины после подтверждённого импорта.
- Дедупликация выполняется по `event_id`.
- Успех нельзя заявлять до повторного поиска записи в Hub и фиксации receipt.

## Next Action

Агенту с подключённым MCP Personal Context Hub обработать все сообщения из `work/inbox/context-hub/pending/`, проверить сохранение поиском и зафиксировать receipt.

## References

- `work/inbox/context-hub/README.md`
- `work/inbox/context-hub/pending/2026-09-22T16-34-01Z--video-shotcraft-skill-routing.md`
