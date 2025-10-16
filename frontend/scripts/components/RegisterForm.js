import IMask from 'imask';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:3000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

export default {
  name: 'RegisterForm',
  emits: ['success', 'error'],
  data() {
    return {
      form: {
        email: '',
        password: '',
        lastName: '',
        firstName: '',
        middleName: '',
        gender: null,
        birthDate: '',
        phone: '',
      },
      loading: false,
      phoneError: '',
      phoneMask: null,
    };
  },
  mounted() {
    const phoneInput = this.$refs.phoneInput;
    if (!phoneInput) return;

    this.phoneMask = IMask(phoneInput, {
      mask: '+{380} 00 000 00 00',
    });

    const updatePhone = () => {
      this.form.phone = this.phoneMask.value;
      this.checkPhone();
    };

    this.phoneMask.on('accept', updatePhone);
    this.phoneMask.on('complete', updatePhone);

    updatePhone();
  },
  beforeUnmount() {
    if (this.phoneMask) {
      this.phoneMask.destroy();
      this.phoneMask = null;
    }
  },
  methods: {
    checkPhone() {
      if (!this.phoneMask) return;
      if (!this.phoneMask.masked.isComplete) {
        this.phoneError = 'Введіть номер у форматі +380 00 000 00 00';
      } else {
        this.phoneError = '';
      }
    },
    async submitForm() {
      if (this.loading) return;
      this.loading = true;

      if (!this.phoneMask || !this.phoneMask.masked.isComplete) {
        this.checkPhone();
        if (this.$refs.phoneInput) {
          this.$refs.phoneInput.focus();
        }
        this.loading = false;
        return;
      }

      const payload = {
        email: this.form.email,
        password: this.form.password,
        lastName: this.form.lastName,
        firstName: this.form.firstName,
        middleName: this.form.middleName || '',
        gender: this.form.gender || null,
        birthDate: this.form.birthDate,
        phone: this.form.phone,
      };

      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || 'Помилка реєстрації');
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
        this.$emit('error', error.message || 'Сталася помилка під час реєстрації');
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <form class="auth-form" novalidate @submit.prevent="submitForm">
      <label class="auth-label">Email
        <input
          v-model="form.email"
          type="email"
          name="email"
          required
          autocomplete="email"
          class="auth-input"
        />
      </label>

      <label class="auth-label">Пароль
        <input
          v-model="form.password"
          type="password"
          name="password"
          required
          minlength="6"
          autocomplete="new-password"
          class="auth-input"
        />
      </label>

      <label class="auth-label">Прізвище
        <input
          v-model="form.lastName"
          type="text"
          name="lastName"
          required
          class="auth-input"
        />
      </label>

      <label class="auth-label">Ім’я
        <input
          v-model="form.firstName"
          type="text"
          name="firstName"
          required
          class="auth-input"
        />
      </label>

      <label class="auth-label">По батькові
        <input
          v-model="form.middleName"
          type="text"
          name="middleName"
          class="auth-input"
        />
      </label>

      <label class="auth-label">Номер телефону
        <input
          ref="phoneInput"
          type="tel"
          name="phone"
          required
          inputmode="tel"
          placeholder="+380 00 000 00 00"
          class="auth-input"
          autocomplete="tel"
        />
        <p class="auth-error" aria-live="polite">{{ phoneError }}</p>
      </label>

      <fieldset class="auth-fieldset">
        <legend class="auth-label auth-legend">Стать (необовʼязково)</legend>
        <label class="auth-radio">
          <input type="radio" value="male" v-model="form.gender" />
          <span>Чоловік</span>
        </label>
        <label class="auth-radio">
          <input type="radio" value="female" v-model="form.gender" />
          <span>Жінка</span>
        </label>
      </fieldset>

      <label class="auth-label">Дата народження
        <input
          v-model="form.birthDate"
          type="date"
          name="birthDate"
          required
          class="auth-input"
        />
      </label>

      <button type="submit" class="auth-submit" :disabled="loading">
        {{ loading ? 'Зачекайте…' : 'Зареєструватися' }}
      </button>
    </form>
  `,
};
