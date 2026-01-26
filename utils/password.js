const crypto = require('crypto');
const bcrypt = require('bcryptjs');


function generarPasswordSeguro() {
  return crypto.randomBytes(6).toString('base64'); // ej: "jK2d8h!s"
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function generarPassword(length = 10) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

module.exports = { generarPasswordSeguro, hashPassword, generarPassword };