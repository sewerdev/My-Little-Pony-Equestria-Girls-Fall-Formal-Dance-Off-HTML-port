# Equestria Girls: Fall Formal Dance-Off – HTML5

<p align="center">
  <img src=<img width="2400" height="1080" alt="Screenshot_2026-08-21-00-42-42-104_com android chrome" src="https://github.com/user-attachments/assets/088d0394-dae2-4ae4-a6a8-5c14cbe5836a" alt="image" width="100%">
</p>

A browser port of the Flash game **My Little Pony: Equestria Girls – Fall Formal
Dance-Off** (BKOM Studios, 2013). Flash is dead, and the game died with it – so
it's been rebuilt from scratch: graphics, animation, and audio extracted from
the original `.swf` files, game logic rewritten from zero in plain JavaScript
on top of `<canvas>`.

No plugins, no build step, no dependencies. Runs great on phone and desktop
alike — optimized for pretty much anything you throw at it. Overall this
port turned out great, enjoy!

**Play it here:** <https://sewerdev.github.io/My-Little-Pony-Equestria-Girls-Fall-Formal-Dance-Off-HTML-port>

---

## What's inside

- **Two modes.** "Repeat the Dance" – watch a six-move sequence and reproduce
  it from memory, one star per correct move. "Freestyle" – open choreography,
  no scoring.
- **6 dancers, 4 tracks** – Disco, Techno, Rock, Country.
- **Photo mode.** Snap up to five photos during a performance; they land in
  the yearbook on the results screen. The back arrow leaves a performance at
  any point, mid-dance included, and hands you back the routine you built.
- **Russian and English**, switchable on the fly in settings.
- **Widescreen**, from 4:3 all the way to 21:9, with even scaling – no
  letterboxing, no stretching. The stage is anchored to the floor line, so the
  dancers stand on the dance floor on any screen shape instead of hovering
  above it.
- **Settings** – separate music/SFX volume, language choice. Everything
  persists in `localStorage`.

## Controls

Mouse or touch for everything. Plus:

| Key | Action |
|---|---|
| `F` | fullscreen |
| `M` | mute |
| `W` | toggle 4:3 / widescreen |
| `Esc` | close rules/settings dialog |

## Structure

```
index.html      page shell
style.css       layout and font loading
data.js         extracted scene graph: sprite registration points,
                per-frame curtain animation matrices, atlas descriptions
game.js         engine: rendering, screens, dance sequencer, audio, input
assets/anim/    42 sprite atlases (6 dancers × 7 moves × 60 frames)
assets/ui/      backgrounds, curtain, buttons, cards, move icons
assets/audio/   4 tracks and sound effects
assets/img/     logos
```

## How it was made

The original is `main.swf` (an ActionScript 3 framework), `game.swf` (all UI
and audio), and one `.swf` per dancer.

**Logic.** Decompiled the AS3 to recover the rules: a sequence is always six
random moves separated by idle animation, each clip is exactly 60 frames at
24 fps, scoring compares your sequence slot by slot.

**Coordinates.** Sprite positions were pulled via SVG export: the decompiler
writes a top-level matrix that captures the registration point – exactly what
Flash uses to place a child object. That made it possible to rebuild every
screen from the original coordinates instead of eyeballing it, including the
90-frame curtain-opening animation.

**Upscaling.** The source art is vector, so this isn't interpolation: every
frame is re-exported to SVG and rasterized at double scale. Scene backgrounds
also finally use the full 1600px bitmap resolution, which the Flash build
squeezed down to 800×600.

**Widescreen.** The naive approach – scaling the backdrop by the view width –
falls apart on a phone: at 20:9 that's a 1.67x zoom, which drags the floor
down, throws the crowd halfway up the screen, and leaves the dancers dancing
on thin air. So the stage is treated as a place rather than a picture. The
widening zooms the world about the line the dancers stand on, by the smallest
factor that still lets the backdrop touch both edges – roughly 1.17x at 20:9 –
and backdrop, light overlay, crowd and dancers all share that one transform.
The floor never moves under anyone's feet. The crowd is a single strip, too
narrow to reach the edges on its own, so it's repeated sideways with every
other copy mirrored: the copies meet without a seam, and the finished row is
composed once into an offscreen canvas, so it still costs one draw call per
frame.

**Optimization.** Atlases are cropped to visible pixels, duplicate frames are
deduplicated, everything is sized to actual render dimensions.

**Audio.** Original effects were 11kHz / 16kbit/s mono. Remastered at 44.1kHz
and normalized to EBU R128 so clicks don't drown out the music.

**Rasterization leftovers.** `crowd.webp` came out of the SVG pass with a
one-pixel semi-transparent dark rim along its top edge. At 4:3 it hid inside
the artwork; magnified in a wide view it turned into a black line straight
across the middle of the screen. The rim is cleared in the shipped asset.

## Author

