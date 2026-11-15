const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SITE = process.env.TASTEBOX_SITE || path.resolve(__dirname, '..');
const BASE_SCRIPTS = ['config.js', 'ui.js', 'sesion.js', 'api.js', 'notice.js', 'profile.js', 'plans.js', 'recipeCatalog.js', 'savedRecipes.js'];

function createFakeServer(seed = {}) {
  const state = {
    subscriptions: [
      { id_subscription: 1, name: 'Gratuito', price: 0, features: 'Acceso limitado a recetas al mes\nGuardar recetas en tu colección\nDejar reseñas', monthly_recipe_limit: 25, trial_days: 12 },
      { id_subscription: 2, name: 'Premium', price: 26000, features: 'Recetas ilimitadas\nCaja de ingredientes semanales\nSeguimiento de hábitos completo', monthly_recipe_limit: null, trial_days: null },
    ],
    users: [
      { id_user: 1, email: 'ana@correo.com', role: 0, subscription_id_subscription: 1, password: 'Clave123!', username: null, full_name: null, address: null, phone: null, photo: null, subscription_started_at: new Date().toISOString(), subscription_renews_at: null, subscription_expires_at: new Date(Date.now() + 12 * 86400000 + 3600000).toISOString() },
      { id_user: 2, email: 'admin@tastebox.com', role: 1, subscription_id_subscription: 2, password: 'Admin456$', username: null, full_name: null, address: null, phone: null, photo: null, subscription_started_at: new Date().toISOString(), subscription_renews_at: new Date(Date.now() + 30 * 86400000).toISOString(), subscription_expires_at: null },
    ],
    recipes: [
      { id_recipe: 1, name: 'Tortilla española', difficulty_level: 1, cuisine_type: 'Desayunos', description: 'Clásica', preparation_date: '2026-01-05T10:00:00.000Z', minutes: 15, image: 'desayunos/tortilla-espanola.jpg', verified: 1, is_premium: 0, ingredients: '5 huevos grandes\n4 papas medianas\n1 cebolla mediana', rating: 4.5, review_count: 2 },
      { id_recipe: 2, name: 'Pancakes', difficulty_level: 3, cuisine_type: 'Desayunos', description: 'Esponjosos', preparation_date: '2026-01-06T10:00:00.000Z', minutes: 10, image: 'desayunos/pancakes.jpg', verified: 0, is_premium: 0, ingredients: null, rating: null, review_count: 0 },
      { id_recipe: 3, name: 'Ajiaco santafereño', difficulty_level: 5, cuisine_type: 'Almuerzos', description: 'Sopa', preparation_date: '2026-01-07T10:00:00.000Z', minutes: 75, image: 'almuerzos/ajiaco-santafereno.jpg', verified: 1, is_premium: 0, ingredients: '3 tipos de papa\nMazorca\nPollo', rating: 4, review_count: 1 },
      { id_recipe: 4, name: 'Almojábana', difficulty_level: 1, cuisine_type: 'Desayunos', description: 'Premium', preparation_date: '2026-01-08T10:00:00.000Z', minutes: 30, image: 'desayunos/almojabana.jpg', verified: 0, is_premium: 1, ingredients: null, rating: null, review_count: 0 },
    ],
    saved: [],
    collections: [],
    reviews: [],
    calls: [],
    failNext: null,
    ...seed,
  };

  const publicUser = ({ password, ...rest }) => rest;
  const json = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (body === null ? null : JSON.parse(JSON.stringify(body))),
  });

  const fetchFake = async (url, options = {}) => {
    const { pathname } = new URL(url);
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ method, path: pathname, body });
    if (state.failNext && state.failNext.test(`${method} ${pathname}`)) {
      const failure = state.failNext;
      state.failNext = null;
      if (failure.network) throw new TypeError('network down');
      return json(failure.status, { error: failure.message });
    }

    let m;
    if (method === 'POST' && pathname === '/sessions') {
      const user = state.users.find((u) => u.email === body.email && u.password === body.password);
      return user ? json(200, { message: 'Login exitoso', user: publicUser(user) }) : json(401, { error: 'Credenciales inválidas' });
    }
    if (method === 'POST' && pathname === '/users') {
      if (state.users.some((u) => u.email === body.email)) return json(409, { error: 'El correo ya está registrado.' });
      const user = { id_user: state.users.length + 1, email: body.email, role: 0, subscription_id_subscription: body.subscription_id_subscription, password: body.password };
      state.users.push(user);
      return json(201, publicUser(user));
    }
    if (method === 'GET' && pathname === '/users') return json(200, state.users.map(publicUser));
    if ((m = pathname.match(/^\/users\/(\d+)\/password$/)) && method === 'PUT') {
      const user = state.users.find((u) => u.id_user === Number(m[1]));
      if (user.password !== body.currentPassword) return json(401, { error: 'La contraseña actual no es correcta.' });
      user.password = body.newPassword;
      return json(204, null);
    }
    if ((m = pathname.match(/^\/users\/(\d+)$/))) {
      const user = state.users.find((u) => u.id_user === Number(m[1]));
      if (method === 'GET') return json(200, publicUser(user));
      if (method === 'PUT') {
        if (state.users.some((u) => u !== user && u.email === body.email)) return json(409, { error: 'El email ya está registrado' });
        const planChanged = user.subscription_id_subscription !== body.subscription_id_subscription;
        user.email = body.email;
        user.subscription_id_subscription = body.subscription_id_subscription;
        ['username', 'full_name', 'address', 'phone', 'photo'].forEach((key) => { if (body[key] !== undefined) user[key] = body[key] === '' ? null : body[key]; });
        if (planChanged) {
          const plan = state.subscriptions.find((p) => p.id_subscription === body.subscription_id_subscription);
          user.subscription_started_at = new Date().toISOString();
          user.subscription_renews_at = plan.price > 0 ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
          user.subscription_expires_at = plan.price > 0 ? null : new Date(Date.now() + plan.trial_days * 86400000).toISOString();
        }
        return json(200, publicUser(user));
      }
    }
    if (method === 'GET' && pathname === '/subscriptions') return json(200, state.subscriptions);
    if (method === 'GET' && pathname === '/recipes') return json(200, state.recipes);
    if (method === 'POST' && pathname === '/recipes') {
      const recipe = { id_recipe: state.recipes.length + 10, ...body };
      state.recipes.push(recipe);
      return json(201, recipe);
    }
    if ((m = pathname.match(/^\/recipes\/(\d+)$/))) {
      const index = state.recipes.findIndex((r) => r.id_recipe === Number(m[1]));
      if (method === 'PUT') { state.recipes[index] = { id_recipe: Number(m[1]), ...body }; return json(200, state.recipes[index]); }
      if (method === 'DELETE') { state.recipes.splice(index, 1); return json(204, null); }
    }
    if ((m = pathname.match(/^\/saved-recipes\/user\/(\d+)$/)) && method === 'GET') {
      const ids = state.saved.filter((s) => s.user_id_user === Number(m[1])).map((s) => s.recipe_id_recipe);
      return json(200, state.recipes.filter((r) => ids.includes(r.id_recipe)));
    }
    if (method === 'POST' && pathname === '/saved-recipes') {
      if (state.saved.some((s) => s.recipe_id_recipe === body.recipe_id_recipe && s.user_id_user === body.user_id_user)) {
        return json(409, { error: 'La receta ya está guardada.' });
      }
      state.saved.push(body);
      return json(201, body);
    }
    if ((m = pathname.match(/^\/saved-recipes\/(\d+)\/(\d+)$/)) && method === 'DELETE') {
      const before = state.saved.length;
      state.saved = state.saved.filter((s) => !(s.recipe_id_recipe === Number(m[1]) && s.user_id_user === Number(m[2])));
      return before === state.saved.length ? json(404, { error: 'Recurso no encontrado.' }) : json(204, null);
    }
    if (method === 'GET' && (m = pathname.match(/^\/collections\/user\/(\d+)$/))) {
      return json(200, state.collections.filter((c) => c.user_id_user === Number(m[1])));
    }
    if (method === 'POST' && pathname === '/collections') {
      if (state.collections.some((c) => c.user_id_user === body.user_id_user && c.name.toLowerCase() === body.name.toLowerCase())) {
        return json(409, { error: 'Ya tienes una colección con ese nombre' });
      }
      const collection = { id_collection: state.collections.reduce((max, c) => Math.max(max, c.id_collection), 0) + 1, name: body.name, image: body.image ?? null, user_id_user: body.user_id_user, recipe_ids: [] };
      state.collections.push(collection);
      return json(201, collection);
    }
    if ((m = pathname.match(/^\/collections\/(\d+)\/recipes\/(\d+)$/)) && method === 'DELETE') {
      const collection = state.collections.find((c) => c.id_collection === Number(m[1]));
      if (!collection || !collection.recipe_ids.includes(Number(m[2]))) return json(404, { error: 'No encontrado' });
      collection.recipe_ids = collection.recipe_ids.filter((id) => id !== Number(m[2]));
      return json(204, null);
    }
    if ((m = pathname.match(/^\/collections\/(\d+)\/recipes$/)) && method === 'POST') {
      const collection = state.collections.find((c) => c.id_collection === Number(m[1]));
      if (!collection || !state.recipes.some((r) => r.id_recipe === body.recipe_id_recipe)) return json(400, { error: 'La colección o la receta indicadas no existen' });
      if (collection.recipe_ids.includes(body.recipe_id_recipe)) return json(409, { error: 'La receta ya está en la colección' });
      collection.recipe_ids.push(body.recipe_id_recipe);
      return json(201, { collection_id_collection: collection.id_collection, recipe_id_recipe: body.recipe_id_recipe });
    }
    if ((m = pathname.match(/^\/collections\/(\d+)$/))) {
      const index = state.collections.findIndex((c) => c.id_collection === Number(m[1]));
      if (index < 0) return json(404, { error: 'No encontrado' });
      if (method === 'GET') return json(200, state.collections[index]);
      if (method === 'PUT') {
        const current = state.collections[index];
        if (state.collections.some((c) => c !== current && c.user_id_user === current.user_id_user && c.name.toLowerCase() === body.name.toLowerCase())) {
          return json(409, { error: 'Ya tienes una colección con ese nombre' });
        }
        state.collections[index] = { ...current, name: body.name, image: body.image === undefined ? current.image : body.image };
        return json(200, state.collections[index]);
      }
      if (method === 'DELETE') { state.collections.splice(index, 1); return json(204, null); }
    }
    if (method === 'GET' && (m = pathname.match(/^\/reviews\/recipe\/(\d+)$/))) {
      return json(200, state.reviews.filter((r) => r.recipe_id_recipe === Number(m[1])).map((r) => ({
        ...r, user_name: state.users.find((u) => u.id_user === r.user_id_user).email.split('@')[0],
      })));
    }
    if (method === 'GET' && (m = pathname.match(/^\/reviews\/user\/(\d+)$/))) {
      return json(200, state.reviews.filter((r) => r.user_id_user === Number(m[1])).map((r) => ({
        ...r, recipe_name: state.recipes.find((x) => x.id_recipe === r.recipe_id_recipe).name,
      })));
    }
    if (method === 'POST' && pathname === '/reviews') {
      const review = { id_review: state.reviews.length + 100, ...body };
      state.reviews.push(review);
      return json(201, review);
    }
    if ((m = pathname.match(/^\/reviews\/(\d+)$/))) {
      const index = state.reviews.findIndex((r) => r.id_review === Number(m[1]));
      if (index < 0) return json(404, { error: 'No encontrado' });
      if (method === 'PUT') { state.reviews[index] = { id_review: Number(m[1]), ...body }; return json(200, state.reviews[index]); }
      if (method === 'DELETE') { state.reviews.splice(index, 1); return json(204, null); }
    }
    return json(404, { error: 'Ruta no encontrada.' });
  };
  return { state, fetchFake };
}

