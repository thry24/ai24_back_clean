const EmailVerification = require("../models/EmailVerification");
const User = require("../models/User");
const Inmobiliaria = require('../models/Inmobiliaria');
const { sendVerificationCode } = require("../utils/sendVerificationCode");
const jwt = require("jsonwebtoken");
const { verifyGoogleIdToken } = require('../services/googleVerify');
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



const {
  subirAGoogleStorage,
  eliminarDeGoogleStorage,
} = require("../utils/uploadToGCS");
const Cita = require("../models/Cita");

function makeJwt(user) {
  return jwt.sign(
    { id: user._id, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.listUsers = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { q = "", role, page = 1, limit = 50 } = req.query;

    const filter = {
      _id: { $ne: userId },
    };

    if (q) {
      filter.$or = [
        { nombre: { $regex: q, $options: "i" } },
        { correo: { $regex: q, $options: "i" } },
      ];
    }

    if (role) {
      filter.rol = role;
    }

    const pageN = Math.max(parseInt(page, 10) || 1, 1);
    const limitN = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("_id nombre correo rol fotoPerfil tipoCliente") // 👈 AQUÍ
        .sort({ nombre: 1 })
        .skip((pageN - 1) * limitN)
        .limit(limitN)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      total,
      page: pageN,
      limit: limitN,
      users: items,
    });
  } catch (err) {
    console.error("[listUsers] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Error obteniendo usuarios",
    });
  }
};


exports.obtenerAgentes = async (req, res) => {
  try {
    const agentes = await User.find({ rol: 'agente' })
      .select('nombre correo  fotoPerfil telefono inmobiliaria'); // ⚡ devuelve solo campos útiles

    res.status(200).json(agentes);
    console.log('✅ Agentes encontrados:', agentes.length);

  } catch (error) {
    console.error('Error al obtener agentes:', error);
    res.status(500).json({ message: 'Error al obtener agentes' });
  }
};

