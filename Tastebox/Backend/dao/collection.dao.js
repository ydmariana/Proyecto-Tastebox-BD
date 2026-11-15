const db = require('../services/mysql.service');
const { isValidId, isText, assertValidId, sendNotFound, sendError } = require('../utils/http.utils');

const NAME_MAX = 40;
const { IMAGE_PATH_MAX } = require('../utils/limits');
const IMAGE_DATA_MAX = 1500000;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

const COLLECTION_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: 'Ya tienes una colección con ese nombre' },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'El usuario indicado no existe' },
};

const RECIPE_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: 'La receta ya está en la colección' },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'La colección o la receta indicadas no existen' },
};

const isSafeImagePath = (value) => !value.includes('..') && !value.includes('\\') && !value.startsWith('/') && !value.includes(':');

const hasImage = (value) => value !== undefined && value !== null && value !== '';

const validateImage = (image) => {
  if (!hasImage(image)) return;
  if (typeof image !== 'string') throw new Error('image debe ser texto');
  if (image.startsWith('data:')) {
    if (image.length > IMAGE_DATA_MAX || !IMAGE_DATA_URL.test(image)) {
      throw new Error('image debe ser una imagen png, jpeg, webp o gif en base64 de menos de 1 MB');
    }
    return;
  }
  if (image.trim().length > IMAGE_PATH_MAX || !isSafeImagePath(image.trim())) {
    throw new Error(`image debe ser una imagen en base64 o una ruta relativa de máx. ${IMAGE_PATH_MAX} caracteres`);
  }
};

const normalizeImage = (image) => (hasImage(image) ? image.trim() : null);
const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');

const validateName = (name) => {
  if (!isText(name, NAME_MAX)) throw new Error(`name es obligatorio (máx. ${NAME_MAX} caracteres)`);
};

const withRecipeIds = async (collections) => {
  if (collections.length === 0) return [];
  const ids = collections.map((collection) => collection.id_collection);
  const [rows] = await db.query(
    `SELECT collection_id_collection, recipe_id_recipe
     FROM collection_recipes
     WHERE collection_id_collection IN (${ids.map(() => '?').join(', ')})
     ORDER BY added_at, recipe_id_recipe`,
    ids
  );
  return collections.map((collection) => ({
    ...collection,
    recipe_ids: rows.filter((row) => row.collection_id_collection === collection.id_collection).map((row) => row.recipe_id_recipe),
  }));
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT id_collection, name, image, user_id_user FROM collection WHERE id_collection = ?', [id]);
  if (rows.length === 0) return null;
  const [collection] = await withRecipeIds(rows);
  return collection;
};

const getByUser = async (req, res) => {
  try {
    assertValidId(req.params.userId, 'userId');
    const [rows] = await db.query(
      'SELECT id_collection, name, image, user_id_user FROM collection WHERE user_id_user = ? ORDER BY id_collection',
      [req.params.userId]
    );
    res.json(await withRecipeIds(rows));
  } catch (err) {
    sendError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const collection = await findById(req.params.id);
    if (!collection) return sendNotFound(res);
    res.json(collection);
  } catch (err) {
    sendError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const { name, image, user_id_user: userIdUser } = req.body || {};
    validateName(name);
    validateImage(image);
    if (!isValidId(userIdUser)) throw new Error('user_id_user es obligatorio y debe ser un entero');

    const [result] = await db.query(
      'INSERT INTO collection (name, image, user_id_user) VALUES (?, ?, ?)',
      [normalizeName(name), normalizeImage(image), Number(userIdUser)]
    );
    res.status(201).json(await findById(result.insertId));
  } catch (err) {
    sendError(res, err, COLLECTION_ERRORS);
  }
};

const update = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const body = req.body || {};
    validateName(body.name);
    validateImage(body.image);

    if (!(await findById(req.params.id))) return sendNotFound(res);

    if (body.image === undefined) {
      await db.query('UPDATE collection SET name = ? WHERE id_collection = ?', [normalizeName(body.name), req.params.id]);
    } else {
      await db.query('UPDATE collection SET name = ?, image = ? WHERE id_collection = ?', [normalizeName(body.name), normalizeImage(body.image), req.params.id]);
    }
    res.json(await findById(req.params.id));
  } catch (err) {
    sendError(res, err, COLLECTION_ERRORS);
  }
};

const remove = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const [result] = await db.query('DELETE FROM collection WHERE id_collection = ?', [req.params.id]);
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
};

const addRecipe = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const { recipe_id_recipe: recipeIdRecipe } = req.body || {};
    if (!isValidId(recipeIdRecipe)) throw new Error('recipe_id_recipe es obligatorio y debe ser un entero');

    await db.query(
      'INSERT INTO collection_recipes (collection_id_collection, recipe_id_recipe) VALUES (?, ?)',
      [Number(req.params.id), Number(recipeIdRecipe)]
    );
    res.status(201).json({ collection_id_collection: Number(req.params.id), recipe_id_recipe: Number(recipeIdRecipe) });
  } catch (err) {
    sendError(res, err, RECIPE_ERRORS);
  }
};

const removeRecipe = async (req, res) => {
  try {
    assertValidId(req.params.id);
    assertValidId(req.params.recipeId, 'recipeId');
    const [result] = await db.query(
      'DELETE FROM collection_recipes WHERE collection_id_collection = ? AND recipe_id_recipe = ?',
      [req.params.id, req.params.recipeId]
    );
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getByUser, getById, create, update, remove, addRecipe, removeRecipe };
