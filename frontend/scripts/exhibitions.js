const emailElement = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const exhibitionsGrid = document.getElementById("exhibitions-grid");
const exhibitionsMessage = document.getElementById("exhibitions-message");
const accountSettingsLink = document.getElementById("account-settings-link");

function setExhibitionsMessage(text, options = {}) {
  if (!exhibitionsMessage) {
    return;
  }

  const { isError = false } = options;

  exhibitionsMessage.textContent = text || "";
  exhibitionsMessage.hidden = !text;

  exhibitionsMessage.classList.toggle("is-danger", Boolean(isError));
  exhibitionsMessage.classList.toggle("is-info", !isError);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("uk-UA");
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

  return start || end || "—";
}

function openExhibitionImage({ imageUrl, name }) {
  if (!imageUrl) {
    return;
  }

  const { basicLightbox } = window;

  if (!basicLightbox || typeof basicLightbox.create !== "function") {
    return;
  }

  const lightboxImage = document.createElement("img");
  lightboxImage.src = imageUrl;
  lightboxImage.alt = `Зображення виставки ${name || "без назви"}`;
  lightboxImage.className = "exhibitions-lightbox__image";

  const instance = basicLightbox.create(lightboxImage.outerHTML);
  instance.show();
}

function renderExhibitions(exhibitions) {
  if (!exhibitionsGrid) {
    return;
  }

  exhibitionsGrid.innerHTML = "";

  if (!Array.isArray(exhibitions) || exhibitions.length === 0) {
    setExhibitionsMessage("Наразі немає доступних виставок.");
    return;
  }

  exhibitions.forEach((exhibition) => {
    const card = document.createElement("article");
    card.className = "exhibition-card";
    card.setAttribute("role", "listitem");

    // Image section
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "exhibition-card__image-wrapper";

    if (exhibition.imageUrl) {
      const imageButton = document.createElement("button");
      imageButton.type = "button";
      imageButton.className = "exhibition-card__image-button";

      const image = document.createElement("img");
      image.src = exhibition.imageUrl;
      image.alt = `Зображення виставки ${exhibition.name || "без назви"}`;
      image.loading = "lazy";
      image.className = "exhibition-card__image";

      imageButton.appendChild(image);
      imageButton.addEventListener("click", () =>
        openExhibitionImage({
          imageUrl: exhibition.imageUrl,
          name: exhibition.name,
        })
      );

      imageWrapper.appendChild(imageButton);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "exhibition-card__image-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      imageWrapper.appendChild(placeholder);
    }

    // Content section
    const content = document.createElement("div");
    content.className = "exhibition-card__content";

    const title = document.createElement("h3");
    title.className = "exhibition-card__title";
    title.textContent = exhibition.name || "Без назви";

    const period = document.createElement("p");
    period.className = "exhibition-card__period";
    period.textContent = `Період: ${formatPeriod(
      exhibition.startDate,
      exhibition.endDate
    )}`;

    const seats = document.createElement("p");
    seats.className = "exhibition-card__seats";
    seats.textContent = `Вільних місць: ${String(
      exhibition.availableSeats ?? "—"
    )}`;

    const admin = document.createElement("p");
    admin.className = "exhibition-card__admin";
    admin.textContent = `Адміністратор: ${exhibition.adminName || "—"}`;

    content.appendChild(title);
    content.appendChild(period);
    content.appendChild(seats);
    content.appendChild(admin);

    card.appendChild(imageWrapper);
    card.appendChild(content);

    exhibitionsGrid.appendChild(card);
  });

  setExhibitionsMessage("");
}

async function loadExhibitions() {
  if (!exhibitionsGrid) {
    return;
  }

  exhibitionsGrid.innerHTML = "";
  setExhibitionsMessage("Завантаження виставок...");

  try {
    const response = await fetch("/api/exhibitions");
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = payload.error || "Не вдалося отримати список виставок.";
      throw new Error(error);
    }

    renderExhibitions(payload.exhibitions || []);
  } catch (error) {
    setExhibitionsMessage(
      error?.message || "Не вдалося отримати список виставок.",
      {
        isError: true,
      }
    );
  }
}

function init() {
  const storedUser = localStorage.getItem("museumUser");

  if (!storedUser) {
    window.location.href = "./login.html";
    return;
  }

  let user;
  try {
    user = JSON.parse(storedUser);
  } catch (error) {
    console.error("Unable to parse user data", error);
    localStorage.removeItem("museumUser");
    window.location.href = "./login.html";
    return;
  }

  if (emailElement) {
    emailElement.textContent = user.email || "";
  }

  if (accountSettingsLink) {
    accountSettingsLink.href = "./settings.html";
  }
  loadExhibitions();
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("museumUser");
    window.location.href = "./login.html";
  });
}

init();
