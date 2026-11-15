require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const missing = Object.entries({ DB_HOST, DB_USER, DB_PASSWORD, DB_NAME })
  .filter(([, value]) => value === undefined)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno: ${missing.join(', ')}. Copia .env.example a .env y complétalo.`);
}

const config = {
  host: DB_HOST,
  port: Number(DB_PORT) || 3306,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
};

module.exports = config;
