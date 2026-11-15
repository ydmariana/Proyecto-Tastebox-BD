(() => {
  if (window.TasteboxSession && !window.TasteboxSession.get()) {
    window.location.replace("login.html");
    return;
  }

  const ERROR_ANCHOR = document.querySelector(".profile-hello") || document.querySelector(".profile-main");
  const showError = (message, retry) => window.TasteboxNotice.show(ERROR_ANCHOR, message, retry);

  const session = window.TasteboxSession && window.TasteboxSession.get();
  const hello = document.getElementById("hello-name");
  if (session && session.email && hello) {
    hello.textContent = window.TasteboxProfile.displayName(null, session.email);
    window.TasteboxProfile.load()
      .then((user) => { hello.textContent = window.TasteboxProfile.displayName(user, session.email); })
      .catch((error) => showError(`No pudimos cargar tu nombre. ${error.message}`));
  }

  if (window.Tastebox) {
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    let clearStatsError = () => {};
    const loadStats = () => {
      clearStatsError();
      window.Tastebox.load().then((list) => {
        setText("stat-collections", list.length);
        setText("stat-saved", new Set(list.flatMap((collection) => collection.recipeIds)).size);
      }).catch((error) => {
        clearStatsError = showError(`No pudimos cargar tus estadísticas. ${error.message}`, loadStats);
      });
    };
    loadStats();
  }

  const activity = document.getElementById("activity-list");
  if (activity && window.TasteboxActividad) {
    const LATEST = 3;
    const formatDate = (iso) => window.TasteboxUi.formatLongDate(window.TasteboxActividad.parseDate(iso));

    const card = (r) => window.TasteboxUi.reviewCardHtml(r, formatDate(r.date));

    const renderStats = (mine) => {
      const streak = window.TasteboxActividad.streak();
      const rated = mine.filter((r) => r.rating > 0);
      const average = rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : null;
      document.getElementById("stat-streak").textContent = streak;
      document.getElementById("stat-streak-label").textContent = streak === 1 ? "Semana de racha" : "Semanas de racha";
      document.getElementById("stat-rating").textContent = average === null ? "-" : average.toFixed(1);
    };

    const renderActivity = () => {
      const latest = window.TasteboxActividad.reviews();
      renderStats(latest);
      activity.innerHTML = latest.length
        ? latest.slice(0, LATEST).map(card).join("") + '<a class="activity__more" href="resenas.html">Ver todas mis reseñas ›</a>'
        : '<p class="rv-empty">Aún no hay actividad. Prepara una receta y deja tu reseña para verla aquí.</p>';
    };
    let clearActivityError = () => {};
    const loadActivity = () => {
      clearActivityError();
      activity.innerHTML = '<p class="rv-empty" role="status">Cargando tu actividad…</p>';
      window.TasteboxActividad.load()
        .then(renderActivity)
        .catch((error) => {
          renderActivity();
          clearActivityError = window.TasteboxNotice.show(activity, `No pudimos cargar tu actividad. ${error.message}`, loadActivity);
        });
    };
    loadActivity();
  }
})();
