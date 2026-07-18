# Codex Adapter

Подтверждено официальным Codex manual:

- `AGENTS.md` используется для устойчивых инструкций.
- Пользовательский config расположен в `~/.codex/config.toml`.
- Проектный config может жить в `.codex/config.toml` внутри доверенного проекта.
- Project-local hooks и `.codex/config.toml` загружаются только для доверенных проектов.

Этот адаптер генерирует `generated/codex/instructions.md` и пример `generated/codex/config.toml`.
