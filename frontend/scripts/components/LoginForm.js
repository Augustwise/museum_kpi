const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:3000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

export default {
  name: 'LoginForm',
  emits: ['success', 'error'],
  data() {
    return {
      email: '',
      password: '',
      loading: false,
    };
  },
  methods: {
    async submitForm() {
      if (this.loading) return;
      this.loading = true;

      const payload = {
        email: this.email,
        password: this.password,
      };

      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || 'Помилка авторизації');
        }

        if (data && data.token) {
          try {
            localStorage.setItem('authToken', data.token);
          } catch (_) {
            /* ignore storage errors */
          }
        }

        this.$emit('success');
      } catch (error) {
        this.$emit('error', error.message || 'Сталася помилка під час авторизації');
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <form class="auth-form" novalidate @submit.prevent="submitForm">
      <label class="auth-label">Email
        <input
          v-model="email"
          type="email"
          name="email"
          required
          autocomplete="email"
          class="auth-input"
        />
      </label>

      <label class="auth-label">Пароль
        <input
          v-model="password"
          type="password"
          name="password"
          required
          minlength="6"
          autocomplete="current-password"
          class="auth-input"
        />
      </label>

      <button type="submit" class="auth-submit" :disabled="loading">
        {{ loading ? 'Зачекайте…' : 'Увійти' }}
      </button>
    </form>
  `,
};
