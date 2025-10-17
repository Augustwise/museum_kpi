<template>
  <div class="auth-card">
    <h1 class="auth-title">Реєстрація</h1>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-label">
        Електронна пошта
        <input
          v-model="form.email"
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
          v-model="form.password"
          class="auth-input"
          type="password"
          name="password"
          autocomplete="new-password"
          required
        />
      </label>
      <label class="auth-label">
        Прізвище
        <input
          v-model="form.lastName"
          class="auth-input"
          type="text"
          name="lastName"
          autocomplete="family-name"
        />
      </label>
      <label class="auth-label">
        Імʼя
        <input
          v-model="form.firstName"
          class="auth-input"
          type="text"
          name="firstName"
          autocomplete="given-name"
        />
      </label>
      <label class="auth-label">
        По батькові
        <input
          v-model="form.middleName"
          class="auth-input"
          type="text"
          name="middleName"
          autocomplete="additional-name"
        />
      </label>
      <fieldset class="auth-fieldset">
        <legend class="auth-legend">Стать</legend>
        <label class="auth-radio">
          <input v-model="form.gender" type="radio" name="gender" value="female" />
          Жіноча
        </label>
        <label class="auth-radio">
          <input v-model="form.gender" type="radio" name="gender" value="male" />
          Чоловіча
        </label>
      </fieldset>
      <label class="auth-label">
        Дата народження
        <input
          v-model="form.birthDate"
          class="auth-input"
          type="date"
          name="birthDate"
        />
      </label>
      <label class="auth-label">
        Телефон
        <input
          ref="phoneField"
          v-model="form.phone"
          class="auth-input"
          type="tel"
          name="phone"
          placeholder="+380 00 000 00 00"
        />
      </label>
      <button class="auth-submit" type="submit" data-redirect="admin">Зареєструватися</button>
    </form>
    <p class="auth-actions">
      Вже маєте акаунт?
      <a href="./login.html">Увійти</a>
    </p>
  </div>
</template>

<script setup>
import IMask from 'imask';
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';

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

const phoneField = ref(null);
let phoneMask;

onMounted(() => {
  if (phoneField.value) {
    phoneMask = IMask(phoneField.value, {
      mask: '+{380} 00 000 00 00',
      lazy: false,
    });
  }
});

onBeforeUnmount(() => {
  phoneMask?.destroy();
});

const handleSubmit = () => {
  window.location.href = './admin.html';
};
</script>
