import '../styles/main.scss';
import '../styles/admin.scss';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    'http://localhost:3000';

  // Auth: require token to view admin
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

  // Modals
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

  // Create modal elements
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

  // Delete confirm modal elements
  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteBtn = document.getElementById('closeDelete');
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  let pendingDeleteId = null;

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

  // Backdrop click: pulse the modal content instead of closing (0.7s)
  const pulseModal = (modalEl) => {
    if (!modalEl) return;
    const content = modalEl.querySelector('.modal__content');
    if (!content) return;
    // Restart animation if it's already running
    content.classList.remove('modal__content--pulse');
    void content.offsetWidth; // reflow to reset animation
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

  if (closeViewBtn) closeViewBtn.addEventListener('click', () => toggleModal(viewModal, false));
  if (closeEditBtn) closeEditBtn.addEventListener('click', () => toggleModal(editModal, false));
  if (closeCreateBtn) closeCreateBtn.addEventListener('click', () => toggleModal(createModal, false));
  if (openCreateBtn) openCreateBtn.addEventListener('click', () => toggleModal(createModal, true));
  if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', () => { toggleModal(deleteModal, false); pendingDeleteId = null; });
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { toggleModal(deleteModal, false); pendingDeleteId = null; });
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

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (viewModal && viewModal.classList.contains('active')) toggleModal(viewModal, false);
    if (editModal && editModal.classList.contains('active')) toggleModal(editModal, false);
    if (createModal && createModal.classList.contains('active')) toggleModal(createModal, false);
    if (deleteModal && deleteModal.classList.contains('active')) {
      toggleModal(deleteModal, false);
      pendingDeleteId = null;
    }
  });

  const fmtDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    // yyyy-mm-dd
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
    if (!res.ok) throw new Error(data?.message || 'Не вдалося створити виставку');
    return data.expo;
  };

  const updateExpo = async (expoId, payload) => {
    const res = await fetch(`${API_BASE}/api/expos/${encodeURIComponent(expoId)}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Не вдалося оновити виставку');
    return data.expo;
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
      const payload = {
        title: editTitle.value.trim(),
        author: editAuthor.value.trim(),
        photoUrl: editPhotoUrl.value.trim(),
        date: editDate.value,
        description: editDescription.value.trim(),
      };
      try {
        await updateExpo(editExpoId.value, payload);
        toggleModal(editModal, false);
        await fetchExpos();
      } catch (err) {
        showNotification(err.message || 'Не вдалося зберегти зміни', 'error');
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let expoId = (createExpoId && createExpoId.value.trim()) || '';
      const title = createTitle.value.trim();
      const author = createAuthor.value.trim();
      const photoUrl = createPhotoUrl.value.trim();
      const date = createDate.value;
      const description = createDescription.value.trim();

      if (!title || !date) {
        showNotification('Вкажіть назву та дату', 'error');
        return;
      }

      if (!expoId) {
        const slugBase = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/(^-|-$)/g, '');
        expoId = `${slugBase || 'expo'}-${Date.now()}`;
      }

      const payload = { expoId, title, author, photoUrl, date, description };

      try {
        await createExpo(payload);
        toggleModal(createModal, false);
        if (createForm) createForm.reset();
        await fetchExpos();
      } catch (err) {
        showNotification(err.message || 'Не вдалося створити виставку', 'error');
      }
    });
  }

  // Initial load with auth verification
  ensureAuth()
    .then(() => {
      try { document.documentElement.style.visibility = 'visible'; } catch {}
      return fetchExpos();
    })
    .catch(() => { /* already redirected */ });
});