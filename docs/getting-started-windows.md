# Быстрый старт на Windows

## Что я делаю

Ты клонируешь приватный репозиторий и запускаешь PowerShell-команду, которая сначала покажет план.

## Безопасная первая команда

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1 -Plan
```

Эта команда ничего не меняет. Она только показывает, что будет сделано.

## Применить изменения

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1 -Apply
```

Перед записью файла скрипт делает резервную копию.

## Проверить состояние

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

## Отменить управляемые изменения

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 -DryRun
```

Если план выглядит правильно:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 -Apply
```
