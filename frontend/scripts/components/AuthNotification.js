export default {
  name: 'AuthNotification',
  props: {
    message: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'success',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    show: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div
      v-if="visible"
      :class="['notification', type, { show }]"
      aria-live="polite"
    >
      {{ message }}
    </div>
  `,
};
