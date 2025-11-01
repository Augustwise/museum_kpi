const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('admin-login-form');
const logoutButton = document.getElementById('admin-logout');
const notificationElement = document.getElementById('notification');
const adminNameElement = document.getElementById('admin-name');

const exhibitionForm = document.getElementById('exhibition-form');
const formTitleElement = document.getElementById('form-title');
const formSubmitButton = document.getElementById('form-submit');
const cancelEditButton = document.getElementById('cancel-edit');
const exhibitionsTableBody = document.getElementById('exhibitions-table-body');

const exhibitionNameInput = document.getElementById('exhibition-name');
const exhibitionImageInput = document.getElementById('exhibition-image');
const exhibitionStartInput = document.getElementById('exhibition-start');
const exhibitionEndInput = document.getElementById('exhibition-end');
const exhibitionSeatsInput = document.getElementById('exhibition-seats');

let currentAdmin = null;
let editingExhibitionId = null;

function showNotification(message, duration = 2500) {
  if (!notificationElement) {
    return;
  }

  notificationElement.textContent = message;
  notificationElement.classList.add('notification--visible');

  setTimeout(() => {
    notificationElement.classList.remove('notification--visible');
  }, duration);
}

function saveAdmin(admin) {
  currentAdmin = admin;
  localStorage.setItem('museumAdmin', JSON.stringify(admin));
}

function clearAdmin() {
  currentAdmin = null;
  localStorage.removeItem('museumAdmin');
}

function loadAdminFromStorage() {
  const stored = localStorage.getItem('museumAdmin');

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);

    if (parsed && parsed.id) {
      currentAdmin = parsed;
      return parsed;
    }
  } catch (error) {
    console.error('Unable to parse stored admin', error);
    localStorage.removeItem('museumAdmin');
  }

  return null;
}

function updateLayout() {
  if (currentAdmin) {
    loginSection.hidden = true;
    adminSection.hidden = false;
    adminNameElement.textContent = `${currentAdmin.firstName} ${currentAdmin.lastName}`;
    loadExhibitions();
  } else {
    loginSection.hidden = false;
    adminSection.hidden = true;
    adminNameElement.textContent = '';
    exhibitionsTableBody.innerHTML = '';
  }
}

function getAdminHeaders() {
  if (!currentAdmin) {
    return {};
  }

  return {
    'Content-Type': 'application/json',
    'X-Admin-Id': currentAdmin.id,
  };
}

async function request(url, options = {}) {
  const config = {
    ...options,
    headers: {
      ...getAdminHeaders(),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = 'Сталася помилка. Спробуйте ще раз.';

    try {
      const payload = await response.json();
      if (payload && payload.error) {
        errorMessage = payload.error;
      }
    } catch (error) {
      // ignore parsing errors
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadExhibitions() {
  if (!currentAdmin) {
    return;
  }

  try {
    const data = await request('/api/admin/exhibitions', {
      method: 'GET',
      headers: getAdminHeaders(),
    });

    renderExhibitions(data.exhibitions || []);
  } catch (error) {
    showNotification(error.message || 'Не вдалося отримати список виставок.');
  }
}

function renderExhibitions(exhibitions) {
  exhibitionsTableBody.innerHTML = '';

  if (!exhibitions.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Виставок поки немає.';
    emptyRow.appendChild(cell);
    exhibitionsTableBody.appendChild(emptyRow);
    return;
  }

  exhibitions.forEach((exhibition) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${exhibition.id}</td>
      <td>${exhibition.name}</td>
      <td>${exhibition.startDate}</td>
      <td>${exhibition.endDate}</td>
      <td>${exhibition.availableSeats}</td>
      <td>${exhibition.adminName || '—'}</td>
      <td></td>
    `;

    const actionsCell = row.lastElementChild;
    actionsCell.classList.add('table__actions');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'button button--light';
    editButton.textContent = 'Редагувати';
    editButton.addEventListener('click', () => startEdit(exhibition));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button';
    deleteButton.textContent = 'Видалити';
    deleteButton.addEventListener('click', () => deleteExhibition(exhibition.id));

    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);

    exhibitionsTableBody.appendChild(row);
  });
}

function resetForm() {
  exhibitionForm.reset();
  editingExhibitionId = null;
  formTitleElement.textContent = 'Створити нову виставку';
  formSubmitButton.textContent = 'Зберегти';
  cancelEditButton.hidden = true;
}

function fillForm(exhibition) {
  exhibitionNameInput.value = exhibition.name || '';
  exhibitionImageInput.value = exhibition.imageUrl || '';
  exhibitionStartInput.value = exhibition.startDate || '';
  exhibitionEndInput.value = exhibition.endDate || '';
  exhibitionSeatsInput.value = exhibition.availableSeats ?? '';
}

function startEdit(exhibition) {
  editingExhibitionId = exhibition.id;
  formTitleElement.textContent = `Редагувати виставку #${exhibition.id}`;
  formSubmitButton.textContent = 'Оновити';
  cancelEditButton.hidden = false;
  fillForm(exhibition);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteExhibition(id) {
  if (!currentAdmin) {
    return;
  }

  const confirmed = window.confirm('Видалити цю виставку?');

  if (!confirmed) {
    return;
  }

  try {
    await request(`/api/admin/exhibitions/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });

    showNotification('Виставку видалено.');
    loadExhibitions();
    if (editingExhibitionId === id) {
      resetForm();
    }
  } catch (error) {
    showNotification(error.message || 'Не вдалося видалити виставку.');
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;

    if (!email || !password) {
      showNotification('Заповніть електронну пошту та пароль.');
      return;
    }

    loginForm.querySelector('button[type="submit"]').disabled = true;

    try {
      const data = await request('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      saveAdmin(data.admin);
      showNotification('Вітаємо! Ви увійшли як адміністратор.');
      updateLayout();
    } catch (error) {
      showNotification(error.message || 'Не вдалося увійти.');
    } finally {
      loginForm.querySelector('button[type="submit"]').disabled = false;
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    clearAdmin();
    resetForm();
    updateLayout();
  });
}

if (cancelEditButton) {
  cancelEditButton.addEventListener('click', () => {
    resetForm();
  });
}

if (exhibitionForm) {
  exhibitionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentAdmin) {
      showNotification('Спочатку увійдіть як адміністратор.');
      return;
    }

    const payload = {
      name: exhibitionNameInput.value.trim(),
      imageUrl: exhibitionImageInput.value.trim() || null,
      startDate: exhibitionStartInput.value,
      endDate: exhibitionEndInput.value,
      availableSeats: Number(exhibitionSeatsInput.value),
    };

    if (!payload.name || !payload.startDate || !payload.endDate) {
      showNotification('Будь ласка, заповніть усі обов\'язкові поля.');
      return;
    }

    if (!Number.isFinite(payload.availableSeats)) {
      showNotification('Вкажіть коректну кількість місць.');
      return;
    }

    formSubmitButton.disabled = true;

    try {
      if (editingExhibitionId) {
        await request(`/api/admin/exhibitions/${editingExhibitionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showNotification('Виставку оновлено.');
      } else {
        await request('/api/admin/exhibitions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotification('Виставку створено.');
      }

      resetForm();
      loadExhibitions();
    } catch (error) {
      showNotification(error.message || 'Не вдалося зберегти виставку.');
    } finally {
      formSubmitButton.disabled = false;
    }
  });
}

loadAdminFromStorage();
updateLayout();
