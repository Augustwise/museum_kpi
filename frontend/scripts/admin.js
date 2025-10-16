import '../styles/main.scss';
import '../styles/admin.scss';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    'http://localhost:3000';

  const token = (() => {
    try {
      return localStorage.getItem('authToken') || '';
    } catch {
      return '';
    }
  })();

  const authHeaders = (extra = {}) => ({
    ...extra,
    Authorization: token ? `Bearer ${token}` : '',
  });

  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 500);
    }, 3000);
  }

  const ensureAuth = async () => {
    if (!token) {
      window.location.replace('./index.html');
      throw new Error('UNAUTHORIZED');
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        try { localStorage.removeItem('authToken'); } catch {}
        window.location.replace('./index.html');
        throw new Error('UNAUTHORIZED');
      }
      return true;
    } catch {
      try { localStorage.removeItem('authToken'); } catch {}
      window.location.replace('./index.html');
      throw new Error('UNAUTHORIZED');
    }
  };

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      try { localStorage.removeItem('authToken'); } catch {}
      window.location.href = './index.html';
    });
  }

  const tbody = document.getElementById('exposTbody');
  const refreshBtn = document.getElementById('refreshTable');

  const adminsTbody = document.getElementById('adminsTbody');
  const deleteSelectedAdminsBtn = document.getElementById('deleteSelectedAdmins');
  const selectAllAdminsCheckbox = document.getElementById('adminsSelectAll');

  let adminsData = [];
  const selectedAdminIds = new Set();

  const viewModal = document.getElementById('viewModal');
  const closeViewBtn = document.getElementById('closeView');
  const viewBody = document.getElementById('viewBody');

  const editModal = document.getElementById('editModal');
  const closeEditBtn = document.getElementById('closeEdit');
  const editForm = document.getElementById('editForm');
  const editExpoId = document.getElementById('editExpoId');
  const editTitle = document.getElementById('editTitle');
  const editAuthor = document.getElementById('editAuthor');
  const editPhotoUrl = document.getElementById('editPhotoUrl');
  const editDate = document.getElementById('editDate');
  const editDescription = document.getElementById('editDescription');

  const createModal = document.getElementById('createModal');
  const closeCreateBtn = document.getElementById('closeCreate');
  const openCreateBtn = document.getElementById('openCreate');
  const createForm = document.getElementById('createForm');
  const createExpoId = document.getElementById('createExpoId');
  const createTitle = document.getElementById('createTitle');
  const createAuthor = document.getElementById('createAuthor');
  const createPhotoUrl = document.getElementById('createPhotoUrl');
  const createDate = document.getElementById('createDate');
  const createDescription = document.getElementById('createDescription');

  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteBtn = document.getElementById('closeDelete');
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  let pendingDeleteId = null;

  const deleteAdminsModal = document.getElementById('deleteAdminsModal');
  const closeDeleteAdminsBtn = document.getElementById('closeDeleteAdmins');
  const cancelDeleteAdminsBtn = document.getElementById('cancelDeleteAdmins');
  const confirmDeleteAdminsBtn = document.getElementById('confirmDeleteAdmins');
  const deleteAdminsMessage = document.getElementById('deleteAdminsMessage');
  const deleteAdminsMessageDefault = deleteAdminsMessage
    ? deleteAdminsMessage.textContent.trim()
    : '';
  let pendingDeleteAdminIds = null;
  const confirmDeleteAdminsOriginalText = confirmDeleteAdminsBtn
    ? confirmDeleteAdminsBtn.textContent
    : '';

  const EXPO_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const TITLE_MIN_LENGTH = 3;
  const DESCRIPTION_MIN_LENGTH = 10;
  const AUTHOR_MIN_LENGTH = 2;

  const toCleanString = (value) => String(value ?? '').trim();

  const setModalFieldError = (form, fieldName, message) => {
    if (!form) return;
    const input = form.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.toggle('modal__input--error', Boolean(message));
      if (typeof input.setCustomValidity === 'function') {
        input.setCustomValidity(message || '');
      }
    }

    const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (errorElement) {
      errorElement.textContent = message || '';
    }
  };

  const resetModalErrors = (form) => {
    if (!form) return;
    form.querySelectorAll('.modal__input').forEach((input) => {
      input.classList.remove('modal__input--error');
      if (typeof input.setCustomValidity === 'function') {
        input.setCustomValidity('');
      }
    });
    form.querySelectorAll('[data-error-for]').forEach((errorEl) => {
      errorEl.textContent = '';
    });
  };

  const focusFirstModalError = (form) => {
    if (!form) return;
    const erroredInput = form.querySelector('.modal__input--error');
    if (erroredInput && typeof erroredInput.focus === 'function') {
      erroredInput.focus();
      if (typeof erroredInput.reportValidity === 'function') {
        erroredInput.reportValidity();
      }
    }
  };

  const validateExpoPayload = (payload, { requireExpoId } = { requireExpoId: true }) => {
    const errors = {};

    if (requireExpoId) {
      if (!payload.expoId) {
        errors.expoId = 'Не вдалося згенерувати ідентифікатор виставки.';
      } else if (!EXPO_ID_REGEX.test(payload.expoId)) {
        errors.expoId = 'Ідентифікатор може містити лише латиницю, цифри та тире.';
      }
    }

    if (!payload.title) {
      errors.title = 'Вкажіть назву виставки.';
    } else if (payload.title.length < TITLE_MIN_LENGTH) {
      errors.title = `Назва має містити щонайменше ${TITLE_MIN_LENGTH} символи.`;
    }

    if (!payload.description) {
      errors.description = 'Додайте короткий опис виставки.';
    } else if (payload.description.length < DESCRIPTION_MIN_LENGTH) {
      errors.description = `Опис має містити щонайменше ${DESCRIPTION_MIN_LENGTH} символів.`;
    }

    if (!payload.date) {
      errors.date = 'Оберіть дату проведення.';
    } else {
      const parsedDate = new Date(payload.date);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.date = 'Дата має бути у форматі РРРР-ММ-ДД.';
      }
    }

    if (payload.author && payload.author.length < AUTHOR_MIN_LENGTH) {
      errors.author = 'Імʼя автора має містити щонайменше дві літери.';
    }

    if (payload.photoUrl) {
      try {
        const url = new URL(payload.photoUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          errors.photoUrl = 'Посилання має починатися з http або https.';
        }
      } catch {
        errors.photoUrl = 'Введіть коректне посилання на зображення.';
      }
    }

    return errors;
  };

  const attachModalErrorClearing = (form) => {
    if (!form) return;
    const handler = (event) => {
      const target = event.target;
      if (!target || !target.name) return;
      setModalFieldError(form, target.name, '');
    };
    form.addEventListener('input', handler, true);
    form.addEventListener('change', handler, true);
  };

  const generateExpoId = (title) => {
    const slugBase = toCleanString(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${slugBase || 'expo'}-${Date.now()}`;
  };

  attachModalErrorClearing(editForm);
  attachModalErrorClearing(createForm);

  const setBodyScrollLock = (lock) => {
    document.body.style.overflow = lock ? 'hidden' : 'auto';
  };

  const toggleModal = (modal, show) => {
    if (!modal) return;
    if (show) {
      modal.hidden = false;
      modal.classList.add('active');
      setBodyScrollLock(true);
    } else {
      modal.classList.remove('active');
      modal.hidden = true;
      setBodyScrollLock(false);
    }
  };

  const pulseModal = (modalEl) => {
    if (!modalEl) return;
    const content = modalEl.querySelector('.modal__content');
    if (!content) return;
    content.classList.remove('modal__content--pulse');
    void content.offsetWidth;
    content.classList.add('modal__content--pulse');
    setTimeout(() => {
      content.classList.remove('modal__content--pulse');
    }, 700);
  };

  if (viewModal) {
    viewModal.addEventListener('click', (e) => {
      if (e.target === viewModal) pulseModal(viewModal);
    });
  }
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) pulseModal(editModal);
    });
  }
  if (createModal) {
    createModal.addEventListener('click', (e) => {
      if (e.target === createModal) pulseModal(createModal);
    });
  }
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) pulseModal(deleteModal);
    });
  }
  if (deleteAdminsModal) {
    deleteAdminsModal.addEventListener('click', (e) => {
      if (e.target === deleteAdminsModal) pulseModal(deleteAdminsModal);
    });
  }

  if (closeViewBtn) closeViewBtn.addEventListener('click', () => toggleModal(viewModal, false));
  if (closeEditBtn) closeEditBtn.addEventListener('click', () => toggleModal(editModal, false));
  if (closeCreateBtn) closeCreateBtn.addEventListener('click', () => toggleModal(createModal, false));
  if (openCreateBtn) openCreateBtn.addEventListener('click', () => toggleModal(createModal, true));
  const resetDeleteAdminsModal = () => {
    pendingDeleteAdminIds = null;
    if (confirmDeleteAdminsBtn) {
      confirmDeleteAdminsBtn.disabled = false;
      confirmDeleteAdminsBtn.textContent = confirmDeleteAdminsOriginalText;
    }
    if (deleteAdminsMessage && deleteAdminsMessageDefault) {
      deleteAdminsMessage.textContent = deleteAdminsMessageDefault;
    }
  };

  if (closeDeleteBtn) {
    closeDeleteBtn.addEventListener('click', () => {
      toggleModal(deleteModal, false);
      pendingDeleteId = null;
    });
  }
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      toggleModal(deleteModal, false);
      pendingDeleteId = null;
    });
  }
  if (closeDeleteAdminsBtn) {
    closeDeleteAdminsBtn.addEventListener('click', () => {
      toggleModal(deleteAdminsModal, false);
      resetDeleteAdminsModal();
    });
  }
  if (cancelDeleteAdminsBtn) {
    cancelDeleteAdminsBtn.addEventListener('click', () => {
      toggleModal(deleteAdminsModal, false);
      resetDeleteAdminsModal();
    });
  }
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      confirmDeleteBtn.disabled = true;
      try {
        await deleteExpo(pendingDeleteId);
        toggleModal(deleteModal, false);
        pendingDeleteId = null;
        await fetchExpos();
        showNotification('Виставку видалено', 'success');
      } catch (err) {
        showNotification(err.message || 'Не вдалося видалити виставку', 'error');
      } finally {
        confirmDeleteBtn.disabled = false;
      }
    });
  }

  if (confirmDeleteAdminsBtn) {
    confirmDeleteAdminsBtn.addEventListener('click', async () => {
      if (!pendingDeleteAdminIds || pendingDeleteAdminIds.length === 0) return;

      const idsToDelete = [...pendingDeleteAdminIds];
      confirmDeleteAdminsBtn.disabled = true;
      confirmDeleteAdminsBtn.textContent = 'Видалення...';
      if (deleteSelectedAdminsBtn) deleteSelectedAdminsBtn.disabled = true;

      try {
        await deleteAdmins(idsToDelete);
        selectedAdminIds.clear();
        await fetchAdmins();
        toggleModal(deleteAdminsModal, false);
        resetDeleteAdminsModal();
        showNotification('Адміністраторів видалено', 'success');
      } catch (err) {
        showNotification(
          err.message || 'Не вдалося видалити адміністраторів',
          'error'
        );
      } finally {
        if (confirmDeleteAdminsBtn) {
          confirmDeleteAdminsBtn.disabled = false;
          confirmDeleteAdminsBtn.textContent = confirmDeleteAdminsOriginalText;
        }
        updateSelectAllAdmins();
        updateDeleteAdminsButton();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (viewModal && viewModal.classList.contains('active')) toggleModal(viewModal, false);
    if (editModal && editModal.classList.contains('active')) toggleModal(editModal, false);
    if (createModal && createModal.classList.contains('active')) toggleModal(createModal, false);
    if (deleteModal && deleteModal.classList.contains('active')) {
      toggleModal(deleteModal, false);
      pendingDeleteId = null;
    }
    if (deleteAdminsModal && deleteAdminsModal.classList.contains('active')) {
      toggleModal(deleteAdminsModal, false);
      resetDeleteAdminsModal();
    }
  });

  const fmtDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fmtRegistrationDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${dd}:${mm}:${yyyy}`;
  };

  const mapGender = (value) => {
    if (!value) return 'не вказано';
    if (value === 'male') return 'чоловіча';
    if (value === 'female') return 'жіноча';
    return value;
  };

  const fullName = (user) =>
    [user?.lastName, user?.firstName, user?.middleName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ') || '—';

  const pruneSelectedAdmins = () => {
    const validIds = new Set(adminsData.map((user) => user.id));
    selectedAdminIds.forEach((id) => {
      if (!validIds.has(id)) {
        selectedAdminIds.delete(id);
      }
    });
  };

  const updateSelectAllAdmins = () => {
    if (!selectAllAdminsCheckbox) return;
    if (!adminsData.length) {
      selectAllAdminsCheckbox.checked = false;
      selectAllAdminsCheckbox.indeterminate = false;
      return;
    }

    let selectedCount = 0;
    adminsData.forEach((user) => {
      if (selectedAdminIds.has(user.id)) selectedCount += 1;
    });

    if (selectedCount === 0) {
      selectAllAdminsCheckbox.checked = false;
      selectAllAdminsCheckbox.indeterminate = false;
    } else if (selectedCount === adminsData.length) {
      selectAllAdminsCheckbox.checked = true;
      selectAllAdminsCheckbox.indeterminate = false;
    } else {
      selectAllAdminsCheckbox.checked = false;
      selectAllAdminsCheckbox.indeterminate = true;
    }
  };

  const updateDeleteAdminsButton = () => {
    if (!deleteSelectedAdminsBtn) return;
    const count = selectedAdminIds.size;
    deleteSelectedAdminsBtn.disabled = count === 0;
    deleteSelectedAdminsBtn.textContent =
      count > 0 ? `Видалити вибраних (${count})` : 'Видалити вибраних';
  };

  const renderRows = (data) => {
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach((expo, idx) => {
      const tr = document.createElement('tr');

      // Number
      const tdNum = document.createElement('td');
      tdNum.textContent = String(idx + 1);
      tdNum.className = 'cell-num';

      // Title
      const tdTitle = document.createElement('td');
      tdTitle.textContent = expo.title || '';

      // Photo
      const tdPhoto = document.createElement('td');
      tdPhoto.className = 'cell-photo';
      const img = document.createElement('img');
      img.src = expo.photoUrl || 'https://placehold.co/64x48?text=No+Image';
      img.alt = expo.title ? `Фото: ${expo.title}` : 'Фото';
      img.className = 'thumb';
      tdPhoto.appendChild(img);

      // Author
      const tdAuthor = document.createElement('td');
      tdAuthor.textContent = expo.author || '';

      // Date
      const tdDate = document.createElement('td');
      tdDate.textContent = fmtDate(expo.date);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.className = 'cell-actions';

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn-icon';
      viewBtn.title = 'Перегляд';
      viewBtn.dataset.action = 'view';
      viewBtn.dataset.id = expo.expoId;
      viewBtn.textContent = '👁';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon';
      editBtn.title = 'Редагувати';
      editBtn.dataset.action = 'edit';
      editBtn.dataset.id = expo.expoId;
      editBtn.textContent = '✎';

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-icon btn-icon--danger';
      delBtn.title = 'Видалити';
      delBtn.dataset.action = 'delete';
      delBtn.dataset.id = expo.expoId;
      delBtn.textContent = '🗑';

      tdActions.append(viewBtn, editBtn, delBtn);

      tr.append(tdNum, tdTitle, tdPhoto, tdAuthor, tdDate, tdActions);
      tbody.appendChild(tr);
    });
  };

  const renderAdmins = (data) => {
    if (!adminsTbody) return;
    adminsTbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 5;
      emptyCell.className = 'empty-row';
      emptyCell.textContent = 'Немає зареєстрованих адміністраторів';
      emptyRow.appendChild(emptyCell);
      adminsTbody.appendChild(emptyRow);
      return;
    }

    data.forEach((user) => {
      const tr = document.createElement('tr');

      const tdCheckbox = document.createElement('td');
      tdCheckbox.className = 'checkbox-column';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'row-checkbox';
      checkbox.dataset.id = user.id;
      checkbox.checked = selectedAdminIds.has(user.id);
      tdCheckbox.appendChild(checkbox);

      const tdName = document.createElement('td');
      tdName.className = 'cell-name';
      tdName.textContent = fullName(user);

      const tdEmail = document.createElement('td');
      tdEmail.className = 'cell-email';
      tdEmail.textContent = user.email || '';

      const tdDate = document.createElement('td');
      tdDate.textContent = fmtRegistrationDate(user.createdAt);

      const tdGender = document.createElement('td');
      tdGender.textContent = mapGender(user.gender);

      tr.append(tdCheckbox, tdName, tdEmail, tdDate, tdGender);
      adminsTbody.appendChild(tr);
    });
  };

  const fetchExpos = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/expos`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('authToken'); } catch {}
          window.location.href = './index.html';
          return;
        }
        throw new Error('Не вдалося отримати список виставок');
      }
      const data = await res.json();
      renderRows(data);
    } catch (err) {
      showNotification(err.message || 'Сталася помилка при завантаженні виставок', 'error');
    }
  };

  const fetchAdmins = async () => {
    if (!adminsTbody) return;
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem('authToken');
          } catch {}
          window.location.href = './index.html';
          return;
        }
        throw new Error('Не вдалося отримати список адміністраторів');
      }

      const data = await res.json();
      adminsData = Array.isArray(data) ? data : [];
      pruneSelectedAdmins();
      renderAdmins(adminsData);
      updateSelectAllAdmins();
      updateDeleteAdminsButton();
    } catch (err) {
      showNotification(
        err.message || 'Сталася помилка при завантаженні адміністраторів',
        'error'
      );
    }
  };

  const getExpo = async (expoId) => {
    const res = await fetch(`${API_BASE}/api/expos/${encodeURIComponent(expoId)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        try { localStorage.removeItem('authToken'); } catch {}
        window.location.href = './index.html';
        return;
      }
      throw new Error('Виставку не знайдено');
    }
    return res.json();
  };

  const createExpo = async (payload) => {
    const res = await fetch(`${API_BASE}/api/expos`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.message || 'Не вдалося створити виставку');
      if (data?.errors && typeof data.errors === 'object') {
        error.details = data.errors;
      }
      throw error;
    }
    return data.expo;
  };

  const updateExpo = async (expoId, payload) => {
    const res = await fetch(`${API_BASE}/api/expos/${encodeURIComponent(expoId)}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.message || 'Не вдалося оновити виставку');
      if (data?.errors && typeof data.errors === 'object') {
        error.details = data.errors;
      }
      throw error;
    }
    return data.expo;
  };

  const deleteAdmins = async (ids) => {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'DELETE',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Не вдалося видалити адміністраторів');
    return data;
  };

  const deleteExpo = async (expoId) => {
    const res = await fetch(`${API_BASE}/api/expos/${encodeURIComponent(expoId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Не вдалося видалити виставку');
  };

  if (refreshBtn) refreshBtn.addEventListener('click', fetchExpos);

  if (adminsTbody) {
    adminsTbody.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
      const id = target.dataset.id;
      if (!id) return;
      if (target.checked) {
        selectedAdminIds.add(id);
      } else {
        selectedAdminIds.delete(id);
      }
      updateSelectAllAdmins();
      updateDeleteAdminsButton();
    });
  }

  if (selectAllAdminsCheckbox) {
    selectAllAdminsCheckbox.addEventListener('change', () => {
      const shouldSelectAll = selectAllAdminsCheckbox.checked;
      selectAllAdminsCheckbox.indeterminate = false;
      adminsData.forEach((user) => {
        if (shouldSelectAll) {
          selectedAdminIds.add(user.id);
        } else {
          selectedAdminIds.delete(user.id);
        }
      });
      if (adminsTbody) {
        const checkboxes = adminsTbody.querySelectorAll("input[type='checkbox'][data-id]");
        checkboxes.forEach((checkbox) => {
          checkbox.checked = shouldSelectAll;
        });
      }
      updateSelectAllAdmins();
      updateDeleteAdminsButton();
    });
  }

  if (deleteSelectedAdminsBtn) {
    deleteSelectedAdminsBtn.addEventListener('click', () => {
      if (!selectedAdminIds.size) return;

      pendingDeleteAdminIds = Array.from(selectedAdminIds);

      if (deleteAdminsMessage) {
        const count = pendingDeleteAdminIds.length;
        if (count === 1) {
          deleteAdminsMessage.textContent =
            'Ви впевнені, що хочете видалити вибраного адміністратора? Дію неможливо скасувати.';
        } else {
          deleteAdminsMessage.textContent =
            `Ви впевнені, що хочете видалити ${count} адміністраторів? Дію неможливо скасувати.`;
        }
      }

      toggleModal(deleteAdminsModal, true);
    });
  }

  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const action = target.dataset.action;
      const expoId = target.dataset.id;
      if (!action || !expoId) return;

      try {
        if (action === 'view') {
          const expo = await getExpo(expoId);
          viewBody.innerHTML = `
            <div class="view-grid">
              <div><strong>Expo ID:</strong> ${expo.expoId}</div>
              <div><strong>Назва:</strong> ${expo.title || ''}</div>
              <div><strong>Автор:</strong> ${expo.author || ''}</div>
              <div><strong>Дата:</strong> ${fmtDate(expo.date)}</div>
              <div class="view-photo">
                <img src="${expo.photoUrl || 'https://placehold.co/240x180?text=No+Image'}" alt="${expo.title || 'Фото'}" />
              </div>
              <div class="view-desc"><strong>Опис:</strong><br/>${expo.description || ''}</div>
            </div>
          `;
          toggleModal(viewModal, true);
        }

        if (action === 'edit') {
          const expo = await getExpo(expoId);
          editExpoId.value = expo.expoId || '';
          editTitle.value = expo.title || '';
          editAuthor.value = expo.author || '';
          editPhotoUrl.value = expo.photoUrl || '';
          editDate.value = fmtDate(expo.date) || '';
          editDescription.value = expo.description || '';
          toggleModal(editModal, true);
        }

        if (action === 'delete') {
          pendingDeleteId = expoId;
          toggleModal(deleteModal, true);
        }
      } catch (err) {
        showNotification(err.message || 'Сталася помилка', 'error');
      }
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetModalErrors(editForm);

      const payload = {
        title: toCleanString(editTitle.value),
        author: toCleanString(editAuthor.value),
        photoUrl: toCleanString(editPhotoUrl.value),
        date: toCleanString(editDate.value),
        description: toCleanString(editDescription.value),
      };

      const validationErrors = validateExpoPayload(
        { ...payload, expoId: toCleanString(editExpoId.value) },
        { requireExpoId: false }
      );

      Object.entries(validationErrors).forEach(([field, message]) => {
        setModalFieldError(editForm, field, message);
      });

      if (Object.keys(validationErrors).length) {
        focusFirstModalError(editForm);
        return;
      }

      try {
        await updateExpo(toCleanString(editExpoId.value), payload);
        toggleModal(editModal, false);
        await fetchExpos();
      } catch (err) {
        if (err?.details && typeof err.details === 'object') {
          Object.entries(err.details).forEach(([field, message]) => {
            setModalFieldError(editForm, field, String(message));
          });
          focusFirstModalError(editForm);
        }
        showNotification(err.message || 'Не вдалося зберегти зміни', 'error');
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      resetModalErrors(createForm);

      let expoId = (createExpoId && toCleanString(createExpoId.value)) || '';
      const title = toCleanString(createTitle.value);
      const author = toCleanString(createAuthor.value);
      const photoUrl = toCleanString(createPhotoUrl.value);
      const date = toCleanString(createDate.value);
      const description = toCleanString(createDescription.value);

      if (!expoId) {
        expoId = generateExpoId(title);
      }

      const payload = { expoId, title, author, photoUrl, date, description };

      const validationErrors = validateExpoPayload(payload);

      Object.entries(validationErrors).forEach(([field, message]) => {
        setModalFieldError(createForm, field, message);
      });

      if (Object.keys(validationErrors).length) {
        focusFirstModalError(createForm);
        return;
      }

      try {
        await createExpo(payload);
        toggleModal(createModal, false);
        if (createForm) createForm.reset();
        await fetchExpos();
      } catch (err) {
        if (err?.details && typeof err.details === 'object') {
          Object.entries(err.details).forEach(([field, message]) => {
            setModalFieldError(createForm, field, String(message));
          });
          focusFirstModalError(createForm);
        }
        showNotification(err.message || 'Не вдалося створити виставку', 'error');
      }
    });
  }

  ensureAuth()
    .then(async () => {
      try { document.documentElement.style.visibility = 'visible'; } catch {}
      await Promise.all([fetchExpos(), fetchAdmins()]);
    })
    .catch(() => { /* already redirected */ });
});