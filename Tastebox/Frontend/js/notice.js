(() => {
  "use strict";

  const show = (anchor, message, onRetry) => {
    if (!anchor) return () => {};
    const box = document.createElement("div");
    box.className = "api-error";
    box.setAttribute("role", "alert");

    const text = document.createElement("p");
    text.textContent = message || "No pudimos cargar la información. Intenta de nuevo.";
    box.append(text);

    const remove = () => box.remove();
    if (typeof onRetry === "function") {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "api-error__retry";
      retry.textContent = "Reintentar";
      retry.addEventListener("click", () => { remove(); onRetry(); });
      box.append(retry);
    }
    anchor.before(box);
    return remove;
  };

  window.TasteboxNotice = { show };
})();
