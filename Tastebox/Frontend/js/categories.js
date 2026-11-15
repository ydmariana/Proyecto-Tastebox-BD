(() => {
  const form = document.getElementById("search-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = form.elements.q.value.trim();
    if (!query) {
      form.elements.q.focus();
      return;
    }
    window.location.href = `categoryRecipes.html?search=${encodeURIComponent(query)}`;
  });
})();

(() => {
  const tiles = [...document.querySelectorAll(".category-tile")];
  if (!tiles.length) return;

  const findVertical = (current, direction) => {
    const rect = current.getBoundingClientRect();
    const candidates = tiles.filter((tile) => {
      const r = tile.getBoundingClientRect();
      return direction > 0 ? r.top > rect.bottom - 4 : r.bottom < rect.top + 4;
    });
    if (!candidates.length) return null;

    const rowTop = (tile) => tile.getBoundingClientRect().top;
    const nearestRow = direction > 0
      ? Math.min(...candidates.map(rowTop))
      : Math.max(...candidates.map(rowTop));
    const row = candidates.filter((tile) => Math.abs(rowTop(tile) - nearestRow) < 4);

    const x = rect.left + rect.width / 2;
    return row.reduce((best, tile) => {
      const r = tile.getBoundingClientRect();
      const distance = Math.abs(r.left + r.width / 2 - x);
      return !best || distance < best.distance ? { tile, distance } : best;
    }, null).tile;
  };

  document.addEventListener("keydown", (event) => {
    const current = document.activeElement;
    const index = tiles.indexOf(current);
    if (index === -1) return;

    let target = null;
    if (event.key === "ArrowRight") target = tiles[index + 1];
    else if (event.key === "ArrowLeft") target = tiles[index - 1];
    else if (event.key === "ArrowDown") target = findVertical(current, 1);
    else if (event.key === "ArrowUp") target = findVertical(current, -1);

    if (target) {
      event.preventDefault();
      target.focus();
    }
  });
})();
