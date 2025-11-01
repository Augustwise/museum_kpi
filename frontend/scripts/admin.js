const ADMIN_KEY = 'museumAdmin';

let exhibitionFormController = null;

function readAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to read admin data:', error);
    return null;
  }
}

function saveAdmin(admin) {
  if (!admin) {
    localStorage.removeItem(ADMIN_KEY);
    return;
  }

  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

function formatDatePart(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.replace(/-/g, '.');
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  return String(value);
}

function formatDateRange(startDate, endDate) {
  return `${formatDatePart(startDate)} — ${formatDatePart(endDate)}`;
}

function initExhibitionFormApp() {
  if (!window.Vue) {
    console.error('Vue is required for the exhibition form.');
    return null;
  }

  const target = document.getElementById('exhibitionApp');

  if (!target) {
    return null;
  }

  const { createApp, reactive, ref, computed, watch } = window.Vue;

  const defaultFormState = () => ({
    name: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    availableSeats: '',
  });

  const defaultErrorsState = () => ({
    name: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    availableSeats: '',
  });

  const defaultTouchedState = () => ({
    name: false,
    imageUrl: false,
    startDate: false,
    endDate: false,
    availableSeats: false,
  });

  const validateName = (value) => {
    if (!value.trim()) {
      return 'Введіть назву виставки';
    }

    if (value.trim().length < 3) {
      return 'Назва має містити щонайменше 3 символи';
    }

    return '';
  };

  const validateImageUrl = (value) => {
    if (!value) {
      return '';
    }

    try {
      const parsed = new URL(value);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'Посилання має бути дійсним URL';
      }

      return '';
    } catch (error) {
      return 'Посилання має бути дійсним URL';
    }
  };

  const validateStartDate = (startDate, endDate) => {
    if (!startDate) {
      return 'Оберіть дату початку';
    }

    if (endDate && startDate > endDate) {
      return 'Дата початку не може бути пізніше за дату завершення';
    }

    return '';
  };

  const validateEndDate = (endDate, startDate) => {
    if (!endDate) {
      return 'Оберіть дату завершення';
    }

    if (startDate && endDate < startDate) {
      return 'Дата завершення не може бути раніше дати початку';
    }

    return '';
  };

  const validateSeats = (value) => {
    if (value === '') {
      return 'Вкажіть кількість місць';
    }

    const seats = Number(value);

    if (!Number.isInteger(seats) || seats < 0) {
      return 'Вкажіть коректну кількість місць';
    }

    return '';
  };

  const app = createApp({
    setup() {
      const form = reactive(defaultFormState());
      const errors = reactive(defaultErrorsState());
      const touched = reactive(defaultTouchedState());
      const isSubmitting = ref(false);
      const isEditing = ref(false);
      const currentId = ref(null);

      const updateError = (field) => {
        if (field === 'name') {
          errors.name = validateName(form.name);
        }

        if (field === 'imageUrl') {
          errors.imageUrl = validateImageUrl(form.imageUrl);
        }

        if (field === 'startDate') {
          errors.startDate = validateStartDate(form.startDate, form.endDate);
        }

        if (field === 'endDate') {
          errors.endDate = validateEndDate(form.endDate, form.startDate);
        }

        if (field === 'availableSeats') {
          errors.availableSeats = validateSeats(form.availableSeats);
        }
      };

      const markTouched = (field) => {
        touched[field] = true;
        updateError(field);
      };

      watch(
        () => form.name,
        () => {
          if (touched.name) {
            updateError('name');
          }
        }
      );

      watch(
        () => form.imageUrl,
        () => {
          if (touched.imageUrl) {
            updateError('imageUrl');
          }
        }
      );

      watch(
        () => form.startDate,
        () => {
          if (touched.startDate) {
            updateError('startDate');
          }

          if (touched.endDate) {
            updateError('endDate');
          }
        }
      );

      watch(
        () => form.endDate,
        () => {
          if (touched.endDate) {
            updateError('endDate');
          }

          if (touched.startDate) {
            updateError('startDate');
          }
        }
      );

      watch(
        () => form.availableSeats,
        () => {
          if (touched.availableSeats) {
            updateError('availableSeats');
          }
        }
      );

      const nameErrorVisible = computed(
        () => touched.name && Boolean(errors.name)
      );

      const imageErrorVisible = computed(
        () => touched.imageUrl && Boolean(errors.imageUrl)
      );

      const startDateErrorVisible = computed(
        () => touched.startDate && Boolean(errors.startDate)
      );

      const endDateErrorVisible = computed(
        () => touched.endDate && Boolean(errors.endDate)
      );

      const seatsErrorVisible = computed(
        () => touched.availableSeats && Boolean(errors.availableSeats)
      );

      const submitLabel = computed(() =>
        isEditing.value ? 'Оновити' : 'Зберегти'
      );

      const hasErrors = () =>
        Boolean(
          errors.name ||
            errors.imageUrl ||
            errors.startDate ||
            errors.endDate ||
            errors.availableSeats
        );

      const resetTouched = () => {
        Object.keys(touched).forEach((key) => {
          touched[key] = false;
        });
      };

      const resetErrors = () => {
        Object.keys(errors).forEach((key) => {
          errors[key] = '';
        });
      };

      const resetForm = () => {
        form.name = '';
        form.imageUrl = '';
        form.startDate = '';
        form.endDate = '';
        form.availableSeats = '';
        currentId.value = null;
        isEditing.value = false;
        resetErrors();
        resetTouched();
      };

      const setFormData = (exhibition) => {
        form.name = exhibition.name || '';
        form.imageUrl = exhibition.imageUrl || '';
        form.startDate = exhibition.startDate || '';
        form.endDate = exhibition.endDate || '';
        form.availableSeats = exhibition.availableSeats?.toString() || '';
        currentId.value = exhibition.id || null;
        isEditing.value = Boolean(exhibition.id);
        resetErrors();
        resetTouched();
      };

      const markAllTouched = () => {
        markTouched('name');
        markTouched('imageUrl');
        markTouched('startDate');
        markTouched('endDate');
        markTouched('availableSeats');
      };

      const handleSubmit = async () => {
        markAllTouched();

        if (hasErrors()) {
          return;
        }

        const adminData = readAdmin();

        if (!adminData) {
          alert('Потрібно авторизуватися.');
          return;
        }

        const payload = {
          adminId: adminData.id,
          name: form.name.trim(),
          imageUrl: form.imageUrl ? form.imageUrl : null,
          startDate: form.startDate,
          endDate: form.endDate,
          availableSeats: Number(form.availableSeats),
        };

        const url = currentId.value
          ? `/api/admin/exhibitions/${currentId.value}`
          : '/api/admin/exhibitions';

        const method = currentId.value ? 'PUT' : 'POST';

        isSubmitting.value = true;

        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.error || 'Не вдалося зберегти виставку.');
          }

          resetForm();
          await refreshExhibitions();
        } catch (error) {
          alert(error.message || 'Не вдалося зберегти виставку.');
        } finally {
          isSubmitting.value = false;
        }
      };

      return {
        form,
        errors,
        isSubmitting,
        submitLabel,
        nameErrorVisible,
        imageErrorVisible,
        startDateErrorVisible,
        endDateErrorVisible,
        seatsErrorVisible,
        markTouched,
        handleSubmit,
        resetForm,
        setFormData,
      };
    },
  });

  return app.mount('#exhibitionApp');
}

