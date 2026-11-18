# Легион — Гильдейское расширение

Userscript для чата Legion Game:

- 40 уникальных анимированных переливашек ника;
- общий список ников и красок через Supabase Realtime;
- сворачиваемая кнопка-котик;
- перетаскиваемая панель с сохранением позиции;
- автоматические обновления через Tampermonkey.

## Установка

1. Установить [Tampermonkey](https://www.tampermonkey.net/).
2. Открыть raw-файл userscript:
   <https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.10.0/legion-guild.user.js>
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

Выбор краски каждого участника синхронизируется отдельно через Supabase: свой ник получает локальную краску, а остальные участники — только свою опубликованную краску. Список обновляется через разрешённые HTTP-запросы примерно раз в 5 секунд и включён всегда.

Доступные id красок: `aurora`, `rainbow`, `holo`, `sunset`, `gold`, `cyber`, `candy`, `ice`, `mint`, `ocean`, `sakura`, `lava`, `matrix`, `toxic`, `fire`, `emerald`, `chrome`, `lavender`, `tropical`, `cosmos`, `neon`, `peach`, `rose`, `steel`, `copper`, `sky`, `forest`, `sand`, `violet`, `ruby`, `amber`, `graphite`, `gum`, `lagoon`, `plasma`, `honey`, `storm`, `cotton`, `jade`, `dusk`.

## Тесты

`tests/shimmer-ui.html` — автономный харнесс: подменяет `GM_getValue`/`GM_setValue` и `WebSocket`, отключает сеть и печатает список проверок. Открывается напрямую в браузере; `?bubble=1` показывает свёрнутую кнопку.
