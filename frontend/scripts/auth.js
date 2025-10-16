import '../styles/main.scss';
import IMask from 'imask';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+380 \d{2} \d{3} \d{2} \d{2}$/;
const NAME_REGEX = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’\-\s]+$/u;
const PASSWORD_MIN_LENGTH = 6;
const NAME_MIN_LENGTH = 2;
const EARLIEST_BIRTH_DATE = new Date('1900-01-01');
const ALLOWED_GENDERS = new Set(['male', 'female']);

function toCleanString(value) {
  return String(value ?? '').trim();
}

function setAuthFieldError(form, fieldName, message) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (input) {
    input.classList.toggle('auth-input--error', Boolean(message));
    if (typeof input.setCustomValidity === 'function') {
      input.setCustomValidity(message || '');
    }
  }

  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (errorElement) {
    errorElement.textContent = message || '';
  }
}

function resetAuthFieldErrors(form, fieldNames) {
  fieldNames.forEach((field) => setAuthFieldError(form, field, ''));
}

function focusFirstAuthError(form) {
  const erroredInput = form.querySelector('.auth-input--error');
  if (erroredInput && typeof erroredInput.focus === 'function') {
    erroredInput.focus();
    if (typeof erroredInput.reportValidity === 'function') {
      erroredInput.reportValidity();
    }
  }
}

