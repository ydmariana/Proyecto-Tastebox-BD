const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, isHashed, needsRehash } = require('../utils/password.utils');

const PASSWORD = 'Clave-Segura-2026!';

test('hashPassword produces a self-describing scrypt hash that is not the plain text', async () => {
  const hash = await hashPassword(PASSWORD);
  assert.ok(hash.startsWith('scrypt$'));
  assert.ok(!hash.includes(PASSWORD));
  assert.ok(hash.length <= 255);
  assert.equal(isHashed(hash), true);
});

test('the same password gets a different salt and hash every time', async () => {
  const first = await hashPassword(PASSWORD);
  const second = await hashPassword(PASSWORD);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(PASSWORD, first), true);
  assert.equal(await verifyPassword(PASSWORD, second), true);
});

test('verifyPassword rejects wrong passwords, tampered hashes and plain text values', async () => {
  const hash = await hashPassword(PASSWORD);
  const tamperedParts = hash.split('$');
  tamperedParts[5] = Buffer.alloc(64, 1).toString('base64');

  assert.equal(await verifyPassword('otra-clave', hash), false);
  assert.equal(await verifyPassword(PASSWORD, tamperedParts.join('$')), false);
  assert.equal(await verifyPassword(PASSWORD, PASSWORD), false);
  assert.equal(await verifyPassword(undefined, hash), false);
});

test('isHashed is false for legacy plain text and malformed values', () => {
  assert.equal(isHashed('123456'), false);
  assert.equal(isHashed('scrypt$only$three'), false);
  assert.equal(isHashed(null), false);
});

test('needsRehash detects hashes created with older cost parameters', async () => {
  const current = await hashPassword(PASSWORD);
  const [algorithm, , blockSize, parallelism, salt, key] = current.split('$');
  const outdated = [algorithm, 16384, blockSize, parallelism, salt, key].join('$');

  assert.equal(needsRehash(current), false);
  assert.equal(needsRehash(outdated), true);
  assert.equal(needsRehash('plain-text'), true);
});