function renderTable(exhibitions) {
  const tbody = document.getElementById('exhibitionsTableBody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  if (!exhibitions.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Наразі немає створених виставок.';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
    return;
  }

  exhibitions.forEach((exhibition) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.dataset.label = 'Назва';
    nameCell.textContent = exhibition.name;
    row.appendChild(nameCell);

    const periodCell = document.createElement('td');
    periodCell.dataset.label = 'Період';
    periodCell.textContent = formatDateRange(
      exhibition.startDate,
      exhibition.endDate
    );
    row.appendChild(periodCell);

    const seatsCell = document.createElement('td');
    seatsCell.dataset.label = 'Вільні місця';
    seatsCell.textContent = String(exhibition.availableSeats);
    row.appendChild(seatsCell);

    const adminCell = document.createElement('td');
    adminCell.dataset.label = 'Адміністратор';
    adminCell.textContent = exhibition.adminName || '—';
    row.appendChild(adminCell);

    const actionsCell = document.createElement('td');
    actionsCell.dataset.label = 'Дії';
    actionsCell.className = 'table-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'table-button';
    editButton.textContent = 'Редагувати';
    editButton.addEventListener('click', () => openExhibitionEditor(exhibition));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'table-button delete';
    deleteButton.textContent = 'Видалити';
    deleteButton.addEventListener('click', () => handleDelete(exhibition.id));

    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });
}

