const { hashPassword } = require('../utils/password.utils');
const { validateEmail, validatePassword } = require('../utils/validation.utils');

const ROLE_ADMIN = 1;

const validateInput = (email, password) => {
  validateEmail(email);
  validatePassword(password);
};

const createOrPromoteAdmin = async (db, email, password) => {
  validateInput(email, password);

  const [existing] = await db.query('SELECT id_user FROM user WHERE email = ?', [email]);
  if (existing.length > 0) {
    await db.query('UPDATE user SET role = ? WHERE id_user = ?', [ROLE_ADMIN, existing[0].id_user]);
    return { action: 'promoted', id_user: existing[0].id_user };
  }

  const [plans] = await db.query('SELECT MIN(id_subscription) AS id FROM subscription');
  if (!plans[0].id) throw new Error('No hay planes en la tabla subscription.');

  const [result] = await db.query(
    'INSERT INTO user (email, password, role, subscription_id_subscription) VALUES (?, ?, ?, ?)',
    [email, await hashPassword(password), ROLE_ADMIN, plans[0].id],
  );
  return { action: 'created', id_user: result.insertId };
};

const run = async () => {
  const [email, password] = process.argv.slice(2);
  const db = require('../services/mysql.service');
  try {
    const outcome = await createOrPromoteAdmin(db, email, password);
    console.log(JSON.stringify({ ...outcome, email, role: ROLE_ADMIN }, null, 2));
  } finally {
    await db.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createOrPromoteAdmin };
