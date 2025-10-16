import '../styles/main.scss';
import IMask from 'imask';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:3000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const NotificationBar = {
  name: 'NotificationBar',
  props: {
    notification: {
      type: Object,
      required: true,
    },
  },
  template: `
    <div
      v-if="notification.visible"
      id="notification"
      :class="['notification', notification.type, { show: notification.show }]"
    >
      {{ notification.message }}
    </div>
  `,
};

const AuthHeader = {
  name: 'AuthHeader',
  props: {
    title: {
      type: String,
      required: true,
    },
  },
  template: `
    <header style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <img src="./images/NAMU_logo.svg" alt="NAMU" width="32" height="32" />
      <h1 class="auth-title">{{ title }}</h1>
    </header>
  `,
};

const AuthActions = {
  name: 'AuthActions',
  props: {
    page: {
      type: String,
      required: true,
    },
  },
  computed: {
    isLogin() {
      return this.page === 'login';
    },
  },
  template: `
    <div class="auth-actions">
      <p v-if="isLogin">Немає акаунта? <a href="./register.html">Зареєструватися</a></p>
      <p v-else>Вже маєте акаунт? <a href="./login.html">Увійти</a></p>
      <p style="margin-top:8px"><a href="./index.html">← На головну</a></p>
    </div>
  `,
};

const LoginForm = {
  name: 'LoginForm',
  emits: ['success', 'error'],
  methods: {
    async handleSubmit() {
      const form = this.$refs.form;
      if (!form) return;

      const formData = new FormData(form);
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

        this.$emit('success', {
          message: 'Успішний вхід',
          token: data?.token || '',
        });
      } catch (error) {
        this.$emit('error', error.message || 'Сталася помилка під час авторизації');
      }
    },
  },
  template: `
    <form ref="form" class="auth-form" novalidate @submit.prevent="handleSubmit">
      <label class="auth-label">Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>

      <label class="auth-label">Пароль
        <input type="password" name="password" required minlength="6" autocomplete="current-password" class="auth-input" />
      </label>

      <button type="submit" class="auth-submit">Увійти</button>
    </form>
  `,
};

const RegisterForm = {
  name: 'RegisterForm',
  emits: ['success', 'error'],
  data() {
    return {
      phoneError: '',
      phoneMask: null,
    };
  },
  mounted() {
    const input = this.$refs.phoneInput;
    if (input) {
      this.phoneMask = IMask(input, {
        mask: '+{380} 00 000 00 00',
      });

      input.addEventListener('input', this.showPhoneError);
      input.addEventListener('blur', this.showPhoneError);
    }
  },
  beforeUnmount() {
    const input = this.$refs.phoneInput;
    if (input) {
      input.removeEventListener('input', this.showPhoneError);
      input.removeEventListener('blur', this.showPhoneError);
    }
  },
  methods: {
    showPhoneError() {
      if (!this.phoneMask) return;

      if (!this.phoneMask.masked.isComplete) {
        this.phoneError = 'Введіть номер у форматі +380 00 000 00 00';
      } else {
        this.phoneError = '';
      }
    },
    async handleSubmit() {
      const form = this.$refs.form;
      const input = this.$refs.phoneInput;

      if (!form) return;

      if (!this.phoneMask || !this.phoneMask.masked.isComplete) {
        this.showPhoneError();
        if (input) {
          input.focus();
        }
        return;
      }

      const formData = new FormData(form);
      const payload = {
        email: formData.get('email'),
        password: formData.get('password'),
        lastName: formData.get('lastName'),
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName') || '',
        gender: formData.get('gender') || null,
        birthDate: formData.get('birthDate'),
        phone: this.phoneMask.value,
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

        this.$emit('success', {
          message: 'Реєстрація успішна',
          token: data?.token || '',
        });
      } catch (error) {
        this.$emit('error', error.message || 'Сталася помилка під час реєстрації');
      }
    },
  },
  template: `
    <form ref="form" class="auth-form" novalidate @submit.prevent="handleSubmit">
      <label class="auth-label">Email
        <input type="email" name="email" required autocomplete="email" class="auth-input" />
      </label>

      <label class="auth-label">Пароль
        <input type="password" name="password" required minlength="6" autocomplete="new-password" class="auth-input" />
      </label>

      <label class="auth-label">Прізвище
        <input type="text" name="lastName" required class="auth-input" />
      </label>

      <label class="auth-label">Ім’я
        <input type="text" name="firstName" required class="auth-input" />
      </label>

      <label class="auth-label">По батькові
        <input type="text" name="middleName" class="auth-input" />
      </label>

      <label class="auth-label">Номер телефону
        <input
          ref="phoneInput"
          type="tel"
          name="phone"
          id="phone"
          required
          inputmode="tel"
          placeholder="+380 00 000 00 00"
          class="auth-input"
          autocomplete="tel"
        />
        <p id="phoneError" class="auth-error" aria-live="polite">{{ phoneError }}</p>
      </label>

      <fieldset class="auth-fieldset">
        <legend class="auth-label auth-legend">Стать (необовʼязково)</legend>
        <label class="auth-radio">
          <input type="radio" name="gender" value="male" />
          <span>Чоловік</span>
        </label>
        <label class="auth-radio">
          <input type="radio" name="gender" value="female" />
          <span>Жінка</span>
        </label>
      </fieldset>

      <label class="auth-label">Дата народження
        <input type="date" name="birthDate" required class="auth-input" />
      </label>

      <button type="submit" class="auth-submit">Зареєструватися</button>
    </form>
  `,
};

const AuthPage = {
  name: 'AuthPage',
  components: {
    NotificationBar,
    AuthHeader,
    AuthActions,
    LoginForm,
    RegisterForm,
  },
  props: {
    page: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      notification: {
        message: '',
        type: 'success',
        visible: false,
        show: false,
      },
      hideTimer: null,
      removeTimer: null,
    };
  },
  computed: {
    title() {
      return this.page === 'login' ? 'Авторизація' : 'Реєстрація';
    },
  },
  methods: {
    showNotification(message, type = 'success') {
      this.notification.message = message;
      this.notification.type = type;
      this.notification.visible = true;
      this.notification.show = false;

      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      if (this.removeTimer) {
        clearTimeout(this.removeTimer);
        this.removeTimer = null;
      }

      window.setTimeout(() => {
        this.notification.show = true;
      }, 10);

      this.hideTimer = window.setTimeout(() => {
        this.notification.show = false;
        this.removeTimer = window.setTimeout(() => {
          this.notification.visible = false;
        }, 500);
      }, 3000);
    },
    handleSuccess({ message, token }) {
      if (token) {
        try {
          localStorage.setItem('authToken', token);
        } catch (error) {
          console.error('Не вдалося зберегти токен', error);
        }
      }
      this.showNotification(message, 'success');
      window.location.href = './admin.html';
    },
    handleError(message) {
      this.showNotification(message, 'error');
    },
  },
  template: `
    <div>
      <NotificationBar :notification="notification" />
      <main class="auth-card" role="main">
        <AuthHeader :title="title" />
        <LoginForm v-if="page === 'login'" @success="handleSuccess" @error="handleError" />
        <RegisterForm v-else @success="handleSuccess" @error="handleError" />
        <AuthActions :page="page" />
      </main>
    </div>
  `,
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (!container) return;

  const vueGlobal = window.Vue || {};
  const { createApp } = vueGlobal;

  if (typeof createApp !== 'function') {
    console.error('Vue не завантажено');
    return;
  }

  const page = container.dataset.page === 'register' ? 'register' : 'login';
  createApp(AuthPage, { page }).mount(container);
});
