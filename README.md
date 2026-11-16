# Легион — Гильдийское расширение

Userscript для чата Legion Game:

- 20 анимированных переливашек ника;
- общий список ников и красок через `paints.json`;
- сворачиваемая круглая кнопка;
- перетаскиваемая панель с сохранением позиции;
- автоматические обновления через Tampermonkey.

## Установка

1. Установить [Tampermonkey](https://www.tampermonkey.net/).
2. Открыть raw-файл userscript:
   <https://raw.githubusercontent.com/faldoor/legion-guild-extension/main/legion-guild.user.js>
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

Доступные id красок находятся в меню расширения: `aurora`, `rainbow`, `holo`, `sunset`, `gold`, `cyber`, `candy`, `ice`, `mint`, `ocean`, `sakura`, `lava`, `matrix`, `toxic`, `fire`, `emerald`, `chrome`, `lavender`, `tropical`, `cosmos`.
