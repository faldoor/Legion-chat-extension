# Легион — Гильдийское расширение

Userscript для чата Legion Game:

- 20 анимированных переливашек ника;
- общий список ников и красок через Supabase Realtime;
- сворачиваемая круглая кнопка;
- перетаскиваемая панель с сохранением позиции;
- автоматические обновления через Tampermonkey.
- общий инструмент «Распределение лута» с серверными роллами, таймером и журналом.

## Установка

1. Установить [Tampermonkey](https://www.tampermonkey.net/).
2. Открыть raw-файл userscript:
   <https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.9.0/legion-guild.user.js>
3. Нажать **Install**.

Стили работают только у пользователей, у которых установлен этот userscript.

## Общий список

Файл [`paints.json`](./paints.json) содержит соответствия `ник → id краски`:

```json
{
  "faldoorch": "aurora",
  "другой_ник": "cyber"
}
```

После изменения файла и публикации в `main` пользователям достаточно обновить страницу. Скрипт периодически обновляет список и хранит последний успешный вариант в кэше.

Выбор краски каждого участника синхронизируется отдельно через Supabase: свой ник получает локальную краску, а остальные участники — только свою опубликованную краску. Realtime применяется сразу; резервная проверка выполняется примерно раз в 5 секунд.

Доступные id красок находятся в меню расширения: `aurora`, `rainbow`, `holo`, `sunset`, `gold`, `cyber`, `candy`, `ice`, `mint`, `ocean`, `sakura`, `lava`, `matrix`, `toxic`, `fire`, `emerald`, `chrome`, `lavender`, `tropical`, `cosmos`.

## Распределение лута

Кнопка **«Распределение лута»** открывает общий экран предмета, редкости,
таймера, анонса и журнала. Ролл создаётся на Supabase Edge Function и
проверяется сервером: один пользователь может бросить только один раз, а после
истечения таймера новые роллы отклоняются. Анонс показывается только в UI
userscript и не отправляется в игровой чат.

Управление раундами доступно только владельцу после Twitch OAuth. Twitch secret,
Supabase service-role key и immutable Twitch owner ID хранятся только в secrets
Supabase; в userscript они отсутствуют. Исходник миграции и функции находится в
[`supabase/`](./supabase/) и [`docs/superpowers/specs/2026-11-16-loot-roll-design.md`](./docs/superpowers/specs/2026-11-16-loot-roll-design.md).

Перед production rollout необходимо применить миграцию, задеплоить функцию
`loot` и задать secrets `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`TWITCH_OWNER_USER_ID`, `LOOT_CALLBACK_URL` и `SUPABASE_SERVICE_ROLE_KEY`.
