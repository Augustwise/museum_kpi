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
const emailErrorEl = document.getElementById("email-error");
const phoneErrorEl = document.getElementById("phone-error");
const currentPasswordErrorEl = document.getElementById(
  "current-password-error"
);
const newPasswordErrorEl = document.getElementById("new-password-error");
const confirmPasswordErrorEl = document.getElementById(
  "confirm-password-error"
);
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

  // Reset content and classes
  messageElement.textContent = text || "";
  messageElement.classList.remove(
    "is-danger",
    "is-success",
    "is-info",
    "error",
    "success",
    "show"
  );

  if (!text) {
    messageElement.classList.add("is-hidden");
    return;
  }

  // Apply custom notification visibility and status classes
  messageElement.classList.remove("is-hidden");
  messageElement.classList.add("show", isError ? "error" : "success");
}

function setFieldError(inputEl, errorEl, message) {
  if (inputEl) {
    inputEl.classList.add("auth-input--error");
  }
  if (errorEl) {
    errorEl.textContent = message || "";
  }
}

function clearFieldError(inputEl, errorEl) {
  if (inputEl) {
    inputEl.classList.remove("auth-input--error");
  }
  if (errorEl) {
    errorEl.textContent = "";
  }
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
    alert(error.message || "Не вдалося видалити акаунт.");
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

  // No global messages on settings page; inline errors are used instead
}

if (emailForm) {
  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nextEmail = (emailInput?.value || "").trim().toLowerCase();

    clearFieldError(emailInput, emailErrorEl);

    if (!nextEmail) {
      setFieldError(emailInput, emailErrorEl, "Введіть нову електронну пошту");
      return;
    }

    if (currentUser && nextEmail === (currentUser.email || "").toLowerCase()) {
      setFieldError(
        emailInput,
        emailErrorEl,
        "Введена електронна пошта збігається з поточною"
      );
      return;
    }

    try {
      await updateUserDetails({ email: nextEmail });
      clearFieldError(emailInput, emailErrorEl);
    } catch (error) {
      setFieldError(
        emailInput,
        emailErrorEl,
        error.message || "Не вдалося оновити електронну пошту"
      );
    }
  });
}

if (phoneForm) {
  phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawPhone = (phoneInput?.value || "").trim();
    const normalizedPhone = rawPhone.replace(/\s+/g, "");

    clearFieldError(phoneInput, phoneErrorEl);

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setFieldError(
        phoneInput,
        phoneErrorEl,
        "Номер телефону має бути у форматі +380XXXXXXXXX"
      );
      return;
    }

    const payload = { phone: normalizedPhone || null };
    const currentNormalizedPhone = (currentUser?.phone || "").replace(
      /\s+/g,
      ""
    );

    if (normalizedPhone === currentNormalizedPhone) {
      setFieldError(phoneInput, phoneErrorEl, "Номер телефону не змінився");
      return;
    }

    try {
      await updateUserDetails(payload);
      clearFieldError(phoneInput, phoneErrorEl);
    } catch (error) {
      setFieldError(
        phoneInput,
        phoneErrorEl,
        error.message || "Не вдалося оновити номер телефону"
      );
    }
  });
}

if (passwordForm) {
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentPassword = currentPasswordInput?.value || "";
    const newPassword = newPasswordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    clearFieldError(currentPasswordInput, currentPasswordErrorEl);
    clearFieldError(newPasswordInput, newPasswordErrorEl);
    clearFieldError(confirmPasswordInput, confirmPasswordErrorEl);

    let hasError = false;

    if (!currentPassword) {
      setFieldError(
        currentPasswordInput,
        currentPasswordErrorEl,
        "Введіть поточний пароль"
      );
      hasError = true;
    }

    if (!newPassword) {
      setFieldError(
        newPasswordInput,
        newPasswordErrorEl,
        "Введіть новий пароль"
      );
      hasError = true;
    } else if (newPassword.length < 6) {
      setFieldError(
        newPasswordInput,
        newPasswordErrorEl,
        "Пароль має містити щонайменше 6 символів"
      );
      hasError = true;
    }

    if (!confirmPassword) {
      setFieldError(
        confirmPasswordInput,
        confirmPasswordErrorEl,
        "Підтвердіть новий пароль"
      );
      hasError = true;
    } else if (
      newPassword &&
      confirmPassword &&
      newPassword !== confirmPassword
    ) {
      setFieldError(
        confirmPasswordInput,
        confirmPasswordErrorEl,
        "Новий пароль та його підтвердження не збігаються"
      );
      hasError = true;
    }

    if (hasError) {
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

      clearFieldError(currentPasswordInput, currentPasswordErrorEl);
      clearFieldError(newPasswordInput, newPasswordErrorEl);
      clearFieldError(confirmPasswordInput, confirmPasswordErrorEl);
    } catch (error) {
      setFieldError(
        currentPasswordInput,
        currentPasswordErrorEl,
        error.message || "Не вдалося змінити пароль"
      );
    }
  });
}

if (deleteAccountButton) {
  deleteAccountButton.addEventListener("click", () => {
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
