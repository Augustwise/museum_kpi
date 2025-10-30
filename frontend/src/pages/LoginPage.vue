<template>
  <div class="auth-card">
    <h1 class="auth-title">Авторизація</h1>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-label">
        Електронна пошта
        <input
          v-model.trim="email"
          class="auth-input"
          :class="{ 'auth-input--error': emailErrorVisible }"
          type="email"
          name="email"
          autocomplete="email"
          required
          @blur="markTouched('email')"
        />
        <p v-if="emailErrorVisible" class="auth-error">{{ errors.email }}</p>
      </label>
      <label class="auth-label">
        Пароль
        <input
          v-model.trim="password"
          class="auth-input"
          :class="{ 'auth-input--error': passwordErrorVisible }"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          @blur="markTouched('password')"
        />
        <p v-if="passwordErrorVisible" class="auth-error">{{ errors.password }}</p>
      </label>
      <button class="auth-submit" type="submit">Увійти</button>
    </form>
    <p class="auth-actions">
      Ще не маєте акаунта?
      <a href="./register.html">Зареєструватися</a>
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

const email = ref('');
const password = ref('');

const errors = reactive({
  email: '',
  password: '',
});

const touched = reactive({
  email: false,
  password: false,
});

const validateEmail = (value) => {
  if (!value) {
    return 'Введіть електронну пошту';
  }

  if (!value.includes('@')) {
    return 'Електронна пошта має містити символ "@"';
  }

  return '';
};

const validatePassword = (value) => {
  if (!value) {
    return 'Введіть пароль';
  }

  if (value.length < 6) {
    return 'Пароль має містити щонайменше 6 символів';
  }

  return '';
};

const updateError = (field) => {
  if (field === 'email') {
    errors.email = validateEmail(email.value);
  }

  if (field === 'password') {
    errors.password = validatePassword(password.value);
  }
};

watch(email, () => {
  if (touched.email) {
    updateError('email');
  }
});

watch(password, () => {
  if (touched.password) {
    updateError('password');
  }
});

const markTouched = (field) => {
  touched[field] = true;
  updateError(field);
};

const emailErrorVisible = computed(() => touched.email && Boolean(errors.email));
const passwordErrorVisible = computed(() => touched.password && Boolean(errors.password));

const handleSubmit = async () => {
  markTouched('email');
  markTouched('password');

  if (errors.email || errors.password) {
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Не вдалося увійти.');
    }

    if (payload.user) {
      localStorage.setItem('museumUser', JSON.stringify(payload.user));
    }

    email.value = '';
    password.value = '';

    touched.email = false;
    touched.password = false;
    errors.email = '';
    errors.password = '';

    window.location.href = './Exhibitions.html';
  } catch (error) {
    alert(error.message || 'Не вдалося увійти.');
  }
};
</script>
