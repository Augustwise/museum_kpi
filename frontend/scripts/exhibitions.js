const profileTableBody = document.getElementById('profile-table-body');
const emailElement = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const exhibitionsTableBody = document.getElementById('exhibitions-table-body');
const exhibitionsMessage = document.getElementById('exhibitions-message');

function setExhibitionsMessage(text, options = {}) {
  if (!exhibitionsMessage) {
    return;
  }

  const { isError = false } = options;

  exhibitionsMessage.textContent = text || '';
  exhibitionsMessage.hidden = !text;

  if (isError) {
    exhibitionsMessage.classList.add('exhibitions-message--error');
  } else {
    exhibitionsMessage.classList.remove('exhibitions-message--error');
  }
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('uk-UA');
}

function formatPeriod(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    if (start === end) {
      return start;
    }

    return `${start} — ${end}`;
  }

  return start || end || '—';
}

function openExhibitionImage({ imageUrl, name }) {
  if (!imageUrl) {
    return;
  }

  const { basicLightbox } = window;

  if (!basicLightbox || typeof basicLightbox.create !== 'function') {
    return;
  }

  const lightboxImage = document.createElement('img');
  lightboxImage.src = imageUrl;
  lightboxImage.alt = `Зображення виставки ${name || 'без назви'}`;
  lightboxImage.className = 'exhibitions-lightbox__image';

  const instance = basicLightbox.create(lightboxImage.outerHTML);
  instance.show();
}

function renderExhibitions(exhibitions) {
  if (!exhibitionsTableBody) {
    return;
  }

  exhibitionsTableBody.innerHTML = '';

  if (!Array.isArray(exhibitions) || exhibitions.length === 0) {
    setExhibitionsMessage('Наразі немає доступних виставок.');
    return;
  }

  exhibitions.forEach((exhibition) => {
    const row = document.createElement('tr');

    const imageCell = document.createElement('td');

    if (exhibition.imageUrl) {
      const imageButton = document.createElement('button');
      imageButton.type = 'button';
      imageButton.className = 'exhibitions-table__image-button';

      const image = document.createElement('img');
      image.src = exhibition.imageUrl;
      image.alt = `Зображення виставки ${exhibition.name || 'без назви'}`;
      image.loading = 'lazy';
      image.className = 'exhibitions-table__image';

      imageButton.appendChild(image);
      imageButton.addEventListener('click', () =>
        openExhibitionImage({
          imageUrl: exhibition.imageUrl,
          name: exhibition.name,
        })
      );

      imageCell.appendChild(imageButton);
    } else {
      imageCell.textContent = '—';
    }

    row.appendChild(imageCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = exhibition.name || 'Без назви';
    row.appendChild(nameCell);

    const periodCell = document.createElement('td');
    periodCell.textContent = formatPeriod(
      exhibition.startDate,
      exhibition.endDate
    );
    row.appendChild(periodCell);

    const seatsCell = document.createElement('td');
    seatsCell.textContent = String(exhibition.availableSeats ?? '—');
    row.appendChild(seatsCell);

    const adminCell = document.createElement('td');
    adminCell.textContent = exhibition.adminName || '—';
    row.appendChild(adminCell);

    exhibitionsTableBody.appendChild(row);
  });

  setExhibitionsMessage('');
}

function renderUserDetails(user) {
  if (!user || !profileTableBody) {
    return;
  }

  const rows = [
    { label: "Ім'я", value: user.firstName || '-' },
    { label: 'Прізвище', value: user.lastName || '-' },
    { label: 'Дата народження', value: user.birthDate || '-' },
    { label: 'Стать', value: user.gender || '-' },
    { label: 'Телефон', value: user.phone || '-' },
  ];

  profileTableBody.innerHTML = '';

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = row.label;
    tdLabel.className = 'profile-table__label';

    const tdValue = document.createElement('td');
    tdValue.textContent = row.value;
    tdValue.className = 'profile-table__value';

    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    profileTableBody.appendChild(tr);
  });
}

async function loadExhibitions() {
  if (!exhibitionsTableBody) {
    return;
  }

  exhibitionsTableBody.innerHTML = '';
  setExhibitionsMessage('Завантаження виставок...');

  try {
    const response = await fetch('/api/exhibitions');
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = payload.error || 'Не вдалося отримати список виставок.';
      throw new Error(error);
    }

    renderExhibitions(payload.exhibitions || []);
  } catch (error) {
    setExhibitionsMessage(
      error?.message || 'Не вдалося отримати список виставок.',
      {
        isError: true,
      }
    );
  }
}

function init() {
  const storedUser = localStorage.getItem('museumUser');

  if (!storedUser) {
    window.location.href = './login.html';
    return;
  }

  let user;
  try {
    user = JSON.parse(storedUser);
  } catch (error) {
    console.error('Unable to parse user data', error);
    localStorage.removeItem('museumUser');
    window.location.href = './login.html';
    return;
  }

  if (emailElement) {
    emailElement.textContent = user.email || '';
  }

  renderUserDetails(user);
  loadExhibitions();
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('museumUser');
    window.location.href = './login.html';
  });
}

init();
