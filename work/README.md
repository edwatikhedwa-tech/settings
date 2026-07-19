# Work Log

`work/active/` хранит открытые задачи. Каждая карточка отвечает на четыре вопроса: что делаем, где находимся, что решили и какой следующий шаг.

Создать карточку:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\new-task.ps1 -Slug codex-setup-research -Title "Research Codex setup"
```

После завершения перемести карточку в `work/done/`. Git хранит историю обсуждений и решений; не добавляй в неё секреты или личные данные, которые не должны быть в публичном репозитории.
