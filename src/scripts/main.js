import '../styles/main.scss';

document.addEventListener('DOMContentLoaded', () => {
  const burgerMenu = document.getElementById('burgerMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu = document.getElementById('closeMenu');
  const backdrop = document.getElementById('backdrop');
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu__link');

  const setBodyScrollLock = (shouldLock) => {
    document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
  };

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

  // Backdrop click: pulse the mobile menu content instead of closing (0.7s)
  const pulseMenu = () => {
    if (!mobileMenu) return;
    const content = mobileMenu.querySelector('.mobile-menu__content');
    if (!content) return;
    content.classList.remove('mobile-menu__content--pulse');
    void content.offsetWidth; // reflow to restart animation
    content.classList.add('mobile-menu__content--pulse');
    setTimeout(() => {
      content.classList.remove('mobile-menu__content--pulse');
    }, 700);
  };

  if (burgerMenu) {
    burgerMenu.addEventListener('click', openMobileMenu);
  }

  if (closeMenu) {
    closeMenu.addEventListener('click', closeMobileMenu);
  }

  if (mobileMenu) {
    mobileMenu.addEventListener('click', (event) => {
      if (event.target === mobileMenu) {
        // Instead of closing on empty area click, pulse the menu to indicate it's active
        pulseMenu();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    const isEscapeKey = event.key === 'Escape';

    if (isEscapeKey && mobileMenu && mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  if (mobileMenu) {
    mobileMenu.addEventListener('transitionend', (event) => {
      const finishedTransformAnimation = event.propertyName === 'transform';

      if (finishedTransformAnimation && !mobileMenu.classList.contains('active')) {
        mobileMenu.hidden = true;
      }
    });
  }

  mobileMenuLinks.forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  const sliderWrapper = document.querySelector('.gallery-slider__wrapper');
  const slides = document.querySelectorAll('.gallery-slider__slide');
  const dotsContainer = document.querySelector('.gallery-slider__dots');

  if (sliderWrapper && slides.length > 0 && dotsContainer) {
    let currentIndex = 0;
    let dots = [];

    const updateDots = () => {
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
      });
    };

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

    dots = Array.from(document.querySelectorAll('.gallery-slider__dot'));

    window.addEventListener('resize', () => {
      goToSlide(currentIndex);
    });
  }

  const scrollToTopButton = document.getElementById('scrollToTop');

  if (scrollToTopButton) {
    scrollToTopButton.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  }





  // API base (can be overridden by Vite env: VITE_API_URL)
  const API_BASE =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    'http://localhost:3000';

  const jsonHeaders = {
    'Content-Type': 'application/json',
  };


});
