---
name: code-verification
description: Проверять код фактическими тестами и честно фиксировать непроверенное.
---

# Code Verification

Запускай доступные тесты фактически. Не пиши «тесты пройдены», если они не запускались.

Минимум для этого репозитория:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-tests.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```
