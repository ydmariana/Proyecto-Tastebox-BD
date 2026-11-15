(() => {
  "use strict";

  let cached = null;

  const load = () => {
    const session = window.TasteboxSession && window.TasteboxSession.get();
    if (!session) return Promise.resolve(null);
    if (!cached) {
      cached = window.TasteboxApi.getUser(session.id).catch((error) => { cached = null; throw error; });
    }
    return cached;
  };

  const set = (user) => { cached = Promise.resolve(user); };

  const displayName = (user, fallbackEmail = "") => {
    if (user && user.username) return user.username;
    const email = (user && user.email) || fallbackEmail;
    return email ? email.split("@")[0] : "Usuario";
  };

  window.TasteboxProfile = { load, set, displayName };
})();
