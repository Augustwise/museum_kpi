const profileTableBody = document.getElementById('profile-table-body');
const emailElement = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

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
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('museumUser');
    window.location.href = './login.html';
  });
}

init();
