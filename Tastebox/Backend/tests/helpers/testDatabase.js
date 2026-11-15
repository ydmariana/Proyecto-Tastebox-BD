const path = require('path');
const Module = require('module');
const { DatabaseSync } = require('node:sqlite');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SQLITE_UNIQUE = 2067;
const SQLITE_PRIMARY_KEY = 1555;
const SQLITE_FOREIGN_KEY = 787;

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE subscription (
    id_subscription INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    features TEXT,
    monthly_recipe_limit INTEGER,
    trial_days INTEGER
  );
  CREATE TABLE user (
    id_user INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role INTEGER NOT NULL DEFAULT 0,
    subscription_id_subscription INTEGER NOT NULL REFERENCES subscription (id_subscription),
    username TEXT,
    full_name TEXT,
    address TEXT,
    phone TEXT,
    photo TEXT,
    subscription_started_at TEXT,
    subscription_renews_at TEXT,
    subscription_expires_at TEXT
  );
  CREATE TABLE recipe (
    id_recipe INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL,
    cuisine_type TEXT NOT NULL,
    description TEXT NOT NULL,
    preparation_date TEXT,
    minutes INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    is_premium INTEGER NOT NULL DEFAULT 0,
    ingredients TEXT
  );
  CREATE TABLE review (
    id_review INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    tags TEXT,
    comments TEXT,
    rating INTEGER,
    cook_it_again INTEGER NOT NULL,
    user_id_user INTEGER NOT NULL REFERENCES user (id_user),
    recipe_id_recipe INTEGER NOT NULL REFERENCES recipe (id_recipe)
  );
  CREATE TABLE save_recipes (
    recipe_id_recipe INTEGER NOT NULL REFERENCES recipe (id_recipe),
    user_id_user INTEGER NOT NULL REFERENCES user (id_user),
    PRIMARY KEY (recipe_id_recipe, user_id_user)
  );
  CREATE TABLE collection (
    id_collection INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE,
    image TEXT,
    user_id_user INTEGER NOT NULL REFERENCES user (id_user) ON DELETE CASCADE,
    UNIQUE (user_id_user, name)
  );
  CREATE TABLE collection_recipes (
    collection_id_collection INTEGER NOT NULL REFERENCES collection (id_collection) ON DELETE CASCADE,
    recipe_id_recipe INTEGER NOT NULL REFERENCES recipe (id_recipe) ON DELETE CASCADE,
    added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    PRIMARY KEY (collection_id_collection, recipe_id_recipe)
  );
`;

const toMysqlError = (error, sql) => {
  const isWrite = /^\s*(INSERT|UPDATE)/i.test(sql);
  if (error.errcode === SQLITE_UNIQUE || error.errcode === SQLITE_PRIMARY_KEY) {
    return Object.assign(error, { code: 'ER_DUP_ENTRY' });
  }
  if (error.errcode === SQLITE_FOREIGN_KEY) {
    return Object.assign(error, { code: isWrite ? 'ER_NO_REFERENCED_ROW_2' : 'ER_ROW_IS_REFERENCED_2' });
  }
  return error;
};

const toSqliteValue = (value) => (value instanceof Date ? value.toISOString() : value);

const createTestDatabase = () => {
  const database = new DatabaseSync(':memory:');
  database.exec(SCHEMA);

  const query = async (sql, params = []) => {
    const statement = database.prepare(sql);
    const values = params.map(toSqliteValue);
    try {
      if (/^\s*SELECT/i.test(sql)) return [statement.all(...values)];
      const result = statement.run(...values);
      return [{ insertId: Number(result.lastInsertRowid), affectedRows: result.changes }];
    } catch (error) {
      throw toMysqlError(error, sql);
    }
  };

  return { query, end: async () => {}, raw: database };
};

const clearProjectModules = () => {
  Object.keys(require.cache)
    .filter((file) => file.startsWith(PROJECT_ROOT) && !file.includes('node_modules') && !file.startsWith(path.join(PROJECT_ROOT, 'tests')))
    .forEach((file) => delete require.cache[file]);
};

const loadWithDatabase = (modulePath, database) => {
  const originalLoad = Module._load;
  Module._load = function loadWithFakeService(request, parent, isMain) {
    if (request.endsWith('services/mysql.service')) return database;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    clearProjectModules();
    return require(path.join(PROJECT_ROOT, modulePath));
  } finally {
    Module._load = originalLoad;
  }
};

const startApi = async (database) => {
  const api = loadWithDatabase('server.js', database);
  const server = await new Promise((resolve) => {
    const listening = api.listen(0, () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((resolve) => server.close(resolve));
  return { baseUrl, close };
};

const send = async (baseUrl, method, route, body) => {
  const response = await fetch(baseUrl + route, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
};

module.exports = { createTestDatabase, loadWithDatabase, startApi, send };
