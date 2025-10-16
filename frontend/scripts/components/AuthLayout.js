export default {
  name: 'AuthLayout',
  props: {
    title: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    linkText: {
      type: String,
      required: true,
    },
    linkHref: {
      type: String,
      required: true,
    },
  },
  template: `
    <main class="auth-card" role="main">
      <header style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <img src="./images/NAMU_logo.svg" alt="NAMU" width="32" height="32" />
        <h1 class="auth-title">{{ title }}</h1>
      </header>

      <slot></slot>

      <div class="auth-actions">
        <p>{{ questionText }} <a :href="linkHref">{{ linkText }}</a></p>
        <p style="margin-top:8px"><a href="./index.html">← На головну</a></p>
      </div>
    </main>
  `,
};