function polyfillDialog(window) {
  const proto = window.HTMLDialogElement.prototype;
  proto.showModal = function showModal() { this.setAttribute('open', ''); };
  proto.close = function close() { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
}

function loadPage(htmlName, scripts, { server, session, extraScripts = [], query = '' } = {}) {
  const html = fs.readFileSync(path.join(SITE, 'pages', htmlName), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost:5500/pages/' + htmlName + query, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  polyfillDialog(window);
  window.fetch = server.fetchFake;
  window.scrollTo = () => {};
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.__redirects = [];
  window.location.replace = (url) => window.__redirects.push(url);
  const realSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, ms >= 3000 ? 0 : ms, ...args);
  const digestCalls = [];
  if (window.crypto && window.crypto.subtle) {
    const original = window.crypto.subtle.digest.bind(window.crypto.subtle);
    window.crypto.subtle.digest = (...args) => { digestCalls.push(args); return original(...args); };
  }
  window.__digestCalls = digestCalls;
  if (session) window.localStorage.setItem('tastebox-session', JSON.stringify(session));

  const run = (file) => window.eval(fs.readFileSync(path.join(SITE, 'js', file), 'utf8') + `\n//# sourceURL=${file}`);
  window.eval('window.TasteboxLoading = { run: async (opts, task) => (typeof task === "function" ? task() : task), show() {}, hide() {} };');
  [...BASE_SCRIPTS, ...scripts, ...extraScripts].forEach(run);
  return { window, document: window.document };
}

const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (times = 6) => { for (let i = 0; i < times; i += 1) await tick(10); };

module.exports = { createFakeServer, loadPage, tick, settle };
