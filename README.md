<div align="center">

<img src="docs/hero.png" width="100%" alt="Панель «Переливание ника» поверх чата Legion">

<br>

# Легион — Аддон для чата (colors)

Ники в чате переливаются всеми цветами: свой настраивается в панели,<br>
чужие приходят из общего списка.

<a href="https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.10.1/legion-guild.user.js">
  <img src="https://img.shields.io/badge/install-tampermonkey-9A3324?style=for-the-badge&logo=tampermonkey&logoColor=F4EFE2" alt="Установить в Tampermonkey">
</a>
&nbsp;
<img src="https://img.shields.io/badge/version-1.10.1-1A1712?style=for-the-badge" alt="Версия 1.10.1">
&nbsp;
<img src="https://img.shields.io/badge/paints-40-9A3324?style=for-the-badge" alt="40 красок">

</div>

<br>

<table>
<tr>
<td align="center" width="33%"><h3>40 красок</h3><sub>у каждой своя траектория перелива</sub></td>
<td align="center" width="33%"><h3>Свой стиль</h3><sub>скорость, свечение, блик, @упоминания</sub></td>
<td align="center" width="33%"><h3>Не мешает</h3><sub>сворачивается в кнопку-котика</sub></td>
</tr>
</table>

<img src="docs/paints.png" width="100%" alt="Палитра: 40 красок с названиями">

## Поставить

1. Поставь [Tampermonkey](https://www.tampermonkey.net/).
2. Открой [`legion-guild.user.js`](https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.10.1/legion-guild.user.js).
3. Нажми **Install**.

<img src="docs/bubble.png" width="64" align="right" alt="Кнопка-котик">

Панель — «формуляр»: краска, скорость, свечение, три галочки и поле «чей ник
переливается». Ничего не отправляется в чат, всё работает локально и в браузере.

<br clear="all">

<details>
<summary>Ещё</summary>

- Список красок гильдии: [`paints.json`](paints.json)
- Проверки интерфейса: [`tests/shimmer-ui.html`](tests/shimmer-ui.html) — 37 проверок, открывается в браузере
- Витрина для скриншотов: [`docs/demo.html`](docs/demo.html)

</details>
