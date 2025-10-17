document.addEventListener('DOMContentLoaded', () => {
  const burgerMenu = document.getElementById('burgerMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu = document.getElementById('closeMenu');
  const backdrop = document.getElementById('backdrop');


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

  };


  if (burgerMenu) {
    burgerMenu.addEventListener('click', openMobileMenu);
  }

  if (closeMenu) {
    closeMenu.addEventListener('click', closeMobileMenu);
  }

});
