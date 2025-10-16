import '../styles/main.scss';

import AuthLayout from './components/AuthLayout.js';
import AuthNotification from './components/AuthNotification.js';
import RegisterForm from './components/RegisterForm.js';

const { createApp } = window.Vue || {};

if (!createApp) {
  throw new Error('Vue is not loaded. Please ensure the Vue CDN script is included.');
}

const app = createApp({
  components: {
    AuthLayout,
    AuthNotification,
    RegisterForm,
  },
  data() {
    return {
      notification: {
        message: '',
        type: 'success',
        visible: false,
        show: false,
      },
      hideTimeoutId: null,
      cleanupTimeoutId: null,
    };
  },
  methods: {
    showNotification(message, type = 'success') {
      this.notification.message = message;
      this.notification.type = type;
      this.notification.visible = true;
      this.notification.show = false;

      if (this.hideTimeoutId) {
        clearTimeout(this.hideTimeoutId);
        this.hideTimeoutId = null;
      }

      if (this.cleanupTimeoutId) {
        clearTimeout(this.cleanupTimeoutId);
        this.cleanupTimeoutId = null;
      }

      requestAnimationFrame(() => {
        this.notification.show = true;
      });

      this.hideTimeoutId = setTimeout(() => {
        this.notification.show = false;
        this.cleanupTimeoutId = setTimeout(() => {
          this.notification.visible = false;
          this.cleanupTimeoutId = null;
        }, 500);
        this.hideTimeoutId = null;
      }, 3000);
    },
    handleRegisterSuccess() {
      this.showNotification('Реєстрація успішна');
      setTimeout(() => {
        window.location.href = './admin.html';
      }, 1000);
    },
    handleError(message) {
      this.showNotification(message, 'error');
    },
  },
  template: `
    <div>
      <auth-notification
        :message="notification.message"
        :type="notification.type"
        :visible="notification.visible"
        :show="notification.show"
      ></auth-notification>

      <auth-layout
        title="Реєстрація"
        question-text="Вже маєте акаунт?"
        link-text="Увійти"
        link-href="./login.html"
      >
        <register-form @success="handleRegisterSuccess" @error="handleError" />
      </auth-layout>
    </div>
  `,
});

app.mount('#app');
