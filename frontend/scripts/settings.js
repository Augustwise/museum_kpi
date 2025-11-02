const emailElement = document.getElementById("settings-user-email");
const profileTableBody = document.getElementById("settings-profile-table");
const messageElement = document.getElementById("settings-message");
const emailForm = document.getElementById("email-form");
const phoneForm = document.getElementById("phone-form");
const passwordForm = document.getElementById("password-form");
const emailInput = document.getElementById("email-input");
const phoneInput = document.getElementById("phone-input");
const currentPasswordInput = document.getElementById("current-password-input");
const newPasswordInput = document.getElementById("new-password-input");
const confirmPasswordInput = document.getElementById("confirm-password-input");
const deleteAccountButton = document.getElementById("delete-account-button");
const deleteModal = document.getElementById("delete-account-modal");
const closeDeleteModalButton = document.getElementById("close-delete-modal");
const cancelDeleteButton = document.getElementById("cancel-delete-button");
const confirmDeleteButton = document.getElementById("confirm-delete-button");

let currentUser = null;

const PHONE_REGEX = /^\+380\d{9}$/;

function showMessage(text, options = {}) {
  if (!messageElement) {
    return;
  }

  const { isError = false } = options;

  messageElement.textContent = text || "";

  messageElement.classList.remove("is-danger", "is-success", "is-info");

  if (!text) {
    messageElement.classList.add("is-hidden");
    return;
  }

  messageElement.classList.remove("is-hidden");
  messageElement.classList.add(isError ? "is-danger" : "is-success");
}

function renderProfileTable(user) {
  if (!profileTableBody) {
    return;
  }

  const rows = [
    { label: "Ім'я", value: user.firstName || "—" },
    { label: "Прізвище", value: user.lastName || "—" },
    { label: "Дата народження", value: user.birthDate || "—" },
    { label: "Стать", value: user.gender || "—" },
    { label: "Електронна пошта", value: user.email || "—" },
    { label: "Телефон", value: user.phone || "—" },
  ];

  profileTableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = row.label;
    tdLabel.className = "has-text-weight-semibold has-text-dark";

    const tdValue = document.createElement("td");
    tdValue.textContent = row.value;
    tdValue.className = "has-text-grey-darker";

    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);

    profileTableBody.appendChild(tr);
  });
}

function setCurrentUser(user, options = {}) {
  if (!user) {
    return;
  }

  const { persist = false } = options;

  currentUser = user;

  if (persist) {
    try {
      localStorage.setItem("museumUser", JSON.stringify(user));
    } catch (error) {
      console.warn("Unable to persist user", error);
    }
  }

  if (emailElement) {
    emailElement.textContent = user.email || "";
  }

  if (emailInput) {
    emailInput.value = user.email || "";
  }

  if (phoneInput) {
    phoneInput.value = user.phone || "";
  }

  renderProfileTable(user);
}

async function updateUserDetails(updatePayload) {
  if (!currentUser) {
    throw new Error("Користувача не знайдено.");
  }

  const response = await fetch(`/api/users/${currentUser.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatePayload),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = payload.error || "Не вдалося оновити дані акаунту.";
    throw new Error(errorMessage);
  }

  if (!payload.user) {
    throw new Error("Не вдалося отримати оновлені дані користувача.");
  }

  setCurrentUser(payload.user, { persist: true });
  return payload.user;
}

function openDeleteModal() {
  if (!deleteModal) {
    return;
  }

  deleteModal.classList.add("is-active");
  deleteModal.setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
  if (!deleteModal) {
    return;
  }

  deleteModal.classList.remove("is-active");
  deleteModal.setAttribute("aria-hidden", "true");
}

async function deleteAccount() {
  if (!currentUser) {
    return;
  }

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.classList.add("is-loading");
  }

  try {
    const response = await fetch(`/api/users/${currentUser.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const errorMessage = payload.error || "Не вдалося видалити акаунт.";
      throw new Error(errorMessage);
    }

    localStorage.removeItem("museumUser");
    closeDeleteModal();
    window.location.href = "./register.html";
  } catch (error) {
    showMessage(error.message || "Не вдалося видалити акаунт.", {
      isError: true,
    });
  } finally {
    if (confirmDeleteButton) {
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.classList.remove("is-loading");
    }
  }
}

function init() {
  const storedUser = localStorage.getItem("museumUser");

  if (!storedUser) {
    window.location.href = "./login.html";
    return;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    setCurrentUser(parsedUser);
  } catch (error) {
    console.error("Unable to parse stored user", error);
    localStorage.removeItem("museumUser");
    window.location.href = "./login.html";
    return;
  }

  showMessage("");
}

if (emailForm) {
  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nextEmail = (emailInput?.value || "").trim().toLowerCase();

    if (!nextEmail) {
      showMessage("Введіть нову електронну пошту.", { isError: true });
      return;
    }

    if (currentUser && nextEmail === (currentUser.email || "").toLowerCase()) {
      showMessage("Введена електронна пошта збігається з поточною.", {
        isError: true,
      });
      return;
    }

    try {
      await updateUserDetails({ email: nextEmail });
      showMessage("Електронну пошту оновлено успішно.");
    } catch (error) {
      showMessage(error.message || "Не вдалося оновити електронну пошту.", {
        isError: true,
      });
    }
  });
}

if (phoneForm) {
  phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawPhone = (phoneInput?.value || "").trim();
    const normalizedPhone = rawPhone.replace(/\s+/g, "");

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      showMessage("Номер телефону має бути у форматі +380XXXXXXXXX.", {
        isError: true,
      });
      return;
    }

    const payload = { phone: normalizedPhone || null };
    const currentNormalizedPhone = (currentUser?.phone || "").replace(/\s+/g, "");

    if (normalizedPhone === currentNormalizedPhone) {
      showMessage("Номер телефону не змінився.", { isError: true });
      return;
    }

    try {
      await updateUserDetails(payload);
      showMessage("Номер телефону оновлено успішно.");
    } catch (error) {
      showMessage(error.message || "Не вдалося оновити номер телефону.", {
        isError: true,
      });
    }
  });
}

if (passwordForm) {
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentPassword = currentPasswordInput?.value || "";
    const newPassword = newPasswordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("Будь ласка, заповніть усі поля для зміни пароля.", {
        isError: true,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Новий пароль та його підтвердження не збігаються.", {
        isError: true,
      });
      return;
    }

    try {
      await updateUserDetails({
        password: newPassword,
        currentPassword,
      });

      if (currentPasswordInput) {
        currentPasswordInput.value = "";
      }
      if (newPasswordInput) {
        newPasswordInput.value = "";
      }
      if (confirmPasswordInput) {
        confirmPasswordInput.value = "";
      }

      showMessage("Пароль успішно змінено.");
    } catch (error) {
      showMessage(error.message || "Не вдалося змінити пароль.", {
        isError: true,
      });
    }
  });
}

if (deleteAccountButton) {
  deleteAccountButton.addEventListener("click", () => {
    showMessage("");
    openDeleteModal();
  });
}

if (closeDeleteModalButton) {
  closeDeleteModalButton.addEventListener("click", () => {
    closeDeleteModal();
  });
}

if (cancelDeleteButton) {
  cancelDeleteButton.addEventListener("click", () => {
    closeDeleteModal();
  });
}

if (deleteModal) {
  const modalBackground = deleteModal.querySelector(".modal-background");

  if (modalBackground) {
    modalBackground.addEventListener("click", () => {
      closeDeleteModal();
    });
  }
}

if (confirmDeleteButton) {
  confirmDeleteButton.addEventListener("click", () => {
    deleteAccount();
  });
}

init();
