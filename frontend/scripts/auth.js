import IMask from 'imask';

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.querySelector('.auth-form');
  const redirectButtons = document.querySelectorAll('[data-redirect="admin"]');
  const phoneInput = document.querySelector('input[name="phone"]');

  const redirectToAdmin = () => {
    window.location.href = './admin.html';
  };

  if (phoneInput) {
    IMask(phoneInput, {
      mask: '+{380} 00 000 00 00',
      lazy: false,
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', (event) => {
      event.preventDefault();
      redirectToAdmin();
    });
  }

  redirectButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      redirectToAdmin();
    });
  });
});
