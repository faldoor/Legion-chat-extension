# Распределение лута — дизайн

## Цель

Добавить в userscript общий мини-инструмент разролла лута: владелец создаёт
предмет и таймер, участники делают по одному серверному ролику, а все
установившие скрипт видят актуальный предмет, таймер, результаты и анонс.

## Что входит

- Кнопка «Распределение лута» в меню userscript.
- Окно с текущим предметом, редкостью, оставшимся временем, кнопкой «Роллить»,
  собственным результатом и журналом участников.
- Владелец `faldoorch` видит `+`, настройки таймера и очистку журнала.
- Форма добавления предмета: название, редкость (`серая`, `необычная`,
  `редкая`, `эпическая`, `легендарная`, `мифическая`) и длительность.
- Один ролл на пользователя для одного раунда; ролл генерируется сервером.
- Анонс в интерфейсе Legion с названием и редкостью предмета.
- Supabase Realtime с polling fallback примерно раз в 5 секунд.

## Не входит

- Отправка сообщения в настоящий игровой чат: userscript не должен подделывать
  сообщения или зависеть от внутреннего API игры.
- Хранение Twitch secret, service-role key или owner-токенов в userscript.
- Клиентская проверка имени `faldoorch` как единственная защита.

## Безопасность и права

Twitch OAuth выполняется через Supabase Edge Function. Twitch Client Secret
хранится только в secrets Edge Function. Владелец определяется по неизменяемому
Twitch user ID, настроенному сервером, а не по отображаемому имени.

Userscript использует обычную Supabase anonymous session для чтения состояния и
ролла. Edge Function проверяет bearer JWT через Supabase Auth, сама генерирует
криптографически случайное число ролла и атомарно отклоняет повторный ролл.

Действия владельца (создание раунда, завершение раунда, очистка журнала)
доступны только после Twitch OAuth. После callback сервер выдаёт короткоживущий
одноразовый код; userscript обменивает его на непрозрачный owner token. Token
хранится только в локальном хранилище владельца и проверяется Edge Function.

## Модель данных

### `public.loot_rounds`

- `id uuid primary key`
- `item_name text not null`
- `rarity text not null`
- `duration_seconds integer not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `status text not null` (`active`, `finished`, `cancelled`)
- `created_at timestamptz not null`

Одновременно существует не более одного `active` раунда. Таблица доступна для
чтения authenticated-пользователям, запись выполняет только Edge Function.

### `public.loot_rolls`

- `id uuid primary key`
- `round_id uuid references loot_rounds(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `nick text not null`
- `roll integer not null` (`1..100`)
- `created_at timestamptz not null`
- unique `(round_id, user_id)`

Результаты доступны для чтения authenticated-пользователям. Прямые insert,
update и delete запрещены RLS; запись и очистка идут только через Edge Function.

## Жизненный цикл

1. Владелец открывает окно и нажимает `+`.
2. Edge Function проверяет owner token, завершает старый active-раунд при
   необходимости и создаёт новый раунд.
3. Userscript получает раунд через Realtime/REST и показывает анонс:
   `ВНИМАНИЕ ЛЕГИОН! На разролле предмет «...», редкость: ... Кидайте свой
   ролл на удачу.`
4. Участник нажимает «Роллить». Edge Function проверяет сессию, активность
   таймера и отсутствие предыдущего ролла, затем создаёт результат `1..100`.
5. Realtime обновляет журнал во всех открытых вкладках. После `ends_at` кнопка
   блокируется, а раунд отображается как завершённый.
6. Владелец может очистить журнал завершённого или текущего раунда через
   серверный endpoint; действие не удаляет историю раундов.

## UI

Окно остаётся частью существующего Shadow DOM и использует его текущие тёмные
токены, радиусы и типографику. Основной акцент — одна большая кнопка «Роллить».
Редкость дополнительно обозначается текстом и цветной меткой, но не только
цветом. Для узких экранов окно занимает `calc(100vw - 20px)` и не допускает
горизонтальный overflow.

Состояния: нет активного лута, загрузка, активный таймер, уже роллил, время
истекло, ошибка сети и отсутствие owner-доступа. Клавиша Escape закрывает
вложенное окно; интерактивные элементы получают `focus-visible`.

## Серверные endpoints Edge Function

- `GET /twitch/start` — создаёт OAuth state и возвращает Twitch authorize URL.
- `GET /twitch/callback` — проверяет state и Twitch user ID, создаёт одноразовый
  code и редиректит на callback userscript.
- `POST /owner/exchange` — меняет code на owner token.
- `GET /loot/state` — возвращает active/latest round и rolls.
- `POST /loot/round` — owner-only создание раунда.
- `POST /loot/round/finish` — owner-only досрочное завершение.
- `POST /loot/roll` — authenticated user, серверный roll и unique guard.
- `POST /loot/clear` — owner-only очистка rolls текущего раунда.

## Публикация

Репозиторий будет содержать SQL migration и исходник Edge Function без секретов.
Перед рабочим rollout владелец должен задать в Supabase secrets:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_OWNER_USER_ID`
- `LOOT_CALLBACK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Значения секретов не коммитятся и не попадают в userscript.