exports.initRegister = async (req, res) => {
  const {
    nombre,
    correo,
    password,
    rol,
    telefono,
    inmobiliaria,
    // firmaBase64, ❌ ya no se pide en registro
    tipoCliente 
  } = req.body;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  let imagenSubida = null;
  // let firmaSubida = null; ❌ firma deshabilitada temporalmente

  try {
    if (!nombre || !correo || !password || !rol) {
      return res.status(400).json({ msg: "Campos obligatorios faltantes." });
    }

    const rolesPermitidos = [
      "cliente",
      "agente",
      "inmobiliaria",
      "propietario",
    ];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ msg: "Rol inválido." });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        msg: "La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula y número.",
      });
    }

    const correoExistente = await User.findOne({ correo });
    if (correoExistente) {
      return res.status(400).json({ msg: "El correo ya está registrado." });
    }

    if (telefono) {
      const telefonoExistente = await User.findOne({ telefono });
      if (telefonoExistente) {
        return res.status(400).json({ msg: "El teléfono ya está registrado." });
      }
    }

    const imagen = req.files?.file?.[0];

    if (imagen) {
      const carpeta =
        rol === "agente"
          ? "ai24/agentes"
          : rol === "inmobiliaria"
          ? "ai24/inmobiliarias"
          : "ai24/clientes";

      imagenSubida = await subirAGoogleStorage(imagen.path, carpeta);
    }

    /*
    // ❌ FIRMA DESHABILITADA POR AHORA
    if (firmaBase64) {
      const firmaBuffer = Buffer.from(
        firmaBase64.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      firmaSubida = await subirBufferAGoogleStorage(
        firmaBuffer,
        "firma.png",
        "ai24/firmas"
      );
    }
    */

    if (rol === 'cliente') {
      const tiposValidos = ['comprador', 'propietario', 'arrendatario'];
      if (!tipoCliente || !tiposValidos.includes(tipoCliente)) {
        return res.status(400).json({
          msg: 'Tipo de cliente inválido'
        });
      }
    }

    const urlImagen = imagenSubida?.url || undefined;
    // const urlFirma = firmaSubida?.url || undefined;

    const inmobiliariaFinal =
      rol === "agente" && inmobiliaria && inmobiliaria !== "independiente"
        ? inmobiliaria
        : null;

    const nuevoIntento = new EmailVerification({
      nombre,
      correo,
      password,
      rol,
      tipoCliente: rol === 'cliente' ? tipoCliente : null,
      telefono: telefono || null,
      fotoPerfil: rol === "agente" ? urlImagen : undefined,
      logo: rol === "inmobiliaria" ? urlImagen : undefined,
      // firmaDigital: urlFirma, ❌ firma omitida
      inmobiliaria: inmobiliariaFinal,
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await EmailVerification.deleteMany({ correo });
    await nuevoIntento.save();
    await sendVerificationCode({ nombre, email: correo });

    res.status(200).json({ msg: "Código enviado correctamente al correo." });

  } catch (error) {
    console.error("Error en init-register:", error);

    if (imagenSubida?.public_id) {
      await eliminarDeGoogleStorage(imagenSubida.public_id);
    }

    /*
    if (firmaSubida?.public_id) {
      await eliminarDeGoogleStorage(firmaSubida.public_id);
    }
    */

    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.verifyCode = async (req, res) => {
  const { correo, code } = req.body;

  try {
    const verif = await EmailVerification.findOne({ correo }).sort({ createdAt: -1 });
    if (!verif)
      return res
        .status(404)
        .json({ msg: "No se encontró un intento de registro." });

    if (verif.code !== code) {
      return res.status(400).json({ msg: "Código incorrecto." });
    }

    verif.verified = true;
    await verif.save();

    res.status(200).json({ msg: "Código verificado correctamente." });
  } catch (error) {
    console.error("Error en verify-code:", error);
    res.status(500).json({ msg: "Error al verificar el código." });
  }
};

exports.register = async (req, res) => {
  try {
    const { correo } = req.body;

    const verif = await EmailVerification.findOne({ correo }).sort({ createdAt: -1 });


    if (!verif || !verif.verified) {
      return res
        .status(400)
        .json({ msg: "Correo no verificado o código no válido." });
    }

    const usuarioExistente = await User.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({ msg: "Este correo ya tiene una cuenta." });
    }

    let inmobiliariaAsignada = null;

    // ✅ 1. Si EL USUARIO SE REGISTRA COMO INMOBILIARIA → crear una
    if (verif.rol === "inmobiliaria") {
      const nuevaInmobiliaria = new Inmobiliaria({
        nombre: verif.nombre,
        correo: verif.correo,
        telefono: verif.telefono,
        direccion: "",
        status: "Active",
        tipoPlan: "gratis",
        planActivo: false,
        planExpira: null,
      });

      await nuevaInmobiliaria.save();
      inmobiliariaAsignada = nuevaInmobiliaria._id;
    }

    // Si el rol es agente Y viene con inmobiliaria (agente interno)
    if (verif.rol === "agente" && verif.inmobiliaria) {
      inmobiliariaAsignada = verif.inmobiliaria;
    }

    // Si el agente se registró por su cuenta → independiente
    if (verif.rol === "agente" && !verif.inmobiliaria) {
      inmobiliariaAsignada = null;
    }

    const nuevoUsuario = new User({
      nombre: verif.nombre,
      correo: verif.correo,
      password: verif.password,
      rol: verif.rol,
      tipoCliente: verif.tipoCliente, // ✅ AQUÍ
      telefono: verif.telefono,
      firmaDigital: verif.firmaDigital,
      fotoPerfil: verif.fotoPerfil,
      logo: verif.logo,
      inmobiliaria: inmobiliariaAsignada,
      tipoPlan: "gratis",
      planActivo: false,
      planExpira: null,
    });


    await nuevoUsuario.save();
    await EmailVerification.deleteOne({ correo });

    // Generar token
    const token = jwt.sign(
      {
        id: nuevoUsuario._id,
        rol: nuevoUsuario.rol,
        nombre: nuevoUsuario.nombre,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = nuevoUsuario.toObject();
    delete userData.password;

    res.status(201).json({ token, user: userData });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};


exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        msg: "Correo y contraseña son obligatorios."
      });
    }

    // 🔥 NORMALIZAR
    const correoNorm = String(correo).toLowerCase().trim();

    // 🔥 BUSCAR POR AMBOS CAMPOS
    const usuario = await User.findOne({
      $or: [
        { correo: correoNorm },
        { email: correoNorm }
      ]
    });

    if (!usuario) {
      return res.status(401).json({
        msg: "Correo o contraseña incorrectos."
      });
    }

    const passwordValida = await bcrypt.compare(
      String(password),
      usuario.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        msg: "Correo o contraseña incorrectos."
      });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        rol: usuario.rol,
        nombre: usuario.nombre,
        correo: usuario.correo || usuario.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = usuario.toObject();
    delete userData.password;

    return res.status(200).json({ token, user: userData });

  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ msg: "Error interno del servidor." });
  }
};


