// Новосибирск: UTC+7.
const WEDDING_DATE = "2026-10-03T16:00:00+07:00";

// Вставьте сюда URL развертывания Google Apps Script, заканчивающийся на /exec.
const APPS_SCRIPT_URL = "";

const revealElements = document.querySelectorAll(".reveal");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px" });

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const parallaxImage = document.querySelector(".parallax");
let ticking = false;

function updateParallax() {
  if (!parallaxImage) return;
  const rect = parallaxImage.parentElement.getBoundingClientRect();
  const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
  parallaxImage.style.transform = `translate3d(0, ${(progress - 0.5) * 70}px, 0)`;
  ticking = false;
}

if (parallaxImage && !reducedMotion) {
  window.addEventListener("scroll", () => {
    if (ticking) return;
    requestAnimationFrame(updateParallax);
    ticking = true;
  }, { passive: true });
  updateParallax();
}

// Если фотография ещё не добавлена в assets, вместо значка битого файла
// показываем аккуратную ботаническую заглушку.
document.querySelectorAll(".gallery__item img").forEach((image) => {
  const showPlaceholder = () => {
    image.hidden = true;
    image.closest(".gallery__item")?.classList.add("is-placeholder");
  };

  if (image.complete && image.naturalWidth === 0) {
    showPlaceholder();
  } else {
    image.addEventListener("error", showPlaceholder, { once: true });
  }
});

const countdown = document.querySelector("#countdown");
const countdownNote = document.querySelector("#countdown-note");
let countdownTimer;

function plural(value, forms) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function renderCountdown() {
  if (!WEDDING_DATE) return;
  const target = new Date(WEDDING_DATE).getTime();
  const distance = target - Date.now();

  if (!Number.isFinite(target)) {
    countdownNote.textContent = "Проверьте дату в файле script.js.";
    return;
  }

  if (distance <= 0) {
    countdown.innerHTML = "<p class=\"countdown__today\">Этот прекрасный день настал!</p>";
    countdownNote.hidden = true;
    clearInterval(countdownTimer);
    return;
  }

  const values = {
    days: Math.floor(distance / 86400000),
    hours: Math.floor(distance / 3600000) % 24,
    minutes: Math.floor(distance / 60000) % 60,
    seconds: Math.floor(distance / 1000) % 60,
  };
  const forms = {
    days: ["день", "дня", "дней"],
    hours: ["час", "часа", "часов"],
    minutes: ["минута", "минуты", "минут"],
    seconds: ["секунда", "секунды", "секунд"],
  };

  Object.entries(values).forEach(([unit, value]) => {
    const block = countdown.querySelector(`[data-unit="${unit}"]`);
    block.textContent = String(value).padStart(2, "0");
    block.nextElementSibling.textContent = plural(value, forms[unit]);
  });
  countdownNote.hidden = true;
}

if (WEDDING_DATE) {
  renderCountdown();
  countdownTimer = setInterval(renderCountdown, 1000);
}

const form = document.querySelector("#guest-form");
const formStatus = document.querySelector("#form-status");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nameInput = form.querySelector("#guest-name");
  const error = form.querySelector('[data-error-for="guest-name"]');
  const button = form.querySelector("button[type=submit]");
  const formData = new FormData(form);

  error.textContent = "";
  nameInput.removeAttribute("aria-invalid");
  formStatus.className = "form-status";
  formStatus.textContent = "";

  if (!nameInput.value.trim()) {
    nameInput.setAttribute("aria-invalid", "true");
    error.textContent = "Пожалуйста, напишите ваше имя.";
    nameInput.focus();
    return;
  }

  if (formData.get("website")) return;

  if (!APPS_SCRIPT_URL) {
    formStatus.classList.add("is-warning");
    formStatus.textContent = "Анкета пока не подключена к таблице. Добавьте адрес Apps Script в файле script.js.";
    return;
  }

  const drinks = formData.getAll("drinks").join(", ");
  formData.delete("drinks");
  formData.append("drinks", drinks);
  formData.append("submittedAt", new Date().toISOString());

  button.disabled = true;
  button.textContent = "Отправляем…";
  formStatus.textContent = "Пожалуйста, подождите.";

  try {
    await fetch(APPS_SCRIPT_URL, { method: "POST", body: formData, mode: "no-cors" });
    form.reset();
    formStatus.classList.add("is-success");
    formStatus.textContent = "Спасибо! Ваш ответ получен. До встречи на нашей свадьбе!";
  } catch (error) {
    formStatus.classList.add("is-error");
    formStatus.textContent = "Не удалось отправить ответ. Проверьте соединение и попробуйте ещё раз.";
  } finally {
    button.disabled = false;
    button.textContent = "Отправить ответ";
  }
});
