# Звіт про проєкт NAMU

## Вступ
Сайт NAMU — промосторінка Національного художнього музею України, що знайомить відвідувачів із виставками, лекціями, галереєю робіт і контактами. Інтерфейс орієнтований на швидку навігацію, тому ключові розділи винесені на одну сторінку без зайвих переходів.

Проєкт зібрано на стеку HTML + SCSS + JavaScript із використанням Vite для зручного запуску та гарячого перезавантаження під час розробки. Семантична HTML-структура забезпечує доступність і правильне відображення в пошукових системах, а модульні SCSS-файли спрощують підтримку стилів.

Усю реалізацію зосереджено в каталозі `src`: тут розташовано шаблон [`index.html`](src/index.html:1), стилі [`main.scss`](src/styles/main.scss:1) з підключеними частковими файлами та модульний скрипт [`main.js`](src/scripts/main.js:1), що відповідає за інтерактивність.

## Організація проєкту та структури файлів
- **HTML.** Основний шаблон міститься в [`index.html`](src/index.html:1); він підключає стилі й JavaScript та визначає всі секції сторінки в єдиному документі.
- **Стилі.** Файл-збірник [`main.scss`](src/styles/main.scss:1) імпортує службові модулі (`_vars.scss`, `_mixins.scss`, `_extends.scss`) і стилі окремих блоків (`_events.scss`, `_gallery.scss`, `_lecture.scss`, `_subscription.scss`, `_footer.scss`). Такий поділ дозволяє незалежно оновлювати кожну секцію.
- **Скрипти.** Модуль [`main.js`](src/scripts/main.js:1) підключає стилі та додає слухачі подій для меню, слайдера й кнопки прокрутки. Код написано в ES-модульному форматі, що сумісно з Vite.
- **Ресурси.** Папки `fonts` і `images` містять локальні шрифти та графіку. Завдяки цьому сторінка не залежить від сторонніх CDN і гарантує стабільне відображення фірмового стилю.

Для наочності наведено скорочений фрагмент HTML-структури голови сайту:

```html
<header class="header">
  <div class="header-top">
    <div class="container">
      <button
        class="burger-menu"
        id="burgerMenu"
        type="button"
        aria-haspopup="true"
        aria-controls="mobileMenu"
        aria-expanded="false"
      >
        <img src="./images/burger_icon.svg" alt="Menu" class="burger-icon" />
      </button>
      <div class="logo">
        <img src="./images/NAMU_logo.svg" alt="Logo" class="logo-image" />
      </div>
    </div>
  </div>

  <aside
    class="mobile-menu"
    id="mobileMenu"
    aria-hidden="true"
    hidden
  >
    <!-- Внутрішній контент навігації та довідки -->
  </aside>
</header>
```

## Архітектура сторінки: секції та їх роль
1. **Шапка та мобільне меню.** У шапці знаходиться кнопка бургер-меню, логотип і приховане `<aside>` із навігацією. При ширині планшета і вище шапка стає fixed, а мобільне меню трансформується у компактний блок.
2. **Hero-блок.** Секція `hero-section` поєднує великий заголовок, кнопку «Квитки», логотип і фон, що змінюється залежно від ширини екрана. На десктопі зображення підвантажується як фон через CSS.
3. **Актуальні події.** Секція `events-section` містить картки з афішами, категоріями, датами та описами. Грід-композиція адаптується: на мобільних це вертикальний список, на десктопі — двоколонкова сітка.
4. **Лекція.** Блок `lecture-section` накладає білосніжну картку з інформацією на тло із зображенням, створюючи ефект афіші.
5. **Галерея.** На десктопі використовується grid із чотирма плитками різних розмірів, а на мобільних — горизонтальний слайдер із крапками-навігаторами.
6. **Підписка.** Секція `subscription-section` містить форму з email-полем і кнопкою на базі SVG-іконки, розташовану на фоні з фотографією.
7. **Footer.** Нижній колонтитул містить логотип, графік роботи, контактні дані, дубль навігації та кнопку повернення догори.

