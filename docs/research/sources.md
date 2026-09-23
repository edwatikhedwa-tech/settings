# Sources

Дата доступа: 2026-07-18.

| Область | Источник | Проверено | Вывод |
| --- | --- | --- | --- |
| Codex | OpenAI Codex Manual, получен через `fetch-codex-manual.mjs` из `https://developers.openai.com/codex/codex-manual.md` | Да | Подтверждены `AGENTS.md`, `~/.codex/config.toml`, `.codex/config.toml`, hooks, MCP как поверхности Codex. |
| Codex | OpenAI Codex Manual, разделы про `AGENTS.md` и config | Да | `AGENTS.md` может быть глобальным в `~/.codex`, репозиторным и вложенным; более близкий файл имеет приоритет. |
| Claude Code | Anthropic Claude Code CLI reference, `https://docs.anthropic.com/en/docs/claude-code/cli-usage` | Да | Подтверждены CLI, `claude mcp`, `--settings`, `--mcp-config`, `--strict-mcp-config`. |
| Claude Code | Claude Code settings, `https://code.claude.com/docs/en/settings` | Да | Подтверждены settings JSON и настройки MCP из `.mcp.json`. |
| Claude Code | Claude Code MCP docs, `https://code.claude.com/docs/en/mcp` | Да | Подтверждено добавление MCP через `claude mcp add` и OAuth через `/mcp`. |
| MCP | Model Context Protocol transports, `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports` | Да | Подтверждены стандартные транспорты `stdio` и Streamable HTTP, JSON-RPC и UTF-8. |
| Glasp | Glasp MCP Connector, `https://glasp.co/mcp` | Да | MCP использует OAuth и заявлен как read-only доступ к пользовательской библиотеке highlights и memories; массовое создание расшифровок новых URL не документировано. |
| Glasp | YouTube Summary, `https://glasp.co/youtube-summary` | Да | Сервис заявляет доступ к расшифровкам, сводкам, таймкодам и копированию текста, если они доступны; результат должен отмечать фактический статус содержания. |
| ChatGPT | OpenAI Help Center: Projects in ChatGPT | Да | Подтверждены файлы и инструкции проекта; инструкции проекта действуют внутри проекта. |
| ChatGPT | OpenAI Help Center: Custom Instructions | Да | Подтверждены пользовательские инструкции во всех новых чатах; нет подтверждения автоматической загрузки правил из GitHub в обычный новый чат. |
| ChatGPT | OpenAI Help Center: Apps in ChatGPT | Да | Подтверждены apps/connectors и OAuth; пользователь подключает приложения вручную. |

## Не проверено

- Наличие `git` и `gh` в текущем PATH: команды не найдены.
- Авторизация GitHub CLI: не проверена, потому что `gh` не найден.
- Реальная установка Codex и Claude Code на этой машине: команды не найдены в текущем PATH.
