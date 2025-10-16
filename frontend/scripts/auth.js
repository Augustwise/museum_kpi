import '../styles/main.scss';
import IMask from 'imask';
import { createApp, nextTick, onMounted, reactive, ref } from 'vue';

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

function createNotificationManager() {
  const notification = reactive({
    message: '',
    type: 'success',
    visible: false,
    showClass: false,
  });
  let showTimeout = null;
  let hideTimeout = null;

  function clearTimers() {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function show(message, type = 'success') {
    clearTimers();
    notification.message = message;
    notification.type = type;
    notification.visible = true;
    notification.showClass = false;

    showTimeout = setTimeout(() => {
      notification.showClass = true;
    }, 10);

    hideTimeout = setTimeout(() => {
      notification.showClass = false;
      hideTimeout = setTimeout(() => {
        notification.visible = false;
      }, 500);
    }, 3000);
  }

  return { notification, show };
}

function focusFirstError(rootElement, fields, errors) {
  nextTick(() => {
    const firstErrorField = fields.find((field) => errors[field]);
    if (!firstErrorField) {
      return;
    }
    const input = rootElement.querySelector(`[name="${firstErrorField}"]`);
    if (input) {
      input.focus();
      if (typeof input.reportValidity === 'function') {
        input.reportValidity();
      }
    }
  });
}

function applyFieldError(rootElement, errors, fieldName, message) {
  errors[fieldName] = message;
  nextTick(() => {
    const input = rootElement.querySelector(`[name="${fieldName}"]`);
    if (input && typeof input.setCustomValidity === 'function') {
      input.setCustomValidity(message || '');
    }
  });
}

function mountLoginApp(rootElement, apiBase, jsonHeaders) {
  const { notification, show } = createNotificationManager();
  const app = createApp({
    setup() {
      const form = reactive({
        email: '',
        password: '',
      });
      const errors = reactive({
        email: '',
        password: '',
      });
      const isSubmitting = ref(false);

      const fields = ['email', 'password'];

      function clearError(field) {
        if (errors[field]) {
          applyFieldError(rootElement, errors, field, '');
        } else {
          nextTick(() => {
            const input = rootElement.querySelector(`[name="${field}"]`);
            if (input && typeof input.setCustomValidity === 'function') {
              input.setCustomValidity('');
            }
          });
        }
      }

      async function handleSubmit() {
        if (isSubmitting.value) return;
        isSubmitting.value = true;

        const payload = {
          email: toCleanString(form.email),
          password: toCleanString(form.password),
        };

        fields.forEach((field) => applyFieldError(rootElement, errors, field, ''));
        const validationErrors = validateLoginPayload(payload);
        Object.entries(validationErrors).forEach(([field, message]) => {
          applyFieldError(rootElement, errors, field, message);
        });

        if (Object.keys(validationErrors).length) {
          focusFirstError(rootElement, fields, errors);
          isSubmitting.value = false;
          return;
        }

        try {
          const response = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok) {
            if (data?.errors && typeof data.errors === 'object') {
              Object.entries(data.errors).forEach(([field, message]) => {
                applyFieldError(rootElement, errors, field, String(message));
              });
              focusFirstError(rootElement, fields, errors);
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

          show('Успішний вхід');
          window.location.href = './admin.html';
        } catch (error) {
          show(error.message || 'Сталася помилка під час авторизації', 'error');
        } finally {
          isSubmitting.value = false;
        }
      }

      return {
        form,
        errors,
        notification,
        isSubmitting,
        clearError,
        handleSubmit,
      };
    },
    template: `
      <div>
        <div
          v-if="notification.visible"
          :class="['notification', notification.type, { show: notification.showClass }]"
          role="alert"
        >
          {{ notification.message }}
        </div>

        <main class="auth-card" role="main">
          <header style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <img src="./images/NAMU_logo.svg" alt="NAMU" width="32" height="32" />
            <h1 class="auth-title">Авторизація</h1>
          </header>

          <form class="auth-form" novalidate @submit.prevent="handleSubmit">
            <label class="auth-label">Email
              <input
                type="email"
                name="email"
                required
                autocomplete="email"
                class="auth-input"
                :class="{ 'auth-input--error': errors.email }"
                v-model="form.email"
                @input="clearError('email')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.email }}</p>
            </label>

            <label class="auth-label">Пароль
              <input
                type="password"
                name="password"
                required
                minlength="6"
                autocomplete="current-password"
                class="auth-input"
                :class="{ 'auth-input--error': errors.password }"
                v-model="form.password"
                @input="clearError('password')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.password }}</p>
            </label>

            <button type="submit" class="auth-submit" :disabled="isSubmitting">Увійти</button>
          </form>

          <div class="auth-actions">
            <p>Немає акаунта? <a href="./register.html">Зареєструватися</a></p>
            <p style="margin-top:8px"><a href="./index.html">← На головну</a></p>
          </div>
        </main>
      </div>
    `,
  });

  app.mount(rootElement);
}

function mountRegisterApp(rootElement, apiBase, jsonHeaders) {
  const { notification, show } = createNotificationManager();
  const app = createApp({
    setup() {
      const form = reactive({
        email: '',
        password: '',
        lastName: '',
        firstName: '',
        middleName: '',
        gender: '',
        birthDate: '',
        phone: '',
      });
      const errors = reactive({
        email: '',
        password: '',
        lastName: '',
        firstName: '',
        middleName: '',
        gender: '',
        birthDate: '',
        phone: '',
      });
      const isSubmitting = ref(false);
      const phoneInput = ref(null);
      let phoneMaskInstance = null;

      const fields = [
        'email',
        'password',
        'lastName',
        'firstName',
        'middleName',
        'gender',
        'birthDate',
        'phone',
      ];

      function clearError(field) {
        if (errors[field]) {
          applyFieldError(rootElement, errors, field, '');
        } else {
          nextTick(() => {
            const input = rootElement.querySelector(`[name="${field}"]`);
            if (input && typeof input.setCustomValidity === 'function') {
              input.setCustomValidity('');
            }
          });
        }
      }

      function handlePhoneBlur() {
        if (phoneMaskInstance && !phoneMaskInstance.masked.isComplete) {
          applyFieldError(rootElement, errors, 'phone', 'Введіть номер у форматі +380 00 000 00 00.');
        }
      }

      onMounted(() => {
        if (phoneInput.value) {
          phoneMaskInstance = IMask(phoneInput.value, {
            mask: '+{380} 00 000 00 00',
          });

          phoneInput.value.addEventListener('input', () => {
            form.phone = phoneInput.value.value;
            if (phoneMaskInstance.masked.isComplete) {
              applyFieldError(rootElement, errors, 'phone', '');
            }
          });
        }
      });

      async function handleSubmit() {
        if (isSubmitting.value) return;
        isSubmitting.value = true;

        const payload = {
          email: toCleanString(form.email),
          password: toCleanString(form.password),
          lastName: toCleanString(form.lastName),
          firstName: toCleanString(form.firstName),
          middleName: toCleanString(form.middleName),
          gender: toCleanString(form.gender),
          birthDate: toCleanString(form.birthDate),
          phone: toCleanString(form.phone),
        };

        fields.forEach((field) => applyFieldError(rootElement, errors, field, ''));
        const validationErrors = validateRegisterPayload(
          payload,
          Boolean(phoneMaskInstance?.masked.isComplete)
        );
        Object.entries(validationErrors).forEach(([field, message]) => {
          applyFieldError(rootElement, errors, field, message);
        });

        if (Object.keys(validationErrors).length) {
          focusFirstError(rootElement, fields, errors);
          isSubmitting.value = false;
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
          const response = await fetch(`${apiBase}/api/auth/register`, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
          });

          const data = await response.json();

          if (!response.ok) {
            if (data?.errors && typeof data.errors === 'object') {
              Object.entries(data.errors).forEach(([field, message]) => {
                applyFieldError(rootElement, errors, field, String(message));
              });
              focusFirstError(rootElement, fields, errors);
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

          show('Реєстрація успішна');
          window.location.href = './admin.html';
        } catch (error) {
          show(error.message || 'Сталася помилка під час реєстрації', 'error');
        } finally {
          isSubmitting.value = false;
        }
      }

      return {
        form,
        errors,
        notification,
        isSubmitting,
        phoneInput,
        clearError,
        handlePhoneBlur,
        handleSubmit,
      };
    },
    template: `
      <div>
        <div
          v-if="notification.visible"
          :class="['notification', notification.type, { show: notification.showClass }]"
          role="alert"
        >
          {{ notification.message }}
        </div>

        <main class="auth-card" role="main">
          <header style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <img src="./images/NAMU_logo.svg" alt="NAMU" width="32" height="32" />
            <h1 class="auth-title">Реєстрація</h1>
          </header>

          <form class="auth-form" novalidate @submit.prevent="handleSubmit">
            <label class="auth-label">Email
              <input
                type="email"
                name="email"
                required
                autocomplete="email"
                class="auth-input"
                :class="{ 'auth-input--error': errors.email }"
                v-model="form.email"
                @input="clearError('email')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.email }}</p>
            </label>

            <label class="auth-label">Пароль
              <input
                type="password"
                name="password"
                required
                minlength="6"
                autocomplete="new-password"
                class="auth-input"
                :class="{ 'auth-input--error': errors.password }"
                v-model="form.password"
                @input="clearError('password')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.password }}</p>
            </label>

            <label class="auth-label">Прізвище
              <input
                type="text"
                name="lastName"
                required
                class="auth-input"
                :class="{ 'auth-input--error': errors.lastName }"
                v-model="form.lastName"
                @input="clearError('lastName')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.lastName }}</p>
            </label>

            <label class="auth-label">Ім’я
              <input
                type="text"
                name="firstName"
                required
                class="auth-input"
                :class="{ 'auth-input--error': errors.firstName }"
                v-model="form.firstName"
                @input="clearError('firstName')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.firstName }}</p>
            </label>

            <label class="auth-label">По батькові
              <input
                type="text"
                name="middleName"
                class="auth-input"
                :class="{ 'auth-input--error': errors.middleName }"
                v-model="form.middleName"
                @input="clearError('middleName')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.middleName }}</p>
            </label>

            <label class="auth-label">Номер телефону
              <input
                type="tel"
                name="phone"
                required
                inputmode="tel"
                placeholder="+380 00 000 00 00"
                class="auth-input"
                :class="{ 'auth-input--error': errors.phone }"
                autocomplete="tel"
                v-model="form.phone"
                @input="clearError('phone')"
                @blur="handlePhoneBlur"
                ref="phoneInput"
              />
              <p class="auth-error" aria-live="polite">{{ errors.phone }}</p>
            </label>

            <fieldset class="auth-fieldset">
              <legend class="auth-label auth-legend">Стать (необовʼязково)</legend>
              <label class="auth-radio">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  v-model="form.gender"
                  @change="clearError('gender')"
                />
                <span>Чоловік</span>
              </label>
              <label class="auth-radio">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  v-model="form.gender"
                  @change="clearError('gender')"
                />
                <span>Жінка</span>
              </label>
              <p class="auth-error" aria-live="polite">{{ errors.gender }}</p>
            </fieldset>

            <label class="auth-label">Дата народження
              <input
                type="date"
                name="birthDate"
                required
                class="auth-input"
                :class="{ 'auth-input--error': errors.birthDate }"
                v-model="form.birthDate"
                @change="clearError('birthDate')"
              />
              <p class="auth-error" aria-live="polite">{{ errors.birthDate }}</p>
            </label>

            <button type="submit" class="auth-submit" :disabled="isSubmitting">
              Зареєструватися
            </button>
          </form>

          <div class="auth-actions">
            <p>Вже маєте акаунт? <a href="./login.html">Увійти</a></p>
            <p style="margin-top:8px"><a href="./index.html">← На головну</a></p>
          </div>
        </main>
      </div>
    `,
  });

  app.mount(rootElement);
}

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:3000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const rootElement = document.getElementById('app');
const mode = document.body?.dataset?.authMode;

if (rootElement && mode === 'login') {
  mountLoginApp(rootElement, API_BASE, jsonHeaders);
} else if (rootElement && mode === 'register') {
  mountRegisterApp(rootElement, API_BASE, jsonHeaders);
}
