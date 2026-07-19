# YouTube Research Capture

Бесплатное локальное расширение для передачи в `topic-research` текста, который пользователь уже получил в YouTube Summary или открыл в YouTube.

## Что делает

- Получает текст только по явному нажатию пользователя.
- Принимает текст из буфера после `Copy Transcript` в YouTube Summary, в том числе когда публичная панель субтитров YouTube недоступна.
- Может сохранить текст из уже открытой панели расшифровки YouTube.
- Передаёт данные только на `http://127.0.0.1:8765`.
- Сохраняет исходный текст в `private/research-cache/youtube-captures/`, который исключён из Git.

## Однократная установка

1. В Chrome откройте `chrome://extensions`.
2. Включите `Developer mode`.
3. Нажмите `Load unpacked` и выберите эту папку: `extensions/youtube-research-capture`.

## Использование

1. Приёмник уже запускается командой `scripts/start-youtube-capture.ps1 -Apply`.
2. На странице ролика в YouTube Summary нажмите `Copy Transcript`.
3. Нажмите значок `YouTube Research Capture` и выберите `Забрать текст из буфера`.
4. В Codex запустите или продолжите `topic-research`; он использует `youtube_capture_latest` для анализа сохранённого текста.

Расширение не получает cookies, пароли, токены, закрытые субтитры, список вкладок или данные других сайтов. Оно не обходит CAPTCHA, авторизацию, лимиты или платные функции YouTube Summary.
