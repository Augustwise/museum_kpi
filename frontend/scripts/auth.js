document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.querySelector('.auth-form');
  const redirectButtons = document.querySelectorAll('[data-redirect="admin"]');

  const redirectToAdmin = () => {
    window.location.href = './admin.html';
  };

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
