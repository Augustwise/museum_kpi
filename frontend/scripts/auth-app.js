import '../styles/main.scss';
import IMask from 'imask';
import { createApp, reactive, ref, onMounted } from 'vue';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:3000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function useNotification() {
  const notification = reactive({
    message: '',
    type: 'success',
    visible: false,
    show: false,
  });

  let hideTimer = null;
  let removeTimer = null;

  const showNotification = (message, type = 'success') => {
    notification.message = message;
    notification.type = type;
    notification.visible = true;
    notification.show = false;

    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    if (removeTimer) {
      clearTimeout(removeTimer);
    }

    setTimeout(() => {
      notification.show = true;
    }, 10);

    hideTimer = setTimeout(() => {
      notification.show = false;
      removeTimer = setTimeout(() => {
        notification.visible = false;
      }, 500);
    }, 3000);
  };

  return { notification, showNotification };
}

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
  setup(_, { emit }) {
    const formRef = ref(null);

    const handleSubmit = async () => {
      if (!formRef.value) return;

      const formData = new FormData(formRef.value);
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

        emit('success', {
          message: 'Успішний вхід',
          token: data?.token || '',
        });
      } catch (error) {
        emit('error', error.message || 'Сталася помилка під час авторизації');
      }
    };

    return { formRef, handleSubmit };
  },
  template: `
    <form ref="formRef" class="auth-form" novalidate @submit.prevent="handleSubmit">
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
  setup(_, { emit }) {
    const formRef = ref(null);
    const phoneInput = ref(null);
    const phoneError = ref('');
    let phoneMask = null;

    const showPhoneError = () => {
      if (!phoneMask) return;

      if (!phoneMask.masked.isComplete) {
        phoneError.value = 'Введіть номер у форматі +380 00 000 00 00';
      } else {
        phoneError.value = '';
      }
    };

    onMounted(() => {
      if (phoneInput.value) {
        phoneMask = IMask(phoneInput.value, {
          mask: '+{380} 00 000 00 00',
        });

        phoneInput.value.addEventListener('input', showPhoneError);
        phoneInput.value.addEventListener('blur', showPhoneError);
      }
    });

    const handleSubmit = async () => {
      if (!formRef.value) return;

      if (!phoneMask || !phoneMask.masked.isComplete) {
        showPhoneError();
        if (phoneInput.value) {
          phoneInput.value.focus();
        }
        return;
      }

      const formData = new FormData(formRef.value);
      const payload = {
        email: formData.get('email'),
        password: formData.get('password'),
        lastName: formData.get('lastName'),
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName') || '',
        gender: formData.get('gender') || null,
        birthDate: formData.get('birthDate'),
        phone: phoneMask.value,
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

        emit('success', {
          message: 'Реєстрація успішна',
          token: data?.token || '',
        });
      } catch (error) {
        emit('error', error.message || 'Сталася помилка під час реєстрації');
      }
    };

    return {
      formRef,
      phoneInput,
      phoneError,
      handleSubmit,
    };
  },
  template: `
    <form ref="formRef" class="auth-form" novalidate @submit.prevent="handleSubmit">
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
  setup(props) {
    const { notification, showNotification } = useNotification();

    const handleSuccess = ({ message, token }) => {
      if (token) {
        try {
          localStorage.setItem('authToken', token);
        } catch (error) {
          console.error('Не вдалося зберегти токен', error);
        }
      }
      showNotification(message, 'success');
      window.location.href = './admin.html';
    };

    const handleError = (message) => {
      showNotification(message, 'error');
    };

    return {
      notification,
      handleSuccess,
      handleError,
      title: props.page === 'login' ? 'Авторизація' : 'Реєстрація',
    };
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

const appContainer = document.getElementById('app');

if (appContainer) {
  const page = appContainer.dataset.page === 'register' ? 'register' : 'login';

  createApp(AuthPage, { page }).mount('#app');
}
