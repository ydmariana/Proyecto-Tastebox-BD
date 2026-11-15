const db = require('../services/mysql.service');
const { isValidId, assertValidId, sendNotFound, sendError } = require('../utils/http.utils');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/password.utils');
const {
  USERNAME_MAX, FULL_NAME_MAX, ADDRESS_MAX, PHONE_MAX, PHOTO_MAX, PHONE_PATTERN, FREE_PLAN_FALLBACK_DAYS,
} = require('../utils/limits');
const { validateEmail, validatePassword } = require('../utils/validation.utils');

const COLUMNS = [
  'id_user', 'email', 'role', 'subscription_id_subscription',
  'username', 'full_name', 'address', 'phone', 'photo',
  'subscription_started_at', 'subscription_renews_at', 'subscription_expires_at',
].join(', ');

const LIST_COLUMNS = COLUMNS.replace(' photo,', '');

const ROLE_USER = 0;

const validateSubscriptionId = (subscriptionId) => {
  if (!isValidId(subscriptionId)) {
    throw new Error('subscription_id_subscription es obligatorio y debe ser un entero');
  }
};

const validateNewUser = (body) => {
  validateEmail(body.email);
  validatePassword(body.password);
  validateSubscriptionId(body.subscription_id_subscription);
};

const validateOptionalText = (value, max, fieldName) => {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || value.length > max) {
    throw new Error(`${fieldName} debe ser texto de máx. ${max} caracteres`);
  }
};

const validateProfile = (body) => {
  validateOptionalText(body.username, USERNAME_MAX, 'username');
  validateOptionalText(body.full_name, FULL_NAME_MAX, 'full_name');
  validateOptionalText(body.address, ADDRESS_MAX, 'address');
  validateOptionalText(body.phone, PHONE_MAX, 'phone');
  if (body.phone && !PHONE_PATTERN.test(body.phone)) throw new Error('phone no tiene un formato válido');
  validateOptionalText(body.photo, PHOTO_MAX, 'photo');
  if (body.photo && !/^data:image\/(jpeg|png|webp);base64,/.test(body.photo)) {
    throw new Error('photo debe ser una imagen en base64 (jpeg, png o webp)');
  }
};

const validateUserUpdate = (body) => {
  validateEmail(body.email);
  validateSubscriptionId(body.subscription_id_subscription);
  validateProfile(body);
};

const EMAIL_TAKEN_MESSAGE = 'El email ya está registrado';

const USER_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: EMAIL_TAKEN_MESSAGE },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'La suscripción indicada no existe' },
};

