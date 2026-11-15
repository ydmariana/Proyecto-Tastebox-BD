(() => {
  const form = document.getElementById("search-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = form.elements.q.value.trim();
    if (!query) { form.elements.q.focus(); return; }
    window.location.href = `categoryRecipes.html?search=${encodeURIComponent(query)}`;
  });
})();
