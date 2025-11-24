// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Token no proporcionado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Tu token trae: { id, rol, nombre }
    if (!decoded?.id) {
      return res.status(401).json({ msg: "Token inválido." });
    }

    // Traemos el usuario para obtener correo/email reales
    const user = await User.findById(decoded.id).select("correo email rol nombre fotoPerfil username inmobiliaria");
    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado." });
    }

    const correo = user.email || user.correo; // compatibilidad
    req.user = {
      id: user._id.toString(),
      rol: user.rol,
      nombre: user.nombre,
      email: correo,
      correo: correo,
      username: user.username,
      fotoPerfil: user.fotoPerfil,
      inmobiliaria: user.inmobiliaria ?? null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ msg: "Token inválido o expirado." });
  }
};

exports.permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ msg: "Acceso denegado: rol no autorizado." });
    }
    next();
  };
};

exports.tokenOpcional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        const user = await User.findById(decoded.id).select("correo email rol nombre");
        if (user) {
          const correo = user.email || user.correo;
          req.user = {
            id: user._id.toString(),
            rol: user.rol,
            nombre: user.nombre,
            email: correo,
            correo: correo,
          };
        } else {
          req.user = null;
        }
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};
