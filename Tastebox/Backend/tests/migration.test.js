const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase, loadWithDatabase, startApi, send } = require('./helpers/testDatabase');
const { hashPassword, isHashed } = require('../utils/password.utils');

const insertUser = (database, email, password) =>
  database.raw.prepare('INSERT INTO user (email, password, role, subscription_id_subscription) VALUES (?, ?, 0, 1)').run(email, password);

const storedPassword = (database, email) =>
  database.raw.prepare('SELECT password FROM user WHERE email = ?').get(email).password;

test('migration hashes legacy passwords, keeps existing hashes and is idempotent', async (t) => {
  const database = createTestDatabase();
  database.raw.exec("INSERT INTO subscription (name) VALUES ('Gratuito')");
  const alreadyHashed = await hashPassword('YaProtegida1!');
  insertUser(database, 'uno@correo.com', 'clave-uno');
  insertUser(database, 'dos@correo.com', 'clave-dos');
  insertUser(database, 'tres@correo.com', alreadyHashed);
  insertUser(database, 'vacia@correo.com', '');

  const { migratePasswords } = loadWithDatabase('scripts/migrate-passwords.js', database);
  const api = await startApi(database);
  t.after(api.close);

  const dryRun = await migratePasswords(database, { dryRun: true });
  assert.deepEqual(dryRun, { total: 3, migrated: 2, skipped: 1, dryRun: true });
  assert.equal(storedPassword(database, 'uno@correo.com'), 'clave-uno');

  const first = await migratePasswords(database);
  assert.deepEqual(first, { total: 3, migrated: 2, skipped: 1, dryRun: false });
  assert.equal(isHashed(storedPassword(database, 'uno@correo.com')), true);
  assert.equal(isHashed(storedPassword(database, 'dos@correo.com')), true);
  assert.equal(storedPassword(database, 'tres@correo.com'), alreadyHashed);

  const second = await migratePasswords(database);
  assert.equal(second.migrated, 0);

  const login = await send(api.baseUrl, 'POST', '/sessions', { email: 'uno@correo.com', password: 'clave-uno' });
  const wrong = await send(api.baseUrl, 'POST', '/sessions', { email: 'uno@correo.com', password: 'otra' });
  assert.equal(login.status, 200);
  assert.equal(wrong.status, 401);
});
