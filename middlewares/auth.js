const jwt = require('jsonwebtoken');

function verificarToken (req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(403).json({ mensaje: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(403).json({ mensaje: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 👈 GUARDA AQUÍ EL USUARIO
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

module.exports = { verificarToken };