Щоб दर्शити структуру hero-блоку, наведемо характерний уривок HTML:

```html
<section class="hero-section">
  <div class="container">
    <div class="hero-content">
      <h1 class="hero-title">Художній музей</h1>
      <div class="tickets-section">
        <a href="#events-section" class="tickets-button">
          <span class="tickets-text">Квитки</span>
          <div class="tickets-arrow-section">
            <img src="./images/vector.svg" alt="Arrow" class="tickets-arrow" />
          </div>
        </a>
      </div>
    </div>

    <div class="hero-image-desktop">
      <div class="hero-logo">
        <img src="./images/NAMU_logo.svg" alt="NAMU Logo" class="hero-logo-image" />
      </div>
    </div>
  </div>
</section>
```

## Використані HTML-теги та семантика
- **Семантичні контейнери.** Розмітка спирається на `header`, `main`, `section`, `aside`, `footer`, що покращує доступність та SEO.
- **Навігація.** Головне меню оформлено через `<nav>` з якорями, а мобільна панель використовує `aria-haspopup`, `aria-controls` та `aria-hidden`, щоб скрінрідери правильно сприймали стан меню.
- **Форми.** У блоці підписки використано `form`, `input type="email"` і `button` з гнучким оформленням, тому дизайн легко адаптувати під інтеграцію з бекенд-сервісами.
- **Зображення.** Кожне `img` має змістовний атрибут `alt`, зокрема в галереї та картках подій, що допомагає користувачам із читачами екрана.

Приклад семантичного фрагмента меню:

```html
<nav class="mobile-menu__nav">
  <a href="#gallery-section" class="mobile-menu__link">Галерея</a>
  <a href="#subscription-section" class="mobile-menu__link">Про Нас</a>
  <a href="#events-section" class="mobile-menu__link">Виставки та події</a>
  <a href="#footer" class="mobile-menu__link">Контакти</a>
</nav>
```

## Стилі та дизайн
Стилі організовані за принципом модульності: кожен великий блок має власний partial-файл, а спільні змінні та міксини винесені в `_vars.scss` та `_mixins.scss`.

**Палітра й сітка.** У файлі зі змінними визначено кольори, брейкпоінти та параметри колонок:

```scss
$c-white: #fff;
$c-black: #000;
$c-gray-main: #0f0e08;
$c-gray-light: #687480;
$c-green: #1a5a4c;

$breakpoint-mobile: 320px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1280px;

$desktop-columns: 12;
$desktop-column-width: 70px;
$desktop-gutter: 30px;
$desktop-margin: 55px;
```

**Міксини.** Щоб не дублювати код, застосовано міксини контейнера та hover-анімацій:

```scss
@mixin container {
  margin: 0 auto;
  padding: 0 $mobile-margin;
  max-width: $mobile-container-width + (2 * $mobile-margin);

  @media (min-width: $breakpoint-tablet) {
    padding: 0 $tablet-margin;
    max-width: $tablet-container-width + (2 * $tablet-margin);
  }

  @media (min-width: $breakpoint-desktop) {
    padding: 0 $desktop-margin;
    max-width: $desktop-container-width + (2 * $desktop-margin);
  }
}

@mixin hover($_property, $_toValue) {
  transition: #{$_property} 0.3s;
  &:hover {
    #{$_property}: $_toValue;
  }
}
```

**Оформлення подій.** Картки секції «Актуальні події» мають анімації наведення й адаптивні розміри:

```scss
.event-item__img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  @media (min-width: $breakpoint-tablet) {
    height: 400px;
  }

  @media (min-width: $breakpoint-desktop) {
    height: 500px;
  }

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
}
```

**Галерея та слайдер.** На десктопі зображення викладені grid-структурою, а на мобільному активується горизонтальний слайдер з крапками:

```scss
.gallery-grid {
  display: none;

  @media (min-width: $breakpoint-desktop) {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 30px;
  }
}

.gallery-slider__wrapper {
  display: flex;
  transition: transform 0.3s ease-in-out;
  margin: 0 -8.5px;
}
```

