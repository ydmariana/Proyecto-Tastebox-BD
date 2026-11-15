const db = require('../services/mysql.service');
const { isText, assertValidId, sendNotFound, sendError } = require('../utils/http.utils');

const REMOVE_ERRORS = {
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'No se puede eliminar: la receta tiene reseñas o está guardada por usuarios' },
};

const { NAME_MAX, CUISINE_MAX, DESCRIPTION_MAX, INGREDIENTS_MAX, MINUTES_MAX, IMAGE_PATH_MAX } = require('../utils/limits');
const BOOLEAN_VALUES = [0, 1, '0', '1', true, false];
const isProvided = (value) => value !== undefined && value !== null && value !== '';

const CATALOG_DEFAULTS = { minutes: 0, image: null, verified: 0, is_premium: 0, ingredients: null };

const toFlag = (value) => (value === true || Number(value) === 1 ? 1 : 0);

const normalizeIngredients = (value) => {
  if (!isProvided(value)) return null;
  const text = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).join('\n') : String(value).trim();
  return text === '' ? null : text;
};

const isSafeImagePath = (value) => !value.includes('..') && !value.includes('\\') && !value.startsWith('/') && !value.includes(':');

const validateRecipe = (body) => {
  const { name, difficulty_level: difficultyLevel, cuisine_type: cuisineType, description, preparation_date: preparationDate } = body;
  if (!isText(name, NAME_MAX)) {
    throw new Error(`name es obligatorio (máx. ${NAME_MAX} caracteres)`);
  }
  if (!/^\d+$/.test(String(difficultyLevel)) || Number(difficultyLevel) < 1 || Number(difficultyLevel) > 5) {
    throw new Error('difficulty_level es obligatorio y debe ser un entero entre 1 y 5');
  }
  if (!isText(cuisineType, CUISINE_MAX)) {
    throw new Error(`cuisine_type es obligatorio (máx. ${CUISINE_MAX} caracteres)`);
  }
  if (!isText(description, DESCRIPTION_MAX)) {
    throw new Error(`description es obligatorio (máx. ${DESCRIPTION_MAX} caracteres)`);
  }
  if (preparationDate !== undefined && preparationDate !== null && preparationDate !== '') {
    if (isNaN(Date.parse(preparationDate))) {
      throw new Error('preparation_date debe ser una fecha válida');
    }
  }
  if (isProvided(body.minutes) && (!/^\d+$/.test(String(body.minutes)) || Number(body.minutes) > MINUTES_MAX)) {
    throw new Error('minutes debe ser un entero mayor o igual a 0');
  }
  if (isProvided(body.image) && (typeof body.image !== 'string' || body.image.trim().length > IMAGE_PATH_MAX || !isSafeImagePath(body.image.trim()))) {
    throw new Error(`image debe ser una ruta relativa de máx. ${IMAGE_PATH_MAX} caracteres (ej. desayunos/pancakes.jpg)`);
  }
  ['verified', 'is_premium'].forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && !BOOLEAN_VALUES.includes(body[field])) {
      throw new Error(`${field} debe ser 0 o 1`);
    }
  });
  if (isProvided(body.ingredients)) {
    const valid = typeof body.ingredients === 'string' || (Array.isArray(body.ingredients) && body.ingredients.every((item) => typeof item === 'string'));
    if (!valid) throw new Error('ingredients debe ser texto (uno por línea) o una lista de textos');
    if (normalizeIngredients(body.ingredients) !== null && normalizeIngredients(body.ingredients).length > INGREDIENTS_MAX) {
      throw new Error(`ingredients admite máx. ${INGREDIENTS_MAX} caracteres`);
    }
  }
};

const CATALOG_NORMALIZERS = {
  minutes: (value) => (isProvided(value) ? Number(value) : 0),
  image: (value) => (isProvided(value) ? value.trim() : null),
  verified: (value) => toFlag(value),
  is_premium: (value) => toFlag(value),
  ingredients: normalizeIngredients,
};

const buildRecipe = (body, { withDefaults }) => {
  const recipe = {
    name: body.name.trim(),
    difficulty_level: Number(body.difficulty_level),
    cuisine_type: body.cuisine_type.trim(),
    description: body.description.trim(),
    preparation_date: body.preparation_date ? new Date(body.preparation_date) : new Date(),
  };
  Object.keys(CATALOG_DEFAULTS).forEach((field) => {
    if (body[field] !== undefined) recipe[field] = CATALOG_NORMALIZERS[field](body[field]);
    else if (withDefaults) recipe[field] = CATALOG_DEFAULTS[field];
  });
  return recipe;
};

const SELECT_RECIPES = `SELECT r.*, ROUND(AVG(rv.rating), 1) AS rating, COUNT(rv.rating) AS review_count
       FROM recipe r
       LEFT JOIN review rv ON rv.recipe_id_recipe = r.id_recipe`;

const withRating = (row) => ({
  ...row,
  rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
  review_count: Number(row.review_count) || 0,
});

const findById = async (id) => {
  const [rows] = await db.query(`${SELECT_RECIPES} WHERE r.id_recipe = ? GROUP BY r.id_recipe`, [id]);
  return rows[0] ? withRating(rows[0]) : null;
};

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT_RECIPES} GROUP BY r.id_recipe ORDER BY r.id_recipe`);
    res.json(rows.map(withRating));
  } catch (err) {
    sendError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const recipe = await findById(req.params.id);
    if (!recipe) return sendNotFound(res);
    res.json(recipe);
  } catch (err) {
    sendError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    validateRecipe(body);
    const recipe = buildRecipe(body, { withDefaults: true });
    const columns = Object.keys(recipe);

    const [result] = await db.query(
      `INSERT INTO recipe (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => recipe[column])
    );
    res.status(201).json(await findById(result.insertId));
  } catch (err) {
    sendError(res, err);
  }
};

const update = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const body = req.body || {};
    validateRecipe(body);
    const recipe = buildRecipe(body, { withDefaults: false });
    const columns = Object.keys(recipe);

    const [result] = await db.query(
      `UPDATE recipe SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id_recipe = ?`,
      [...columns.map((column) => recipe[column]), req.params.id]
    );
    if (result.affectedRows === 0) return sendNotFound(res);
    res.json(await findById(req.params.id));
  } catch (err) {
    sendError(res, err);
  }
};

const remove = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [result] = await db.query('DELETE FROM recipe WHERE id_recipe = ?', [req.params.id]);
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err, REMOVE_ERRORS);
  }
};

module.exports = { getAll, getById, create, update, remove };
