const crypto = require('crypto');
const bcrypt = require('bcryptjs');


function generarPasswordSeguro() {
  return crypto.randomBytes(6).toString('base64'); // ej: "jK2d8h!s"
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

module.exports = { generarPasswordSeguro, hashPassword };