## JavaScript-функціональність
Модуль [`main.js`](src/scripts/main.js:1) прив’язує обробники подій після `DOMContentLoaded`. Основні сценарії:

1. **Керування мобільним меню.** Відкриття/закриття містять оновлення aria-атрибутів, керування бекдропом та блокування скролу.
2. **Слайдер галереї.** Скрипт генерує крапки-навігатори, синхронізує активний стан та реагує на зміну ширини вікна.
3. **Кнопка «на гору».** Плавно прокручує сторінку у випадку натискання.

Нижче наведено ключові фрагменти JavaScript:

```javascript
const openMobileMenu = () => {
  if (mobileMenu) {
    mobileMenu.hidden = false;
    mobileMenu.setAttribute('aria-hidden', 'false');
    void mobileMenu.offsetWidth;
    mobileMenu.classList.add('active');
  }

  if (backdrop) {
    backdrop.classList.add('active');
  }

  if (burgerMenu) {
    burgerMenu.setAttribute('aria-expanded', 'true');
  }

  setBodyScrollLock(true);
};

const closeMobileMenu = () => {
  if (mobileMenu) {
    mobileMenu.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
  }

  if (backdrop) {
    backdrop.classList.remove('active');
  }

  if (burgerMenu) {
    burgerMenu.setAttribute('aria-expanded', 'false');
  }

  setBodyScrollLock(false);
};
```

```javascript
const goToSlide = (index) => {
  const slideWidth = slides[0].clientWidth;

  sliderWrapper.style.transform = `translateX(-${index * slideWidth}px)`;
  currentIndex = index;
  updateDots();
};

for (let index = 0; index < slides.length; index += 1) {
  const dot = document.createElement('div');
  dot.classList.add('gallery-slider__dot');

  if (index === 0) {
    dot.classList.add('active');
  }

  dot.addEventListener('click', () => {
    goToSlide(index);
  });

  dotsContainer.appendChild(dot);
}
```

```javascript
if (scrollToTopButton) {
  scrollToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });
}
```

## Адаптивність і взаємодія користувача
- **Медіа-запити.** SCSS проходить трьома основними брейкпоінтами: 320px (мобільний), 768px (планшет), 1280px (десктоп). Приклад адаптивності hero-блоку:

```scss
.hero-section {
  margin-top: 320px;
  padding: 20px 0;

  .container {
    text-align: center;
  }

  @media (min-width: $breakpoint-tablet) {
    margin-top: 0;
    padding: 0;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: hidden;

    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      align-items: center;
      text-align: left;
      padding-left: $tablet-margin;
      height: 100vh;
    }
  }
}
```

- **Поведінка меню.** Анімація відкриття/закриття реалізована на CSS (`transform` і `transition`), а JavaScript слухає подію `transitionend`, щоб ховати меню після завершення ефекту.
- **Перехід між grid і slider.** У секції галереї на десктопі активний grid (12 колонок), на мобільному — слайдер із горизонтального скролу.
- **Візуальні відгуки.** Hover-ефекти додають тіні й масштабування, підкреслюючи клікабельність кнопок і зображень. Це особливо помітно в блоках «Події» та «Підписка».
- **Кнопка прокрутки.** Відображається лише на мобільних пристроях, де довгі сторінки прокручуються складніше.

## Висновки
Проєкт NAMU демонструє чітку структуру, розділення обов’язків між HTML, SCSS і JavaScript та зручну адаптивність для різних пристроїв. Завдяки модульним стилям і акуратній організації директорій підтримувати та розвивати код просто: можна додавати нові секції, розширювати галерею або інтегрувати реальну форму підписки.

Подальші покращення можуть включати:
- Під’єднання реальної розсилки для форми email-підписки.
- Додавання розділу з історичним описом музею або віртуальними турами.
- Розширення мультимедійної галереї з відео-матеріалами.

Завдяки розглянутій архітектурі та зрозумілим кодовим фрагментам проєкт готовий до масштабування та адаптації під нові задачі.