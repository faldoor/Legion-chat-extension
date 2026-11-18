<div align="center">

<img src="docs/hero.png" width="100%" alt="Панель «Переливание ника» поверх чата Legion">

<br>

# Легион — Аддон для чата (colors)

Ники в чате переливаются всеми цветами: свой настраивается в панели,<br>
чужие приходят из общего списка.

<a href="https://raw.githubusercontent.com/faldoor/Legion-chat-extension/refs/tags/v1.11.0/legion-chat.user.js">
  <img src="https://img.shields.io/badge/install-tampermonkey-9A3324?style=for-the-badge" alt="Установить в Tampermonkey">
</a>
&nbsp;
<img src="https://img.shields.io/badge/version-1.11.0-1A1712?style=for-the-badge" alt="Версия 1.11.0">
&nbsp;
<img src="https://img.shields.io/badge/paints-40-9A3324?style=for-the-badge" alt="40 красок">

</div>

<br>

<table>
<tr>
<td align="center" width="33%"><h3>40 красок</h3><sub>у каждой своя траектория перелива</sub></td>
<td align="center" width="33%"><h3>Свой стиль</h3><sub>скорость, свечение, блик, @упоминания</sub></td>
<td align="center" width="33%"><img src="docs/bubble.png" width="52" alt="Кнопка-котик"><h3>Не мешает</h3><sub>сворачивается в кнопку-котика</sub></td>
</tr>
</table>

<img src="docs/paints.png" width="100%" alt="Палитра: 40 красок с названиями">

## Поставить

1. Поставь [Tampermonkey](https://www.tampermonkey.net/).
2. Скачай [`legion-chat.user.js`](https://raw.githubusercontent.com/faldoor/Legion-chat-extension/refs/tags/v1.11.0/legion-chat.user.js) и закинь в Dashboard TamperMonkey.
3. Нажми **Install**.

Панель — «формуляр»: краска, скорость, свечение, три галочки и поле «чей ник переливается». В чат ничего не отправляется, всё работает в браузере.

<details>
<summary>Ещё</summary>

- Краски по никам: [`paints.json`](paints.json)
- Проверки интерфейса: [`tests/shimmer-ui.html`](tests/shimmer-ui.html) — 37 проверок, открывается в браузере
- Витрина для скриншотов: [`docs/demo.html`](docs/demo.html)

</details>
