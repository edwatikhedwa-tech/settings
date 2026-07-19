# Architecture

## Концепция

`policies/` является каноническим набором правил. `skills/` содержит переиспользуемые workflows. `mcp/servers.yaml` описывает MCP-серверы независимо от клиента. `scripts/build-configs.py` генерирует клиентские артефакты в `generated/`.

`work/` и `knowledge/` - канонические версии длительных задач и накопленных выводов. Они хранятся рядом с конфигурацией, поэтому экспортируются, ревизуются и восстанавливаются тем же Git-репозиторием.

## Поток данных

```mermaid
flowchart LR
  P["policies/"] --> G["build-configs.py"]
  S["skills/"] --> G
  M["mcp/servers.yaml"] --> A["client adapters"]
  G --> C["generated/codex"]
  G --> L["generated/claude-code"]
  G --> H["generated/chatgpt"]
```

## Безопасность

Секреты не хранятся в Git. Скрипты показывают план, поддерживают dry-run и делают backup перед изменениями.
