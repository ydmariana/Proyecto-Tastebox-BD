const db = require('../services/mysql.service');
const { isValidId, assertValidId, sendNotFound, sendError } = require('../utils/http.utils');
const { TAGS_MAX, COMMENTS_MAX } = require('../utils/limits');

const validateReview = (body) => {
  const { date, tags, comments, rating, cook_it_again: cookItAgain, user_id_user: userIdUser, recipe_id_recipe: recipeIdRecipe } = body;

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
    throw new Error('date es obligatorio y debe tener formato YYYY-MM-DD');
  }
  if (tags !== undefined && tags !== null && (typeof tags !== 'string' || tags.length > TAGS_MAX)) {
    throw new Error(`tags debe ser texto de máx. ${TAGS_MAX} caracteres`);
  }
  if (comments !== undefined && comments !== null && (typeof comments !== 'string' || comments.length > COMMENTS_MAX)) {
    throw new Error(`comments debe ser texto de máx. ${COMMENTS_MAX} caracteres`);
  }
  if (rating !== undefined && rating !== null && (!/^\d+$/.test(String(rating)) || Number(rating) < 1 || Number(rating) > 5)) {
    throw new Error('rating debe ser un entero entre 1 y 5');
  }
  if (![0, 1, '0', '1', true, false].includes(cookItAgain)) {
    throw new Error('cook_it_again es obligatorio y debe ser 0 o 1');
  }
  if (!isValidId(userIdUser)) {
    throw new Error('user_id_user es obligatorio y debe ser un entero');
  }
  if (!isValidId(recipeIdRecipe)) {
    throw new Error('recipe_id_recipe es obligatorio y debe ser un entero');
  }
};

const buildReview = (body) => ({
  date: body.date,
  tags: body.tags ?? null,
  comments: body.comments ?? null,
  rating: body.rating === undefined || body.rating === null ? null : Number(body.rating),
  cook_it_again: Number(body.cook_it_again),
  user_id_user: Number(body.user_id_user),
  recipe_id_recipe: Number(body.recipe_id_recipe),
});

const REVIEW_ERRORS = {
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'El usuario o la receta indicados no existen' },
};

const pad = (n) => String(n).padStart(2, '0');
const toDateOnly = (value) => (value instanceof Date
  ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  : value);
const withDateOnly = (row) => ({ ...row, date: toDateOnly(row.date) });

const withPublicName = ({ user_email: email, ...row }) => ({ ...withDateOnly(row), user_name: String(email).split('@')[0] });

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.email AS user_email, rc.name AS recipe_name
       FROM review r
       JOIN user u ON u.id_user = r.user_id_user
       JOIN recipe rc ON rc.id_recipe = r.recipe_id_recipe`
    );
    res.json(rows.map(withDateOnly));
  } catch (err) {
    sendError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [rows] = await db.query(
      'SELECT * FROM review WHERE id_review = ?',
      [req.params.id]
    );
    if (!rows[0]) return sendNotFound(res);
    res.json(withDateOnly(rows[0]));
  } catch (err) {
    sendError(res, err);
  }
};

const getByRecipe = async (req, res) => {
  try {
    assertValidId(req.params.recipeId, 'recipeId');

    const [rows] = await db.query(
      `SELECT r.*, u.email AS user_email
       FROM review r
       JOIN user u ON u.id_user = r.user_id_user
       WHERE r.recipe_id_recipe = ?`,
      [req.params.recipeId]
    );
    res.json(rows.map(withPublicName));
  } catch (err) {
    sendError(res, err);
  }
};

const getByUser = async (req, res) => {
  try {
    assertValidId(req.params.userId, 'userId');

    const [rows] = await db.query(
      `SELECT r.*, rc.name AS recipe_name
       FROM review r
       JOIN recipe rc ON rc.id_recipe = r.recipe_id_recipe
       WHERE r.user_id_user = ?
       ORDER BY r.date DESC, r.id_review DESC`,
      [req.params.userId]
    );
    res.json(rows.map(withDateOnly));
  } catch (err) {
    sendError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    validateReview(body);
    const review = buildReview(body);

    const [result] = await db.query(
      `INSERT INTO review (date, tags, comments, rating, cook_it_again, user_id_user, recipe_id_recipe)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [review.date, review.tags, review.comments, review.rating, review.cook_it_again, review.user_id_user, review.recipe_id_recipe]
    );
    res.status(201).json({ id_review: result.insertId, ...review });
  } catch (err) {
    sendError(res, err, REVIEW_ERRORS);
  }
};

const update = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const body = req.body || {};
    validateReview(body);
    const review = buildReview(body);

    const [result] = await db.query(
      `UPDATE review
       SET date = ?, tags = ?, comments = ?, rating = ?, cook_it_again = ?, user_id_user = ?, recipe_id_recipe = ?
       WHERE id_review = ?`,
      [review.date, review.tags, review.comments, review.rating, review.cook_it_again, review.user_id_user, review.recipe_id_recipe, req.params.id]
    );
    if (result.affectedRows === 0) return sendNotFound(res);
    res.json({ id_review: Number(req.params.id), ...review });
  } catch (err) {
    sendError(res, err, REVIEW_ERRORS);
  }
};

const remove = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [result] = await db.query('DELETE FROM review WHERE id_review = ?', [req.params.id]);
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getAll, getById, getByRecipe, getByUser, create, update, remove };
