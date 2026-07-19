# Agent Control Plane

## Что это

Это персональный центр управления настройками AI-агентов. Он хранит правила, skills, MCP-серверы, профили и инструкции в одном GitHub-репозитории. Из него можно восстановить рабочую среду после переустановки Windows. Скрипты сначала показывают план, делают резервные копии и только потом меняют управляемые файлы. Секреты в репозиторий не сохраняются.

Репозиторий также является вашей версионируемой рабочей памятью: `work/` хранит активные задачи и решения, а `knowledge/` - выжимки исследований. Они экспортируются вместе с репозиторием через GitHub, `git clone` или архив GitHub.

## Что я получу

- Канонические правила работы агентов в `policies/`.
- Отдельный compliance-слой: законность, приватность, ToS и запрет обхода защит.
- Skills в открытом формате `SKILL.md`.
- Декларативный реестр MCP в `mcp/servers.yaml`.
- Генерируемые инструкции для Codex, Claude Code и ручного использования в ChatGPT.
- Скрипты установки, обновления, диагностики и удаления.
- Тесты схем, dry-run, повторного запуска, Unicode-путей и отсутствия секретов в логах.

## Как установить на новом Windows-компьютере

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1 -Plan
```

После просмотра плана применить изменения:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1 -Apply
```

Эта команда добавляет только управляемый блок в глобальный `~/.codex/AGENTS.md` и создаёт ссылки на Skills в `~/.agents/skills`. Существующие чужие блоки и Skills не перезаписываются.

## Что произойдёт после запуска

1. Скрипт проверит Windows, PowerShell, GitHub CLI, Codex и Claude Code.
2. Соберёт генерируемые инструкции из общего ядра.
3. Покажет план изменений.
4. Перед записью сделает резервные копии существующих файлов.
5. Изменит только файлы и секции, помеченные как управляемые этим репозиторием.
6. Сообщит, где нужна ручная авторизация.

## Где потребуются мои действия

- Вход в GitHub для клонирования приватного репозитория.
- Вход в OpenAI/Codex, если Codex ещё не авторизован.
- Вход в Anthropic/Claude Code, если Claude Code ещё не авторизован.
- OAuth для удалённых MCP-серверов, если они будут добавлены.
- Ввод секретов только в безопасное хранилище или переменные окружения, не в Git.
- Подтверждение для действий, которые публикуют данные, меняют доступы или могут нарушить правила сервиса.

## Как проверить, что всё работает

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

## Как обновить

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1 -Plan
```

Чтобы получить изменения из GitHub, пересобрать инструкции и обновить глобальную установку:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1 -Apply -Pull
```

## Как удалить

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 -DryRun
```

## Что делать при ошибке

Открой `docs/troubleshooting.md`. Если ошибка связана с авторизацией, сначала запусти `doctor.ps1` и посмотри строки `[WARN]` и `[ERROR]`.

## Tasks And Knowledge

- Активные задачи: `work/active/`.
- Завершённые задачи: `work/done/`.
- Накопленные исследования: `knowledge/`, включая `knowledge/youtube/`.
- Видеоисследования: `docs/youtube-research.md` и навык `youtube-research`.

После создания ограниченного ключа YouTube Data API включи локальный MCP одной командой:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\enable-youtube-mcp.ps1 -Apply
```
