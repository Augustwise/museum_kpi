import '../styles/main.scss';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    'http://localhost:3000';

  const jsonHeaders = {
    'Content-Type': 'application/json',
  };

  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 500);
    }, 3000);
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const payload = {
        email: formData.get('email'),
        password: formData.get('password'),
      };

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Помилка авторизації');
        }

        if (data && data.token) {
          try { localStorage.setItem('authToken', data.token); } catch (_) {}
        }
        showNotification('Успішний вхід');
        window.location.href = './admin.html';
      } catch (error) {
        showNotification(error.message || 'Сталася помилка під час авторизації', 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const payload = {
        email: formData.get('email'),
        password: formData.get('password'),
        lastName: formData.get('lastName'),
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName') || '',
        birthDate: formData.get('birthDate'),
      };

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Помилка реєстрації');
        }

        if (data && data.token) {
          try { localStorage.setItem('authToken', data.token); } catch (_) {}
        }
        showNotification('Реєстрація успішна');
        window.location.href = './admin.html';
      } catch (error) {
        showNotification(error.message || 'Сталася помилка під час реєстрації', 'error');
      }
    });
  }
});