const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const ALGORITHM = 'scrypt';
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 3;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_MEMORY_BYTES = 128 * COST * BLOCK_SIZE * 2;

const deriveKey = (plain, salt, cost, blockSize, parallelism) =>
  scrypt(plain, salt, KEY_BYTES, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: MAX_MEMORY_BYTES,
  });

const parseStoredHash = (stored) => {
  if (typeof stored !== 'string') return null;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== ALGORITHM) return null;

  const [, cost, blockSize, parallelism, salt, key] = parts;
  const parsed = {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelism: Number(parallelism),
    salt: Buffer.from(salt, 'base64'),
    key: Buffer.from(key, 'base64'),
  };
  const hasValidParameters = [parsed.cost, parsed.blockSize, parsed.parallelism].every(Number.isInteger);
  return hasValidParameters && parsed.salt.length > 0 && parsed.key.length > 0 ? parsed : null;
};

const isHashed = (stored) => parseStoredHash(stored) !== null;

const hashPassword = async (plain) => {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await deriveKey(plain, salt, COST, BLOCK_SIZE, PARALLELISM);
  return [ALGORITHM, COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), key.toString('base64')].join('$');
};

const verifyPassword = async (plain, stored) => {
  const parsed = parseStoredHash(stored);
  if (!parsed || typeof plain !== 'string') return false;

  const candidate = await deriveKey(plain, parsed.salt, parsed.cost, parsed.blockSize, parsed.parallelism);
  return candidate.length === parsed.key.length && crypto.timingSafeEqual(candidate, parsed.key);
};

const needsRehash = (stored) => {
  const parsed = parseStoredHash(stored);
  return !parsed
    || parsed.cost !== COST
    || parsed.blockSize !== BLOCK_SIZE
    || parsed.parallelism !== PARALLELISM;
};

module.exports = { hashPassword, verifyPassword, isHashed, needsRehash };
