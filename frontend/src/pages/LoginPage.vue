<template>
  <div class="auth-card">
    <h1 class="auth-title">Авторизація</h1>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-label">
        Електронна пошта
        <input
          v-model="email"
          class="auth-input"
          type="email"
          name="email"
          autocomplete="email"
          required
        />
      </label>
      <label class="auth-label">
        Пароль
        <input
          v-model="password"
          class="auth-input"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>
      <button class="auth-submit" type="submit" data-redirect="admin">Увійти</button>
    </form>
    <p class="auth-actions">
      Ще не маєте акаунта?
      <a href="./register.html">Зареєструватися</a>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const email = ref('');
const password = ref('');

const handleSubmit = () => {
  window.location.href = './admin.html';
};
</script>
