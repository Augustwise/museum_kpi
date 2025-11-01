const ADMIN_KEY = 'museumAdmin';

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
    editButton.addEventListener('click', () => populateForm(exhibition));

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

function setSubmitButtonText(isEditing) {
  const button = document.querySelector(
    '#exhibitionForm button[type="submit"]'
  );

  if (!button) {
    return;
  }

  button.textContent = isEditing ? 'Оновити' : 'Зберегти';
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

function populateForm(exhibition) {
  const form = document.getElementById('exhibitionForm');

  if (!form) {
    return;
  }

  document.getElementById('exhibitionId').value = exhibition.id;
  document.getElementById('exhibitionName').value = exhibition.name;
  document.getElementById('exhibitionImage').value = exhibition.imageUrl || '';
  document.getElementById('exhibitionStart').value = exhibition.startDate;
  document.getElementById('exhibitionEnd').value = exhibition.endDate;
  document.getElementById('exhibitionSeats').value = exhibition.availableSeats;
  setSubmitButtonText(true);
}

function resetForm() {
  const form = document.getElementById('exhibitionForm');

  if (!form) {
    return;
  }

  form.reset();
  document.getElementById('exhibitionId').value = '';
  setSubmitButtonText(false);
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
    resetForm();
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
  const loginForm = document.getElementById('adminLoginForm');
  const exhibitionForm = document.getElementById('exhibitionForm');
  const logoutButton = document.getElementById('logoutButton');
  const resetFormButton = document.getElementById('resetFormButton');

  const admin = readAdmin();
  const isAuthorized = Boolean(admin);
  toggleVisibility(isAuthorized);
  setSubmitButtonText(false);

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
        resetForm();
        await refreshExhibitions();
        loginForm.reset();
      } catch (error) {
        alert(error.message || 'Не вдалося увійти.');
      }
    });
  }

  if (exhibitionForm) {
    exhibitionForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const adminData = readAdmin();

      if (!adminData) {
        alert('Потрібно авторизуватися.');
        return;
      }

      const id = document.getElementById('exhibitionId').value;
      const name = document.getElementById('exhibitionName').value.trim();
      const imageUrl = document.getElementById('exhibitionImage').value.trim();
      const startDate = document.getElementById('exhibitionStart').value;
      const endDate = document.getElementById('exhibitionEnd').value;
      const availableSeats = document.getElementById('exhibitionSeats').value;

      if (!name || !startDate || !endDate) {
        alert('Будь ласка, заповніть усі обов\'язкові поля.');
        return;
      }

      const payload = {
        adminId: adminData.id,
        name,
        imageUrl: imageUrl || null,
        startDate,
        endDate,
        availableSeats,
      };

      const url = id
        ? `/api/admin/exhibitions/${id}`
        : '/api/admin/exhibitions';

      const method = id ? 'PUT' : 'POST';

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
      }
    });
  }

  if (resetFormButton) {
    resetFormButton.addEventListener('click', () => {
      resetForm();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      saveAdmin(null);
      resetForm();
      toggleVisibility(false);
    });
  }
});