exports.actualizarFotoPerfil = async (req, res) => {
  const usuarioId = req.user.id;

  try {
    const usuario = await User.findById(usuarioId);
    if (!usuario)
      return res.status(404).json({ msg: "Usuario no encontrado." });

    if (usuario.rol !== "agente") {
      return res
        .status(403)
        .json({ msg: "Solo los agentes pueden tener foto de perfil." });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "No se proporcionó ninguna imagen." });
    }

    const nuevaImagen = await subirAGoogleStorage(
      req.file.path,
      "ai24/agentes"
    );

    usuario.fotoPerfil = nuevaImagen.url;
    await usuario.save();

    res
      .status(200)
      .json({
        msg: "Foto de perfil actualizada.",
        fotoPerfil: nuevaImagen.url,
      });
  } catch (error) {
    console.error("Error al actualizar foto de perfil:", error);
    res.status(500).json({ msg: "Error al actualizar la imagen." });
  }
};

exports.actualizarLogo = async (req, res) => {
  const usuarioId = req.user.id;

  try {
    const usuario = await User.findById(usuarioId);
    if (!usuario)
      return res.status(404).json({ msg: "Usuario no encontrado." });

    if (!["inmobiliaria", "agente"].includes(usuario.rol)) {
      return res
        .status(403)
        .json({ msg: "Solo agentes o inmobiliarias pueden tener logo." });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "No se proporcionó ninguna imagen." });
    }

    // eliminar logo anterior
    if (usuario.logo) {
      try {
        const publicId = usuario.logo.split(".com/")[1];
        if (publicId) await eliminarDeGoogleStorage(publicId);
      } catch (e) {
        console.warn("No se pudo borrar logo anterior");
      }
    }

    const nuevaImagen = await subirAGoogleStorage(
      req.file.path,
      "ai24/logos"
    );

    usuario.logo = nuevaImagen.url;
    await usuario.save();

    res.status(200).json({
      msg: "Logo actualizado.",
      logo: nuevaImagen.url
    });

  } catch (error) {
    console.error("Error al actualizar logo:", error);
    res.status(500).json({ msg: "Error al actualizar el logo." });
  }
};

exports.getUsuarioActual = async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).select("-password");

    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    res.status(200).json({ user: usuario });
  } catch (error) {
    console.error("Error al obtener el usuario:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.obtenerInmobiliaria = async (req, res) => {
  try {
    const inmobiliarias = await User.find({ rol: "inmobiliaria" });

    res.status(200).json({
      ok: true,
      msg: "Inmobiliarias encontradas",
      data: inmobiliarias,
    });
  } catch (error) {
    console.error("Error al obtener inmobiliarias:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener inmobiliarias",
    });
  }
};

