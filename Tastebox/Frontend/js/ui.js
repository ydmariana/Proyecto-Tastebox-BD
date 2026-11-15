(() => {
  "use strict";

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);

  const formatLongDate = (date) => `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}`;

  const iconHtml = (classes) => `<i class="${classes}" aria-hidden="true"></i>`;

  const starsHtml = (rating, className = "stars") =>
    `<span class="${className}" style="--rating:${rating}" role="img" aria-label="${rating} de 5"></span>`;

  const verifiedBadgeHtml = () =>
    `<span class="check" title="Receta verificada" aria-label="Receta verificada">${iconHtml("fa-solid fa-check")}</span>`;

  const minutesHtml = (minutes) => `<span class="time">${iconHtml("fa-regular fa-clock")} ${Number(minutes) || 0}'</span>`;

  const cookAnswerHtml = (cook, className) => {
    const content = cook
      ? `${iconHtml("fa-solid fa-check")} Sí, la volvería a cocinar`
      : `${iconHtml("fa-solid fa-xmark")} No la volvería a cocinar`;
    return `<span class="${className} ${cook ? "is-yes" : "is-no"}">${content}</span>`;
  };

  const placeholderHtml = (iconClasses, extraClass = "") =>
    `<div class="${`card__placeholder ${extraClass}`.trim()}" aria-hidden="true">${iconHtml(iconClasses)}</div>`;

  const swapImageForPlaceholder = (image, iconClasses) => {
    const placeholder = document.createElement("div");
    placeholder.className = "card__placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.innerHTML = iconHtml(iconClasses);
    image.replaceWith(placeholder);
  };

  const reviewCardHtml = (review, dateLabel, actionsHtml = "") => `
    <article class="rv">
      <div class="rv__pic">
        ${review.image
    ? `<img src="../img/${escapeHtml(review.image)}" alt="${escapeHtml(review.recipe)}">`
    : `<span class="rv__icon" aria-hidden="true">${iconHtml(review.icon)}</span>`}
        <time datetime="${escapeHtml(review.date)}">${dateLabel}</time>
      </div>
      <div class="rv__body">
        <h3>${escapeHtml(review.recipe)}</h3>
        <div class="rv__rate">${starsHtml(review.rating, "rv-stars")}<b>${review.rating.toFixed(1)}</b></div>
        ${review.text ? `<p class="rv__text">${escapeHtml(review.text)}</p>` : ""}
        <div class="rv__meta">
          ${cookAnswerHtml(review.cook, "rv__cook")}
          ${review.tags.map((tag) => `<span class="rv__tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <a class="rv__link" href="recipeDetail.html?recipe=${encodeURIComponent(review.recipe)}">Ver receta ›</a>
        ${actionsHtml}
      </div>
    </article>`;

  window.TasteboxUi = {
    escapeHtml,
    formatLongDate,
    MONTH_NAMES,
    iconHtml,
    starsHtml,
    verifiedBadgeHtml,
    minutesHtml,
    cookAnswerHtml,
    placeholderHtml,
    swapImageForPlaceholder,
    reviewCardHtml,
  };
})();