const REMOVE_ERRORS = {
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'No se puede eliminar: el usuario tiene reseñas o recetas guardadas' },
};

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT ${LIST_COLUMNS} FROM user`);
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [rows] = await db.query(
      `SELECT ${COLUMNS} FROM user WHERE id_user = ?`,
      [req.params.id]
    );
    if (!rows[0]) return sendNotFound(res);
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
};

const getByEmail = async (email) => {
  const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
  return rows[0];
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM user WHERE id_user = ?', [id]);
  return rows[0];
};

const isEmailUsedByAnother = async (email, id) => {
  const [rows] = await db.query(
    'SELECT id_user FROM user WHERE email = ? AND id_user <> ?',
    [email, id]
  );
  return rows.length > 0;
};

const emptyToNull = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

const pick = (body, key, current) => (body[key] === undefined ? current[key] : emptyToNull(body[key]));

const getPlan = async (subscriptionId) => {
  const [rows] = await db.query('SELECT * FROM subscription WHERE id_subscription = ?', [subscriptionId]);
  return rows[0];
};

const addMonths = (date, months) => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1, date.getHours(), date.getMinutes(), date.getSeconds());
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
};

const buildSubscriptionDates = (plan, now = new Date()) => {
  const isPaid = Number(plan.price) > 0;
  const trialDays = Number(plan.trial_days) || FREE_PLAN_FALLBACK_DAYS;
  return {
    subscription_started_at: now,
    subscription_renews_at: isPaid ? addMonths(now, 1) : null,
    subscription_expires_at: isPaid ? null : new Date(now.getTime() + trialDays * 86400000),
  };
};

const buildUpdatedUser = async (id, current, body) => {
  const subscriptionId = Number(body.subscription_id_subscription);
  const planChanged = subscriptionId !== Number(current.subscription_id_subscription);
  let dates = {
    subscription_started_at: current.subscription_started_at,
    subscription_renews_at: current.subscription_renews_at,
    subscription_expires_at: current.subscription_expires_at,
  };
  if (planChanged || !current.subscription_started_at) {
    const plan = await getPlan(subscriptionId);
    if (plan) dates = buildSubscriptionDates(plan);
  }
  return {
    id_user: Number(id),
    email: body.email,
    password: current.password,
    role: current.role,
    subscription_id_subscription: subscriptionId,
    username: pick(body, 'username', current),
    full_name: pick(body, 'full_name', current),
    address: pick(body, 'address', current),
    phone: pick(body, 'phone', current),
    photo: pick(body, 'photo', current),
    ...dates,
  };
};

const saveUser = (user) => db.query(
  `UPDATE user SET email = ?, password = ?, role = ?, subscription_id_subscription = ?,
    username = ?, full_name = ?, address = ?, phone = ?, photo = ?,
    subscription_started_at = ?, subscription_renews_at = ?, subscription_expires_at = ?
   WHERE id_user = ?`,
  [
    user.email, user.password, user.role, user.subscription_id_subscription,
    user.username, user.full_name, user.address, user.phone, user.photo,
    user.subscription_started_at, user.subscription_renews_at, user.subscription_expires_at,
    user.id_user,
  ]
);

const toPublicUser = (user) => ({
  id_user: user.id_user,
  email: user.email,
  role: user.role,
  subscription_id_subscription: user.subscription_id_subscription,
  username: user.username ?? null,
  full_name: user.full_name ?? null,
  address: user.address ?? null,
  phone: user.phone ?? null,
  photo: user.photo ?? null,
  subscription_started_at: user.subscription_started_at ?? null,
  subscription_renews_at: user.subscription_renews_at ?? null,
  subscription_expires_at: user.subscription_expires_at ?? null,
});

const validateCredentials = ({ email, password }) => {
  if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password === '') {
    throw new Error('email y password son obligatorios');
  }
};

const decoyHash = hashPassword('decoy-password');

const authenticate = async (email, password) => {
  const user = await getByEmail(email);
  const isPasswordValid = await verifyPassword(password, user ? user.password : await decoyHash);
  return user && isPasswordValid ? user : null;
};

const upgradeHashIfOutdated = async (user, password) => {
  if (!needsRehash(user.password)) return;
  await db.query('UPDATE user SET password = ? WHERE id_user = ?', [await hashPassword(password), user.id_user]);
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    validateNewUser(body);

    const { email, password, subscription_id_subscription: subscriptionIdSubscription } = body;

    if (await getByEmail(email)) {
      return res.status(409).json({ error: EMAIL_TAKEN_MESSAGE });
    }

    const passwordHash = await hashPassword(password);
    const plan = await getPlan(Number(subscriptionIdSubscription));
    const dates = plan ? buildSubscriptionDates(plan) : {};
    const [result] = await db.query(
      `INSERT INTO user (email, password, role, subscription_id_subscription,
        subscription_started_at, subscription_renews_at, subscription_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        email, passwordHash, ROLE_USER, Number(subscriptionIdSubscription),
        dates.subscription_started_at ?? null, dates.subscription_renews_at ?? null, dates.subscription_expires_at ?? null,
      ]
    );
    res.status(201).json({
      ...toPublicUser({ id_user: result.insertId, email, role: ROLE_USER, subscription_id_subscription: Number(subscriptionIdSubscription), ...dates }),
    });
  } catch (err) {
    sendError(res, err, USER_ERRORS);
  }
};

const update = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const body = req.body || {};
    validateUserUpdate(body);

    const current = await findById(req.params.id);
    if (!current) return sendNotFound(res);

    if (await isEmailUsedByAnother(body.email, req.params.id)) {
      return res.status(409).json({ error: EMAIL_TAKEN_MESSAGE });
    }

    const updatedUser = await buildUpdatedUser(req.params.id, current, body);
    await saveUser(updatedUser);
    res.json(toPublicUser(updatedUser));
  } catch (err) {
    sendError(res, err, USER_ERRORS);
  }
};

const changePassword = async (req, res) => {
  try {
    assertValidId(req.params.id);
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || currentPassword === '') {
      throw new Error('currentPassword es obligatorio');
    }
    validatePassword(newPassword, 'newPassword');

    const user = await findById(req.params.id);
    if (!user) return sendNotFound(res);
    if (!(await verifyPassword(currentPassword, user.password))) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    await db.query('UPDATE user SET password = ? WHERE id_user = ?', [await hashPassword(newPassword), user.id_user]);
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
};

const remove = async (req, res) => {
  try {
    assertValidId(req.params.id);

    const [result] = await db.query('DELETE FROM user WHERE id_user = ?', [req.params.id]);
    if (result.affectedRows === 0) return sendNotFound(res);
    res.status(204).send();
  } catch (err) {
    sendError(res, err, REMOVE_ERRORS);
  }
};

const login = async (req, res) => {
  try {
    const body = req.body || {};
    validateCredentials(body);

    const user = await authenticate(body.email, body.password);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    await upgradeHashIfOutdated(user, body.password);
    const { photo, ...sessionUser } = toPublicUser(user);
    res.json({ message: 'Inicio de sesión exitoso', user: sessionUser });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getAll, getById, create, update, changePassword, remove, login };