async function fetchExhibitions() {
  const admin = readAdmin();

  if (!admin) {
    return [];
  }

  const response = await fetch(`/api/admin/exhibitions?adminId=${admin.id}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = payload.error || 'Не вдалося отримати виставки.';
    throw new Error(error);
  }

  return payload.exhibitions || [];
}

function openExhibitionEditor(exhibition) {
  exhibitionFormController?.setFormData(exhibition);
}

function resetExhibitionForm() {
  exhibitionFormController?.resetForm();
}

async function handleDelete(exhibitionId) {
  if (!confirm('Видалити цю виставку?')) {
    return;
  }

  const admin = readAdmin();

  if (!admin) {
    alert('Потрібно авторизуватися.');
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/exhibitions/${exhibitionId}?adminId=${admin.id}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok && response.status !== 204) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Не вдалося видалити виставку.');
    }

    await refreshExhibitions();
    resetExhibitionForm();
  } catch (error) {
    alert(error.message || 'Не вдалося видалити виставку.');
  }
}

async function refreshExhibitions() {
  try {
    const exhibitions = await fetchExhibitions();
    renderTable(exhibitions);
  } catch (error) {
    alert(error.message || 'Не вдалося завантажити виставки.');
  }
}

function toggleVisibility(isAuthorized) {
  const loginSection = document.getElementById('loginSection');
  const managementSection = document.getElementById('managementSection');
  const scheduleSection = document.getElementById('scheduleSection');
  const logoutButton = document.getElementById('logoutButton');

  if (isAuthorized) {
    loginSection.classList.add('hidden');
    managementSection.classList.remove('hidden');
    scheduleSection.classList.remove('hidden');
    logoutButton.classList.remove('hidden');
  } else {
    loginSection.classList.remove('hidden');
    managementSection.classList.add('hidden');
    scheduleSection.classList.add('hidden');
    logoutButton.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  exhibitionFormController = initExhibitionFormApp();

  const loginForm = document.getElementById('adminLoginForm');
  const logoutButton = document.getElementById('logoutButton');

  const admin = readAdmin();
  const isAuthorized = Boolean(admin);
  toggleVisibility(isAuthorized);

  if (!isAuthorized) {
    resetExhibitionForm();
  }

  if (isAuthorized) {
    refreshExhibitions();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value.trim();

      if (!email || !password) {
        alert('Заповніть електронну пошту та пароль.');
        return;
      }

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Не вдалося увійти.');
        }

        if (!payload.admin) {
          throw new Error('Відповідь сервера некоректна.');
        }

        saveAdmin(payload.admin);
        toggleVisibility(true);
        resetExhibitionForm();
        await refreshExhibitions();
        loginForm.reset();
      } catch (error) {
        alert(error.message || 'Не вдалося увійти.');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      saveAdmin(null);
      resetExhibitionForm();
      toggleVisibility(false);
    });
  }
});
