# Architecture

## Концепция

`policies/` является каноническим набором правил. `skills/` содержит переиспользуемые workflows. `mcp/servers.yaml` описывает MCP-серверы независимо от клиента. `scripts/build-configs.py` генерирует клиентские артефакты в `generated/`.

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