function validateLoginPayload(payload) {
  const errors = {};

  if (!payload.email) {
    errors.email = 'Вкажіть електронну пошту.';
  } else if (!EMAIL_REGEX.test(payload.email)) {
    errors.email = 'Введіть коректний email.';
  }

  if (!payload.password) {
    errors.password = 'Вкажіть пароль.';
  } else if (payload.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів.`;
  }

  return errors;
}

function validateRegisterPayload(payload, isPhoneMaskComplete) {
  const errors = {};

  if (!payload.email) {
    errors.email = 'Вкажіть електронну пошту.';
  } else if (!EMAIL_REGEX.test(payload.email)) {
    errors.email = 'Введіть коректний email.';
  }

  if (!payload.password) {
    errors.password = 'Вкажіть пароль.';
  } else if (payload.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів.`;
  }

  ['lastName', 'firstName'].forEach((field) => {
    const label = field === 'lastName' ? 'Прізвище' : 'Імʼя';
    const value = payload[field];

    if (!value) {
      errors[field] = `${label} є обовʼязковим.`;
      return;
    }

    if (value.length < NAME_MIN_LENGTH) {
      errors[field] = `${label} має містити щонайменше ${NAME_MIN_LENGTH} літери.`;
      return;
    }

    if (!NAME_REGEX.test(value)) {
      errors[field] = `${label} може містити лише літери, апостроф та дефіс.`;
    }
  });

  if (payload.middleName) {
    if (payload.middleName.length < NAME_MIN_LENGTH) {
      errors.middleName = 'По батькові має містити щонайменше дві літери.';
    } else if (!NAME_REGEX.test(payload.middleName)) {
      errors.middleName = 'По батькові може містити лише літери, апостроф та дефіс.';
    }
  }

  if (payload.gender && !ALLOWED_GENDERS.has(payload.gender)) {
    errors.gender = 'Оберіть стать зі списку.';
  }

  if (!payload.birthDate) {
    errors.birthDate = 'Вкажіть дату народження.';
  } else {
    const birthDate = new Date(payload.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      errors.birthDate = 'Невірний формат дати.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthDate > today) {
        errors.birthDate = 'Дата народження не може бути в майбутньому.';
      } else if (birthDate < EARLIEST_BIRTH_DATE) {
        errors.birthDate = 'Дата народження має бути пізніше 01.01.1900.';
      }
    }
  }

  if (!payload.phone || !PHONE_REGEX.test(payload.phone) || !isPhoneMaskComplete) {
    errors.phone = 'Введіть номер у форматі +380 00 000 00 00.';
  }

  return errors;
}

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
    if (!notification) return;

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
    const clearErrorOnInput = (event) => {
      const target = event.target;
      if (!target || !target.name) return;
      setAuthFieldError(loginForm, target.name, '');
    };

    loginForm.addEventListener('input', clearErrorOnInput, true);

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const payload = {
        email: toCleanString(formData.get('email')),
        password: toCleanString(formData.get('password')),
      };

      const fields = ['email', 'password'];
      resetAuthFieldErrors(loginForm, fields);
      const errors = validateLoginPayload(payload);

      Object.entries(errors).forEach(([field, message]) => {
        setAuthFieldError(loginForm, field, message);
      });

      if (Object.keys(errors).length) {
        focusFirstAuthError(loginForm);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data?.errors && typeof data.errors === 'object') {
            Object.entries(data.errors).forEach(([field, message]) => {
              setAuthFieldError(loginForm, field, String(message));
            });
            focusFirstAuthError(loginForm);
          }
          throw new Error(data?.message || 'Помилка авторизації');
        }

        if (data && data.token) {
          try {
            localStorage.setItem('authToken', data.token);
          } catch (_) {
            /* ignore */
          }
        }

        showNotification('Успішний вхід');
        window.location.href = './admin.html';
      } catch (error) {
        showNotification(error.message || 'Сталася помилка під час авторизації', 'error');
      }
    });
  }

  if (registerForm) {
    const phoneInput = registerForm.querySelector('#phone');
    let phoneMask = null;

    if (phoneInput) {
      phoneMask = IMask(phoneInput, {
        mask: '+{380} 00 000 00 00',
      });

      phoneInput.addEventListener('input', () => {
        if (phoneMask?.masked.isComplete) {
          setAuthFieldError(registerForm, 'phone', '');
        }
      });

      phoneInput.addEventListener('blur', () => {
        if (!phoneMask?.masked.isComplete) {
          setAuthFieldError(registerForm, 'phone', 'Введіть номер у форматі +380 00 000 00 00.');
        }
      });
    }

    const clearErrorOnChange = (event) => {
      const target = event.target;
      if (!target || !target.name) return;
      setAuthFieldError(registerForm, target.name, '');
    };

    registerForm.addEventListener('input', clearErrorOnChange, true);
    registerForm.addEventListener('change', clearErrorOnChange, true);

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const rawGender = toCleanString(formData.get('gender'));

      const payload = {
        email: toCleanString(formData.get('email')),
        password: toCleanString(formData.get('password')),
        lastName: toCleanString(formData.get('lastName')),
        firstName: toCleanString(formData.get('firstName')),
        middleName: toCleanString(formData.get('middleName')),
        gender: rawGender,
        birthDate: toCleanString(formData.get('birthDate')),
        phone: phoneMask ? toCleanString(phoneMask.value) : toCleanString(formData.get('phone')),
      };

      const fields = ['email', 'password', 'lastName', 'firstName', 'middleName', 'gender', 'birthDate', 'phone'];
      resetAuthFieldErrors(registerForm, fields);

      const errors = validateRegisterPayload(payload, Boolean(phoneMask?.masked.isComplete));

      Object.entries(errors).forEach(([field, message]) => {
        setAuthFieldError(registerForm, field, message);
      });

      if (Object.keys(errors).length) {
        focusFirstAuthError(registerForm);
        return;
      }

      const requestPayload = {
        email: payload.email,
        password: payload.password,
        lastName: payload.lastName,
        firstName: payload.firstName,
        middleName: payload.middleName,
        gender: payload.gender || null,
        birthDate: payload.birthDate,
        phone: payload.phone,
      };

      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(requestPayload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data?.errors && typeof data.errors === 'object') {
            Object.entries(data.errors).forEach(([field, message]) => {
              setAuthFieldError(registerForm, field, String(message));
            });
            focusFirstAuthError(registerForm);
          }
          throw new Error(data?.message || 'Помилка реєстрації');
        }

        if (data && data.token) {
          try {
            localStorage.setItem('authToken', data.token);
          } catch (_) {
            /* ignore */
          }
        }

        showNotification('Реєстрація успішна');
        window.location.href = './admin.html';
      } catch (error) {
        showNotification(error.message || 'Сталася помилка під час реєстрації', 'error');
      }
    });
  }
});
