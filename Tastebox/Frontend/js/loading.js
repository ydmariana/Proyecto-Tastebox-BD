(() => {
  const MIN_MS = 1800;
  let dialog = null;
  let shownAt = 0;

  const SPINNER =
    '<svg class="loading__spinner" viewBox="0 0 48 48" aria-hidden="true">' +
    Array.from({ length: 12 }, (_, index) =>
      `<rect x="22" y="2" width="4" height="12" rx="2" transform="rotate(${index * 30} 24 24)" style="--i:${index}"/>`
    ).join("") +
    "</svg>";

  const build = () => {
    const element = document.createElement("dialog");
    element.className = "modal modal--ok modal--loading";
    element.setAttribute("aria-labelledby", "loading-title");
    element.setAttribute("aria-live", "polite");
    element.innerHTML =
      '<h2 class="modal__title" id="loading-title"></h2>' +
      '<p class="modal__text" role="status"></p>' +
      SPINNER;
    element.addEventListener("cancel", (event) => event.preventDefault());
    document.body.appendChild(element);
    return element;
  };

  const show = ({ title = "Un momento", text = "Espere un momento, estamos procesando su solicitud" } = {}) => {
    if (!dialog) dialog = build();
    dialog.querySelector(".modal__title").textContent = title;
    dialog.querySelector(".modal__text").textContent = text;
    shownAt = Date.now();
    if (!dialog.open) dialog.showModal();
  };

  const hide = () => {
    if (dialog && dialog.open) dialog.close();
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const run = async (opts, task, minMs = MIN_MS) => {
    show(opts);
    try {
      const result = typeof task === "function" ? await task() : await task;
      const left = minMs - (Date.now() - shownAt);
      if (left > 0) await wait(left);
      return result;
    } finally {
      hide();
    }
  };

  window.TasteboxLoading = { show, hide, run };
})();