exports.actualizarDisponibilidad = async (req, res) => {
  try {
    const { disponibilidad } = req.body;
    const { id } = req.params;

    const usuario = await User.findById(id);
    if (!usuario || usuario.rol !== "agente") {
      return res.status(404).json({ msg: "Agente no encontrado." });
    }

    usuario.disponibilidad = disponibilidad;
    await usuario.save();

    res.status(200).json({
      msg: "Disponibilidad actualizada correctamente.",
      disponibilidad: usuario.disponibilidad,
    });
  } catch (err) {
    console.error("Error al actualizar disponibilidad:", err);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.obtenerHorasDisponibles = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query; 

    const agente = await User.findById(id);
    if (!agente || agente.rol !== "agente") {
      return res.status(404).json({ msg: "Agente no encontrado." });
    }

    const diaSemana = new Date(fecha)
      .toLocaleDateString("es-MX", {
        weekday: "long",
      })
      .toLowerCase();

    const disponibilidadDia = agente.disponibilidad.find(
      (d) => d.dia.toLowerCase() === diaSemana
    );

    if (!disponibilidadDia) {
      return res.status(200).json({ horasDisponibles: [] });
    }

    const citas = await Cita.find({
      agente: id,
      fecha: new Date(fecha),
      estado: { $ne: "cancelada" },
    });

    const horasOcupadas = citas.map((c) => c.hora);

    const horasDisponibles = disponibilidadDia.horas.filter(
      (hora) => !horasOcupadas.includes(hora)
    );

    res.status(200).json({ horasDisponibles });
  } catch (err) {
    console.error("Error al obtener horas disponibles:", err);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};
exports.actualizarTipoCliente = async (req, res) => {
  try {
    const { email, tipoCliente } = req.body;

    if (!email || !tipoCliente) {
      return res.status(400).json({ message: 'Faltan datos: email o tipoCliente' });
    }

    // ✅ Busca por "correo" porque así está en tu modelo
    const user = await User.findOneAndUpdate(
      { correo: email.toLowerCase() },
      { tipoCliente },
      { new: true }
    );

    if (!user) {
      console.warn('Usuario no encontrado para correo:', email);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Tipo de cliente actualizado correctamente',
      user,
    });
  } catch (error) {
    console.error('Error al actualizar tipoCliente:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// arriba en tu controller (una sola vez)





exports.googleSignIn = async (req, res) => {
  try {
    console.log("✅ /api/auth/google HIT");

    const credential = req.body?.credential || req.body?.idToken;
    const { rol, telefono, inmobiliaria } = req.body || {};

    console.log("credential length:", credential?.length);

    if (!credential) {
      return res.status(400).json({ msg: "Falta credential (o idToken) de Google" });
    }

    console.log("⏳ verifyIdToken...");
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    console.log("✅ verifyIdToken OK");

    const payload = ticket.getPayload() || {};

    const googleId = payload.sub;
    const email = String(payload.email || "").toLowerCase().trim();
    const nombre = String(payload.name || "Usuario").trim();
    const picture = String(payload.picture || "");

    if (!googleId || !email) {
      return res.status(401).json({ msg: "Token Google inválido" });
    }

    console.log("⏳ buscando usuario...");
    let user = await User.findOne({
      $or: [{ googleId }, { correo: email }],
    }).select("+password");

    if (!user) {
      console.log("🆕 usuario NO existe, creando...");

      const rolValido = ["cliente", "agente", "inmobiliaria", "propietario"].includes(rol)
        ? rol
        : "cliente";

      user = new User({
        nombre,
        correo: email,
        rol: rolValido,
        telefono: telefono || undefined,
        authProvider: "google",
        googleId,
        picture,
        inmobiliaria: rolValido === "agente" && inmobiliaria ? inmobiliaria : null,
      });

      if (rolValido === "agente" && picture) user.fotoPerfil = picture;
      if (rolValido === "inmobiliaria" && picture) user.logo = picture;

      console.log("⏳ guardando nuevo user...");
      await user.save();
      console.log("✅ user creado y guardado");
    } else {
      console.log("♻️ usuario encontrado:", user._id.toString());

      // OJO: aquí NO forzamos authProvider="google" si no quieres romper login normal
      let changed = false;

      if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (!user.picture && picture) { user.picture = picture; changed = true; }
      if (!user.fotoPerfil && picture) { user.fotoPerfil = picture; changed = true; }

      if (user.rol === "agente" && inmobiliaria && !user.inmobiliaria) {
        user.inmobiliaria = inmobiliaria;
        changed = true;
      }

      console.log("changed =", changed);

      if (changed) {
        console.log("⏳ guardando user actualizado...");
        await user.save();
        console.log("✅ user actualizado guardado");
      }
    }

    console.log("⏳ firmando JWT...");
    const token = makeJwt(user);
    console.log("✅ JWT firmado");

    const out = user.toObject();
    delete out.password;

    console.log("✅ respondiendo 200");
    return res.status(200).json({ token, user: out });
  } catch (err) {
    console.error("❌ [googleSignIn] error:", err);
    return res.status(400).json({
      msg: "Error en Google Sign-In",
      error: err?.message || "Unknown error",
    });
  }
};

