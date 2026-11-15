const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeServer, loadPage, settle } = require('./harness');

const submitLogin = async (page, email, password) => {
  const { document } = page;
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;
  document.getElementById('login-form').dispatchEvent(new page.window.Event('submit', { cancelable: true, bubbles: true }));
  await settle(10);
};

test('login correcto: envía la contraseña tal cual al servidor, guarda id y rol y no calcula hashes', async () => {
  const server = createFakeServer();
  const page = loadPage('login.html', ['login.js'], { server });
  await submitLogin(page, 'admin@tastebox.com', 'Admin456$');

  const call = server.state.calls.find((c) => c.path === '/sessions');
  assert.deepEqual(call.body, { email: 'admin@tastebox.com', password: 'Admin456$' });
  assert.equal(page.window.__digestCalls.length, 0);
  const stored = JSON.parse(page.window.localStorage.getItem('tastebox-session'));
  assert.deepEqual(stored, { id: 2, email: 'admin@tastebox.com', role: 1, subscriptionId: 2 });
  assert.equal(page.window.TasteboxSession.isAdmin(), true);
  assert.ok(!page.window.localStorage.getItem('tastebox-session').includes('Admin456'));
});

test('login de usuario normal: no es administrador', async () => {
  const server = createFakeServer();
  const page = loadPage('login.html', ['login.js'], { server });
  await submitLogin(page, 'ana@correo.com', 'Clave123!');
  assert.equal(page.window.TasteboxSession.isAdmin(), false);
});

test('login con credenciales malas: muestra el mensaje y no abre sesión', async () => {
  const server = createFakeServer();
  const page = loadPage('login.html', ['login.js'], { server });
  await submitLogin(page, 'ana@correo.com', 'incorrecta');
  assert.equal(page.document.getElementById('login-error').hasAttribute('open'), true);
  assert.match(page.document.getElementById('login-error-text').textContent, /incorrectos/);
  assert.equal(page.window.TasteboxSession.get(), null);
});

test('login sin conexión: muestra el mensaje de red', async () => {
  const server = createFakeServer();
  server.state.failNext = { test: (key) => key === 'POST /sessions', network: true };
  const page = loadPage('login.html', ['login.js'], { server });
  await submitLogin(page, 'ana@correo.com', 'Clave123!');
  assert.match(page.document.getElementById('login-error-text').textContent, /No se pudo conectar/);
});

test('sesiones antiguas sin id (modo demostración) se consideran cerradas', () => {
  const server = createFakeServer();
  const page = loadPage('login.html', ['login.js'], { server, session: { email: 'demo@tastebox.com' } });
  assert.equal(page.window.TasteboxSession.get(), null);
  assert.equal(page.window.TasteboxSession.isAdmin(), false);
});

test('registro: crea la cuenta con el plan por defecto, abre sesión y no hashea en el navegador', async () => {
  const server = createFakeServer();
  const page = loadPage('registro.html', ['registro.js'], { server });
  const { document } = page;
  document.getElementById('email').value = 'nueva@correo.com';
  document.getElementById('password').value = 'Segura123!';
  const confirm = document.getElementById('confirm') || document.getElementById('password2') || document.getElementById('password-confirm');
  if (confirm) confirm.value = 'Segura123!';
  document.getElementById('register-form') && document.getElementById('register-form').dispatchEvent(new page.window.Event('submit', { cancelable: true, bubbles: true }));
  await settle(10);
  const create = server.state.calls.find((c) => c.method === 'POST' && c.path === '/users');
  assert.ok(create, 'no se llamó POST /users');
  assert.deepEqual(create.body, { email: 'nueva@correo.com', password: 'Segura123!', subscription_id_subscription: 1 });
  assert.equal(page.window.__digestCalls.length, 0);
  assert.equal(page.window.TasteboxSession.get().email, 'nueva@correo.com');
});

test('registro: correo repetido muestra el error en el campo', async () => {
  const server = createFakeServer();
  const page = loadPage('registro.html', ['registro.js'], { server });
  const { document } = page;
  document.getElementById('email').value = 'ana@correo.com';
  document.getElementById('password').value = 'Segura123!';
  const confirm = document.getElementById('confirm') || document.getElementById('password2') || document.getElementById('password-confirm');
  if (confirm) confirm.value = 'Segura123!';
  document.querySelector('form').dispatchEvent(new page.window.Event('submit', { cancelable: true, bubbles: true }));
  await settle(10);
  assert.match(document.getElementById('email-error').textContent, /ya está registrado/);
  assert.equal(page.window.TasteboxSession.get(), null);
});
