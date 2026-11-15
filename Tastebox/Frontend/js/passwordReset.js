(() => {
  const PASS_KEY = "tastebox.password:";
  const RESET_KEY = "tastebox.reset:";
  const { DEMO_USER_EMAIL } = window.TasteboxConfig;
  const RESET_MS = 30 * 60 * 1000;
  const RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  const norm = (email) => String(email || "").trim().toLowerCase();
  const get = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };

  const hash = async (text) => {
    if (window.crypto && crypto.subtle) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return "s:" + [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    let simpleHash = 5381;
    for (const char of text) simpleHash = ((simpleHash << 5) + simpleHash + char.charCodeAt(0)) | 0;
    return "d:" + simpleHash;
  };

  const exists = (email) => norm(email) === DEMO_USER_EMAIL || get(PASS_KEY + norm(email)) !== null;

  const setPassword = async (email, password) => set(PASS_KEY + norm(email), await hash(password));

  const createReset = (email) => {
    if (!exists(email)) return null;
    const token = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, "");
    set(RESET_KEY + token, JSON.stringify({ email: norm(email), exp: Date.now() + RESET_MS }));
    return token;
  };
  const readReset = (token) => {
    if (!token) return null;
    try {
      const reset = JSON.parse(get(RESET_KEY + token));
      return reset && reset.exp > Date.now() ? reset : null;
    } catch (_) { return null; }
  };
  const useReset = async (token, password) => {
    const reset = readReset(token);
    if (!reset) return false;
    await setPassword(reset.email, password);
    try { localStorage.removeItem(RESET_KEY + token); } catch (_) {  }
    return true;
  };

  window.TasteboxPasswordReset = { RULE, exists, setPassword, createReset, readReset, useReset };
})();
