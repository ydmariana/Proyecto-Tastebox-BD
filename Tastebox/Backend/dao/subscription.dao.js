const db = require('../services/mysql.service');
const { isText, assertValidId, sendNotFound, sendError } = require('../utils/http.utils');
const { NAME_MAX } = require('../utils/limits');

const REMOVE_ERRORS = {
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'No se puede eliminar: hay usuarios con esta suscripción' },
};

const isOptionalCount = (value) => value === undefined || value === null || /^\d+$/.test(String(value));

const validateSubscription = (body) => {
  const { name, price, features, monthly_recipe_limit: monthlyRecipeLimit, trial_days: trialDays } = body;
  if (!isText(name, NAME_MAX)) {
    throw new Error(`name es obligatorio (máx. ${NAME_MAX} caracteres)`);
  }
  if (!isOptionalCount(price)) throw new Error('price debe ser un entero mayor o igual a 0');
  if (features !== undefined && features !== null && typeof features !== 'string') {
    throw new Error('features debe ser texto (una característica por línea)');
  }
  if (!isOptionalCount(monthlyRecipeLimit)) throw new Error('monthly_recipe_limit debe ser un entero mayor o igual a 0');
  if (!isOptionalCount(trialDays)) throw new Error('trial_days debe ser un entero mayor o igual a 0');
};

const toNumberOrNull = (value) => (value === undefined || value === null ? null : Number(value));

const buildPlan = (body) => ({
  name: body.name.trim(),
  price: toNumberOrNull(body.price) ?? 0,
  features: body.features ?? null,
  monthly_recipe_limit: toNumberOrNull(body.monthly_recipe_limit),
  trial_days: toNumberOrNull(body.trial_days),
});

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subscription');
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [rows] = await db.query(
      'SELECT * FROM subscription WHERE id_subscription = ?',
      [req.params.id]
    );
    if (!rows[0]) return sendNotFound(res);
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    validateSubscription(body);
    const plan = buildPlan(body);

    const [result] = await db.query(
      'INSERT INTO subscription (name, price, features, monthly_recipe_limit, trial_days) VALUES (?, ?, ?, ?, ?)',
      [plan.name, plan.price, plan.features, plan.monthly_recipe_limit, plan.trial_days]
    );
    res.status(201).json({ id_subscription: result.insertId, ...plan });
  } catch (err) {
    sendError(res, err);
  }
};

const update = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const body = req.body || {};
    validateSubscription(body);
    const plan = buildPlan(body);

    const [result] = await db.query(
      'UPDATE subscription SET name = ?, price = ?, features = ?, monthly_recipe_limit = ?, trial_days = ? WHERE id_subscription = ?',
      [plan.name, plan.price, plan.features, plan.monthly_recipe_limit, plan.trial_days, req.params.id]
    );
    if (result.affectedRows === 0) return sendNotFound(res);
    res.json({ id_subscription: Number(req.params.id), ...plan });
  } catch (err) {
    sendError(res, err);
  }
};

const remove = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [result] = await db.query(
      'DELETE FROM subscription WHERE id_subscription = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err, REMOVE_ERRORS);
  }
};

module.exports = { getAll, getById, create, update, remove };
