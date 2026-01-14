const mongoose = require('mongoose');
const MensajeAgente = require('../models/MensajesAgente');
const User = require('../models/User');

exports.crearMensaje = async (req, res) => {
  try {
    const { destinatarioId, texto, tipoOperacion, ubicacion } = req.body;

    // ===============================
    // 1️⃣ Validaciones básicas
    // ===============================
    if (!texto || !texto.trim()) {
      return res.status(400).json({ msg: 'El texto del mensaje es obligatorio' });
    }

    if (!destinatarioId) {
      return res.status(400).json({ msg: 'destinatarioId es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(destinatarioId)) {
      return res.status(400).json({
        msg: 'destinatarioId no es un ObjectId válido',
        destinatarioId,
      });
    }

    // ===============================
    // 2️⃣ Obtener remitente (DEL TOKEN)
    // ===============================
    const remitente = await User.findById(req.user._id).lean();

    if (!remitente) {
      return res.status(401).json({
        msg: 'Remitente no encontrado (token inválido)',
        remitenteId: req.user._id,
      });
    }

    // ===============================
    // 3️⃣ Obtener destinatario (DEL BODY)
    // ===============================
    const destinatario = await User.findById(destinatarioId).lean();

    if (!destinatario) {
      return res.status(404).json({
        msg: 'Destinatario no encontrado en la base de datos',
        destinatarioId,
      });
    }

    // ===============================
    // 4️⃣ Determinar roles
    // ===============================
    const esRemitenteAgente = remitente.rol === 'agente';

    // ===============================
    // 5️⃣ Crear mensaje
    // ===============================
    const mensaje = await MensajeAgente.create({
      // 👉 AGENTE
      nombreAgente: esRemitenteAgente ? remitente.nombre : destinatario.nombre,
      emailAgente: esRemitenteAgente ? remitente.correo : destinatario.correo,
      telefonoAgente: esRemitenteAgente ? remitente.telefono : destinatario.telefono,
      fotoAgente: esRemitenteAgente ? remitente.fotoPerfil : destinatario.fotoPerfil,

      // 👉 CLIENTE
      nombreCliente: esRemitenteAgente ? destinatario.nombre : remitente.nombre,
      emailCliente: esRemitenteAgente ? destinatario.correo : remitente.correo,
      telefonoCliente: esRemitenteAgente ? destinatario.telefono : remitente.telefono,
      fotoCliente: esRemitenteAgente ? destinatario.fotoPerfil : remitente.fotoPerfil,

      // 👉 MENSAJE
      texto: texto.trim(),
      tipoOperacion: tipoOperacion || '',
      ubicacion: ubicacion || '',

      // 👉 METADATA
      remitenteId: remitente._id,
      fecha: new Date(),
    });

    // ===============================
    // 6️⃣ Respuesta
    // ===============================
    return res.status(201).json(mensaje);

  } catch (error) {
    console.error('❌ Error crearMensaje:', error);
    return res.status(500).json({ msg: 'Error al crear mensaje' });
  }
};

exports.obtenerContactos = async (req, res) => {
  try {
    const email = (req.user.correo || req.user.email).toLowerCase();

    const mensajes = await MensajeAgente.find({
      $or: [
        { emailAgente: email },
        { emailCliente: email }
      ]
    });

    const mapa = new Map();

    for (const m of mensajes) {
      const soyAgente = m.emailAgente?.toLowerCase() === email;

      const contacto = soyAgente
        ? {
            nombre: m.nombreCliente,
            correo: m.emailCliente,
            telefono: m.telefonoCliente,
            fotoPerfil: m.fotoCliente
          }
        : {
            nombre: m.nombreAgente,
            correo: m.emailAgente,
            telefono: m.telefonoAgente,
            fotoPerfil: m.fotoAgente
          };

      if (contacto.correo && !mapa.has(contacto.correo)) {
        mapa.set(contacto.correo, contacto);
      }
    }

    res.json(Array.from(mapa.values()));
  } catch (e) {
    console.error('❌ Error contactos:', e);
    res.status(500).json({ msg: 'Error al obtener contactos' });
  }
};

exports.obtenerMensajesAgentes = async (req, res) => {
  try {
    const userEmail = (req.user.correo || req.user.email || '')
      .toLowerCase()
      .trim();

    if (!userEmail) {
      return res.status(401).json({ msg: 'Usuario no autenticado' });
    }

    // 🔹 Mensajes donde participa el usuario
    const mensajes = await MensajeAgente.find({
      $or: [
        { emailAgente: userEmail },
        { emailCliente: userEmail }
      ],
    }).sort({ updatedAt: -1 });

    if (!mensajes.length) return res.json([]);

    // 🔹 Construir conversaciones
    const conversaciones = mensajes.map((m) => {
      const soyAgente = m.emailAgente?.toLowerCase() === userEmail;

      return {
        correo: soyAgente ? m.emailCliente : m.emailAgente,
        nombre: soyAgente
          ? m.nombreCliente || m.emailCliente
          : m.nombreAgente || m.emailAgente,
        tipoOperacion: m.tipoOperacion || '',
        fecha: m.updatedAt || m.createdAt,
        texto: m.texto || '',
        propiedadId: m.idPropiedad || null,
        imagenPropiedad: m.imagenPropiedad || null, // ✅ NUEVO
        fotoPerfil: null, // se llena abajo
      };
    });

    // 🔹 Correos únicos
    const correos = [...new Set(conversaciones.map(c => c.correo))];

    // 🔹 Datos extra de usuario
    const usuarios = await User.find({
      $or: [
        { correo: { $in: correos } },
        { email: { $in: correos } }
      ]
    }).select('correo email nombre fotoPerfil picture logo');

    const mapaUsuarios = new Map();
    usuarios.forEach(u => {
      const key = (u.correo || u.email).toLowerCase();
      mapaUsuarios.set(key, u);
    });

    // 🔹 Fusionar
    const resultado = conversaciones.map(c => {
      const u = mapaUsuarios.get(c.correo.toLowerCase());
      return {
        ...c,
        nombre: u?.nombre || c.nombre,
        fotoPerfil:
          u?.fotoPerfil ||
          u?.picture ||
          u?.logo ||
          'https://www.svgrepo.com/show/452030/avatar-default.svg',
      };
    });

    // 🔹 Eliminar duplicados por correo
    const mapaFinal = new Map();
    resultado.forEach(c => {
      if (!mapaFinal.has(c.correo)) {
        mapaFinal.set(c.correo, c);
      }
    });

    return res.json([...mapaFinal.values()]);
  } catch (error) {
    console.error('❌ Error obtenerMensajesAgentes:', error);
    res.status(500).json({ msg: 'Error al obtener mensajes-agentes' });
  }
};




exports.buscarAgentePorNombre = async (req, res) => {
  try {
    const nombre = req.query.nombre?.trim();
    if (!nombre) {
      return res.status(400).json({ msg: "El nombre del agente es requerido." });
    }

    // Busca en la colección de usuarios por nombre (ignorando mayúsculas/minúsculas)
    const agente = await User.findOne({
      nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
    }).select("nombre correo email");

    if (!agente) {
      return res.status(404).json({ msg: "Agente no encontrado." });
    }

    // Devuelve el correo encontrado (ya sea 'correo' o 'email')
    res.json({
      nombre: agente.nombre,
      email: agente.correo || agente.email || "",
    });
  } catch (error) {
    console.error("❌ Error al buscar agente por nombre:", error);
    res.status(500).json({ msg: "Error al buscar agente por nombre." });
  }
};