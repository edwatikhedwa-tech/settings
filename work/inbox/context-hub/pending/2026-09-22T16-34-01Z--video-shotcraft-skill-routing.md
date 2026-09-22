---
event_id: chatgpt-20260922-video-shotcraft-skill-routing-v1
created_at: 2026-09-22T16:34:01Z
producer: chatgpt-codex
target: personal-context-hub
record_type: idea
status: pending
project: personal-context-hub
tags:
  - skill-routing
  - tool-registry
  - video-production
  - video-shotcraft
source_url: https://github.com/Vincentwei1021/video-shotcraft
---

# Идея: Skill Routing для специализированных задач

Добавить в Personal Context Hub каталог доступных skills и механизм **Skill Routing** — автоматический выбор подходящего специализированного навыка по намерению пользователя.

Первый практический кейс: `video-shotcraft`.

Когда пользователь просит создать product demo, проморолик или видео интерфейса, Hub должен распознать намерение `video_production` и рекомендовать или подключить `video-shotcraft`, вместо того чтобы агент заново придумывал процесс производства видео.

## Предлагаемый маршрут

`user request → intent detection → Context Hub → skill router → video-shotcraft → agent → Remotion → video`

## Минимальная карточка skill

- `name`: `video-shotcraft`
- `source`: `Vincentwei1021/video-shotcraft`
- `capabilities`: product video, promo, UI demo, cinematic motion
- `runtime`: Node.js + Remotion
- `compatible_agents`: Claude Code, Codex, Antigravity
- `triggers`: запросы на создание product demo, promo или UI video
- `project_access_required`: true
- `status`: candidate

## Более общий принцип

Context Hub должен хранить не только знания о пользователе и проектах, но и знания о способах выполнения задач: какой инструмент, skill или агент лучше подходит для конкретного типа работы.

## Требуемое действие MCP-агента

1. Сохранить эту идею в Hub с сохранением `event_id`, источника и provenance.
2. Не считать `video-shotcraft` автоматически одобренным: статус остаётся `candidate` до проверки безопасности, зависимостей, лицензии и качества результата.
3. Проверить, что запись находится поиском по `event_id` и `video-shotcraft`.
4. Записать receipt с Hub record ID и только после этого отметить сообщение обработанным.
