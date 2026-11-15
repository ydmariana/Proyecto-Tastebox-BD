const { EMAIL_MAX, EMAIL_PATTERN, PASSWORD_MIN, PASSWORD_MAX } = require('./limits');

const validateEmail = (email) => {
  if (typeof email !== 'string' || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    throw new Error(`email inválido (obligatorio, formato válido, máx. ${EMAIL_MAX} caracteres)`);
  }
};

const validatePassword = (password, fieldName = 'password') => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new Error(`${fieldName} es obligatorio (entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres)`);
  }
};

module.exports = { validateEmail, validatePassword };
