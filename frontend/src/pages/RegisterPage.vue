<template>
  <div class="auth-card">
    <h1 class="auth-title">Реєстрація</h1>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-label">
        Електронна пошта
        <input
          v-model.trim="form.email"
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
          v-model.trim="form.password"
          class="auth-input"
          :class="{ 'auth-input--error': passwordErrorVisible }"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          @blur="markTouched('password')"
        />
        <p v-if="passwordErrorVisible" class="auth-error">
          {{ errors.password }}
        </p>
      </label>
      <label class="auth-label">
        Прізвище
        <input
          v-model="form.lastName"
          class="auth-input"
          :class="{ 'auth-input--error': lastNameErrorVisible }"
          type="text"
          name="lastName"
          autocomplete="family-name"
          required
          @blur="markTouched('lastName')"
        />
        <p v-if="lastNameErrorVisible" class="auth-error">
          {{ errors.lastName }}
        </p>
      </label>
      <label class="auth-label">
        Імʼя
        <input
          v-model="form.firstName"
          class="auth-input"
          :class="{ 'auth-input--error': firstNameErrorVisible }"
          type="text"
          name="firstName"
          autocomplete="given-name"
          required
          @blur="markTouched('firstName')"
        />
        <p v-if="firstNameErrorVisible" class="auth-error">
          {{ errors.firstName }}
        </p>
      </label>
      <label class="auth-label">
        По батькові
        <input
          v-model="form.middleName"
          class="auth-input"
          :class="{ 'auth-input--error': middleNameErrorVisible }"
          type="text"
          name="middleName"
          autocomplete="additional-name"
          required
          @blur="markTouched('middleName')"
        />
        <p v-if="middleNameErrorVisible" class="auth-error">
          {{ errors.middleName }}
        </p>
      </label>
      <fieldset class="auth-fieldset">
        <legend class="auth-legend">Стать</legend>
        <label class="auth-radio">
          <input
            v-model="form.gender"
            type="radio"
            name="gender"
            value="female"
          />
          Жіноча
        </label>
        <label class="auth-radio">
          <input
            v-model="form.gender"
            type="radio"
            name="gender"
            value="male"
          />
          Чоловіча
        </label>
      </fieldset>
      <label class="auth-label">
        Дата народження
        <input
          v-model="form.birthDate"
          class="auth-input"
          :class="{ 'auth-input--error': birthDateErrorVisible }"
          type="date"
          name="birthDate"
          required
          @blur="markTouched('birthDate')"
        />
        <p v-if="birthDateErrorVisible" class="auth-error">
          {{ errors.birthDate }}
        </p>
      </label>
      <label class="auth-label">
        Телефон
        <input
          ref="phoneField"
          v-model="form.phone"
          class="auth-input"
          :class="{ 'auth-input--error': phoneErrorVisible }"
          type="tel"
          name="phone"
          placeholder="+380 00 000 00 00"
          required
          @blur="markTouched('phone')"
        />
        <p v-if="phoneErrorVisible" class="auth-error">{{ errors.phone }}</p>
      </label>
      <button class="auth-submit" type="submit">Зареєструватися</button>
    </form>
    <p class="auth-actions">
      Вже маєте акаунт?
      <a href="./login.html">Увійти</a>
    </p>
    <section class="users-section" aria-labelledby="usersTitle">
      <h2 id="usersTitle" class="users-title">Користувачі</h2>
      <div v-if="users.length > 0" class="users-actions">
        <button
          class="users-action-btn users-action-btn--delete"
          :disabled="selectedUsers.length === 0"
          @click="deleteSelectedUsers"
        >
          Видалити обрані ({{ selectedUsers.length }})
        </button>
        <button
          class="users-action-btn users-action-btn--duplicate"
          :disabled="selectedUsers.length === 0"
          @click="duplicateSelectedUsers"
        >
          Дублювати обрані ({{ selectedUsers.length }})
        </button>
      </div>
      <div class="users-table-wrapper">
        <table class="users-table" aria-describedby="usersCaption">
          <caption id="usersCaption" class="visually-hidden">
            Список користувачів, доданих під час поточного сеансу
          </caption>
          <thead>
            <tr>
              <th scope="col" class="cell-checkbox">
                <input
                  ref="selectAllCheckbox"
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  aria-label="Вибрати всі рядки"
                />
              </th>
              <th scope="col">№</th>
              <th scope="col">ПІБ</th>
              <th scope="col">Email</th>
              <th scope="col">Стать</th>
              <th scope="col">Телефон</th>
              <th scope="col">Дата народження</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!users.length">
              <td class="empty-row" colspan="7">
                Поки що немає зареєстрованих користувачів
              </td>
            </tr>
            <tr v-for="(user, index) in users" :key="`${user.email}-${index}`">
              <td class="cell-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedUsers.includes(index)"
                  @change="toggleUserSelection(index)"
                  :aria-label="`Вибрати користувача ${formatFullName(user)}`"
                />
              </td>
              <td class="cell-index">{{ index + 1 }}</td>
              <td class="cell-name">{{ formatFullName(user) }}</td>
              <td>{{ user.email }}</td>
              <td>{{ formatGender(user.gender) }}</td>
              <td>{{ user.phone }}</td>
              <td>{{ formatBirthDate(user.birthDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import IMask from "imask";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";

const form = reactive({
  email: "",
  password: "",
  lastName: "",
  firstName: "",
  middleName: "",
  gender: "",
  birthDate: "",
  phone: "",
});

const phoneField = ref(null);
const selectAllCheckbox = ref(null);
let phoneMask;

const errors = reactive({
  email: "",
  password: "",
  lastName: "",
  firstName: "",
  middleName: "",
  birthDate: "",
  phone: "",
});

const touched = reactive({
  email: false,
  password: false,
  lastName: false,
  firstName: false,
  middleName: false,
  birthDate: false,
  phone: false,
});

const users = ref([]);
const selectedUsers = ref([]);

onMounted(() => {
  if (phoneField.value) {
    phoneMask = IMask(phoneField.value, {
      mask: "+{380} 00 000 00 00",
      lazy: false,
    });
  }
});

onBeforeUnmount(() => {
  phoneMask?.destroy();
});

const validateEmail = (value) => {
  if (!value) {
    return "Введіть електронну пошту";
  }

  if (!value.includes("@")) {
    return 'Електронна пошта має містити символ "@"';
  }

  return "";
};

const validatePassword = (value) => {
  if (!value) {
    return "Введіть пароль";
  }

  if (value.length < 6) {
    return "Пароль має містити щонайменше 6 символів";
  }

  return "";
};

const validateLastName = (value) => {
  if (!value.trim()) {
    return "Введіть прізвище";
  }

  return "";
};

const validateFirstName = (value) => {
  if (!value.trim()) {
    return "Введіть імʼя";
  }

  return "";
};

const validateMiddleName = (value) => {
  if (!value.trim()) {
    return "Введіть по батькові";
  }

  return "";
};

const validateBirthDate = (value) => {
  if (!value) {
    return "Оберіть дату народження";
  }

  return "";
};

const validatePhone = (value) => {
  const digits = value.replace(/\D/g, "");
  const localPart = digits.startsWith("380") ? digits.slice(3) : digits;

  if (!localPart.length) {
    return "Введіть номер телефону";
  }

  return "";
};

const updateError = (field) => {
  if (field === "email") {
    errors.email = validateEmail(form.email);
  }

  if (field === "password") {
    errors.password = validatePassword(form.password);
  }

  if (field === "lastName") {
    errors.lastName = validateLastName(form.lastName);
  }

  if (field === "firstName") {
    errors.firstName = validateFirstName(form.firstName);
  }

  if (field === "middleName") {
    errors.middleName = validateMiddleName(form.middleName);
  }

  if (field === "birthDate") {
    errors.birthDate = validateBirthDate(form.birthDate);
  }

  if (field === "phone") {
    errors.phone = validatePhone(form.phone);
  }
};

watch(
  () => form.email,
  () => {
    if (touched.email) {
      updateError("email");
    }
  }
);

watch(
  () => form.password,
  () => {
    if (touched.password) {
      updateError("password");
    }
  }
);

watch(
  () => form.lastName,
  () => {
    if (touched.lastName) {
      updateError("lastName");
    }
  }
);

watch(
  () => form.firstName,
  () => {
    if (touched.firstName) {
      updateError("firstName");
    }
  }
);

watch(
  () => form.middleName,
  () => {
    if (touched.middleName) {
      updateError("middleName");
    }
  }
);

watch(
  () => form.birthDate,
  () => {
    if (touched.birthDate) {
      updateError("birthDate");
    }
  }
);

watch(
  () => form.phone,
  () => {
    if (touched.phone) {
      updateError("phone");
    }
  }
);

const markTouched = (field) => {
  touched[field] = true;
  updateError(field);
};

const emailErrorVisible = computed(
  () => touched.email && Boolean(errors.email)
);
const passwordErrorVisible = computed(
  () => touched.password && Boolean(errors.password)
);
const lastNameErrorVisible = computed(
  () => touched.lastName && Boolean(errors.lastName)
);
const firstNameErrorVisible = computed(
  () => touched.firstName && Boolean(errors.firstName)
);
const middleNameErrorVisible = computed(
  () => touched.middleName && Boolean(errors.middleName)
);
const birthDateErrorVisible = computed(
  () => touched.birthDate && Boolean(errors.birthDate)
);
const phoneErrorVisible = computed(
  () => touched.phone && Boolean(errors.phone)
);

const resetForm = () => {
  form.email = "";
  form.password = "";
  form.lastName = "";
  form.firstName = "";
  form.middleName = "";
  form.gender = "";
  form.birthDate = "";
  form.phone = "";

  if (phoneMask) {
    phoneMask.value = "";
    phoneMask.updateValue();
  }

  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  Object.keys(touched).forEach((key) => {
    touched[key] = false;
  });
};

const handleSubmit = () => {
  markTouched("email");
  markTouched("password");
  markTouched("lastName");
  markTouched("firstName");
  markTouched("middleName");
  markTouched("birthDate");
  markTouched("phone");

  if (
    errors.email ||
    errors.password ||
    errors.lastName ||
    errors.firstName ||
    errors.middleName ||
    errors.birthDate ||
    errors.phone
  ) {
    return;
  }

  users.value.push({
    email: form.email,
    lastName: form.lastName,
    firstName: form.firstName,
    middleName: form.middleName,
    gender: form.gender,
    birthDate: form.birthDate,
    phone: form.phone,
  });

  resetForm();

  // Clear selection when new user is added
  selectedUsers.value = [];
};

const formatFullName = (user) => {
  const parts = [user.lastName, user.firstName, user.middleName].filter(
    Boolean
  );
  return parts.length ? parts.join(" ") : "—";
};

const formatGender = (value) => {
  if (value === "female") {
    return "Жіноча";
  }

  if (value === "male") {
    return "Чоловіча";
  }

  return "Не вказано";
};

const formatBirthDate = (value) => {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

// Checkbox selection logic
const isAllSelected = computed(() => {
  return (
    users.value.length > 0 && selectedUsers.value.length === users.value.length
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedUsers.value.length > 0 &&
    selectedUsers.value.length < users.value.length
  );
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = [];
  } else {
    selectedUsers.value = users.value.map((_, index) => index);
  }
};

const toggleUserSelection = (index) => {
  const selectedIndex = selectedUsers.value.indexOf(index);
  if (selectedIndex === -1) {
    selectedUsers.value.push(index);
  } else {
    selectedUsers.value.splice(selectedIndex, 1);
  }
};

const deleteSelectedUsers = () => {
  if (selectedUsers.value.length === 0) return;

  // Sort indices in descending order to avoid index shifting issues
  const sortedIndices = [...selectedUsers.value].sort((a, b) => b - a);

  sortedIndices.forEach((index) => {
    users.value.splice(index, 1);
  });

  selectedUsers.value = [];
};

const duplicateSelectedUsers = () => {
  if (selectedUsers.value.length === 0) return;

  const usersToDuplicate = selectedUsers.value.map((index) => ({
    ...users.value[index],
  }));
  users.value.push(...usersToDuplicate);

  selectedUsers.value = [];
};

// Watch users array changes to update selection
watch(
  () => users.value.length,
  () => {
    // Remove invalid selections when users are deleted
    selectedUsers.value = selectedUsers.value.filter(
      (index) => index < users.value.length
    );
  }
);

// Watch for indeterminate state changes
watch(
  [isAllSelected, isIndeterminate],
  () => {
    if (selectAllCheckbox.value) {
      selectAllCheckbox.value.indeterminate = isIndeterminate.value;
    }
  },
  { flush: "post" }
);
</script>