- Telegram – [@VestronVulture](https://t.me/VestronVulture)
- GitHub – [sewerdev](https://github.com/sewerdev/)

## Legal

My Little Pony, Equestria Girls, and all related art, characters, and music
belong to Hasbro; the original game was developed by BKOM Studios. This is an
unofficial fan port made to preserve a game that would otherwise be
unplayable. Not affiliated with or endorsed by Hasbro. Not for commercial
distribution. And for the record – copyright law can go to hell.

---

<details>
  
# Русский

# Equestria Girls: Fall Formal Dance-Off – HTML5

<p align="center">
  <img src=<img width="2400" height="1080" alt="Screenshot_2026-08-21-00-42-42-104_com android chrome" src="https://github.com/user-attachments/assets/088d0394-dae2-4ae4-a6a8-5c14cbe5836a" alt="image" width="100%">
</p>

Браузерный порт флеш-игры **My Little Pony: Equestria Girls – Fall Formal
Dance-Off** (BKOM Studios, 2013). Flash умер, игра вместе с ним – поэтому она
собрана заново: графика, анимация и звук извлечены из оригинальных `.swf`,
игровая логика написана с нуля на чистом JavaScript поверх `<canvas>`.

Без плагинов, без сборки, без зависимостей. Работает отлично что на телефоне,
что на компе — оптимизировано под всё, что только можно. В целом порт
получился супер, играйте на здоровье!

**Играть здесь:** <https://sewerdev.github.io/My-Little-Pony-Equestria-Girls-Fall-Formal-Dance-Off-HTML-port>

---

## Что внутри

- **Два режима.** «Повтори танец» – посмотреть связку из шести движений и
  собрать её по памяти, по звезде за каждое угаданное. «Свой танец» –
  свободная хореография без проверки.
- **6 танцовщиц, 4 трека** – Disco, Techno, Rock, Country.
- **Фотосъёмка.** Во время выступления можно сделать до пяти снимков, они
  попадают в школьный альбом на экране результатов. Стрелка «назад» выходит
  с выступления в любой момент, хоть посреди танца, и возвращает собранную
  связку на место.
- **Русский и английский**, переключаются в настройках на лету.
- **Широкий экран**, от 4:3 до 21:9, с равномерным масштабированием – без
  чёрных полос и без растянутой картинки. Сцена привязана к линии пола, так
  что при любой форме экрана девочки стоят на танцполе, а не висят над ним.
- **Настройки** – раздельная громкость музыки и звуков, выбор языка. Всё
  сохраняется в `localStorage`.

## Управление

Всё делается мышью или пальцем. Дополнительно:

| Клавиша | Действие |
|---|---|
| `F` | полноэкранный режим |
| `M` | выключить звук |
| `W` | переключить 4:3 / широкий экран |
| `Esc` | закрыть окно правил или настроек |

## Структура

```
index.html      каркас страницы
style.css       вёрстка и подключение шрифтов
data.js         извлечённый граф сцен: точки регистрации спрайтов,
                покадровые матрицы анимации занавеса, описания атласов
game.js         движок: рендер, экраны, секвенсор танца, звук, ввод
assets/anim/    42 спрайт-атласа (6 танцовщиц × 7 движений по 60 кадров)
assets/ui/      фоны, занавес, кнопки, карточки, иконки движений
assets/audio/   4 трека и звуковые эффекты
assets/img/     логотипы
```

## Как это сделано

Оригинал состоит из `main.swf` (фреймворк на ActionScript 3), `game.swf`
(весь интерфейс и звук) и по одному `.swf` на каждую танцовщицу.

**Логика.** AS3 декомпилирован, чтобы восстановить правила: связка – это
всегда шесть случайных движений, разделённых idle-анимацией; каждый клип
ровно 60 кадров при 24 fps; счёт сравнивает вашу последовательность слот в
слот.

**Координаты.** Позиции спрайтов вытащены через SVG-экспорт: декомпилятор
пишет матрицу верхнего уровня, которая фиксирует точку регистрации – ровно
то, чем Flash позиционирует дочерний объект. Это позволило собрать каждый
экран по исходным координатам, а не на глаз, включая 90-кадровую анимацию
открытия занавеса.

**Апскейл.** Исходная графика векторная, поэтому это не интерполяция: каждый
кадр экспортируется в SVG и растеризуется заново в двойном масштабе. Заодно
фоны сцены наконец используют полное разрешение битмапов 1600 px, которые
флеш-сборка ужимала до 800×600.

**Широкий экран.** Наивный способ – масштабировать задник по ширине вида –
на телефоне разваливается: на 20:9 это зум в 1.67 раза, пол уезжает вниз,
толпа лезет на середину экрана, а девочки танцуют в воздухе. Поэтому сцена
считается местом, а не картинкой. Расширение вида зумит мир вокруг линии, на
которой стоят танцовщицы, и ровно настолько, чтобы задник дотянулся до обоих
краёв – около 1.17 на 20:9. Задник, световой оверлей, толпа и сами девочки
проходят через одно и то же преобразование, поэтому пол ни у кого не уезжает
из-под ног. Толпа – одна полоса, до краёв сама не достаёт, поэтому она
повторяется вбок, каждая вторая копия зеркальная: стык получается
непрерывным, а готовый ряд собирается один раз в offscreen-канвас, так что
по-прежнему стоит один вызов отрисовки на кадр.

**Оптимизация.** Атласы обрезаны по видимым пикселям, одинаковые кадры
дедуплицированы, всё приведено к размеру фактической отрисовки.

**Звук.** Оригинальные эффекты лежат в 11 кГц / 16 кбит/с моно. Заменены на
ремастер в 44.1 кГц и выровнены по EBU R128, чтобы клики не перекрикивали
музыку.

**Следы растеризации.** У `crowd.webp` после SVG-прохода осталась
однопиксельная полупрозрачная тёмная кромка по верхнему краю. На 4:3 она
пряталась внутри рисунка, а в широком виде увеличивалась в чёрную линию через
середину экрана. В собранном ассете кромка обнулена.

## Автор

- Telegram – [@VestronVulture](https://t.me/VestronVulture)
- GitHub – [sewerdev](https://github.com/sewerdev/)

## Правовая информация

My Little Pony, Equestria Girls и вся связанная графика, персонажи и музыка
принадлежат Hasbro; оригинальная игра разработана BKOM Studios. Это
неофициальный любительский порт ради сохранения игры, в которую иначе уже
невозможно поиграть. Проект не связан с Hasbro и не одобрен ею. Не для
коммерческого распространения. И да, авторское право как явление – ненавижу.

</details>
