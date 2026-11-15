const db = require('../services/mysql.service');
const { hashPassword, isHashed } = require('../utils/password.utils');

const findLegacyUsers = async (connection) => {
  const [rows] = await connection.query('SELECT id_user, password FROM user');
  return rows.filter((row) => !isHashed(row.password));
};

const migratePasswords = async (connection = db, { dryRun = false } = {}) => {
  const legacyUsers = await findLegacyUsers(connection);
  const summary = { total: legacyUsers.length, migrated: 0, skipped: 0, dryRun };

  for (const { id_user: idUser, password } of legacyUsers) {
    if (typeof password !== 'string' || password === '') {
      summary.skipped += 1;
      continue;
    }
    if (!dryRun) {
      const passwordHash = await hashPassword(password);
      await connection.query(
        'UPDATE user SET password = ? WHERE id_user = ? AND password = ?',
        [passwordHash, idUser, password]
      );
    }
    summary.migrated += 1;
  }
  return summary;
};

const run = async () => {
  try {
    const summary = await migratePasswords(db, { dryRun: process.argv.includes('--dry-run') });
    console.log(JSON.stringify(summary));
  } catch (err) {
    console.error(`La migración falló: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

if (require.main === module) run();

module.exports = { migratePasswords };
