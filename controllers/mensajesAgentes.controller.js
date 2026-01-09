const MensajeAgente = require('../models/MensajesAgente');
const User = require('../models/User'); // Asegúrate de importar tu modelo de usuario si lo usas

exports.crearMensaje = async (req, res) => {
  try {
    const remitente = await User.findById(req.user._id).lean();
    const destinatario = await User.findById(req.body.destinatarioId).lean();

    if (!remitente || !destinatario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const esRemitenteAgente = remitente.rol === 'agente';

    const mensaje = await MensajeAgente.create({
      // 🔥 ROLES CLAROS
      nombreAgente: esRemitenteAgente ? remitente.nombre : destinatario.nombre,
      emailAgente: esRemitenteAgente ? remitente.correo : destinatario.correo,
      telefonoAgente: esRemitenteAgente ? remitente.telefono : destinatario.telefono,
      fotoAgente: esRemitenteAgente ? remitente.fotoPerfil : destinatario.fotoPerfil,

      nombreCliente: esRemitenteAgente ? destinatario.nombre : remitente.nombre,
      emailCliente: esRemitenteAgente ? destinatario.correo : remitente.correo,
      telefonoCliente: esRemitenteAgente ? destinatario.telefono : remitente.telefono,
      fotoCliente: esRemitenteAgente ? destinatario.fotoPerfil : remitente.fotoPerfil,

      texto: req.body.texto,
      tipoOperacion: req.body.tipoOperacion || '',
      ubicacion: req.body.ubicacion || '',

      remitenteId: remitente._id,
      fecha: new Date()
    });

    res.json(mensaje);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al crear mensaje' });
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


exports.obtenerMensajes = async (req, res) => {
  try {
    const userName = req.user.nombre?.trim();
    const userId = req.user.id;

    const mensajes = await MensajeAgente.find({
      $and: [
        {
          $or: [
            { nombreAgente: userName },
            { nombreCliente: userName }
          ]
        },
        {
          $or: [
            { remitenteId: { $ne: userId } },
            { remitenteId: { $exists: false } },
            { remitenteId: null }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(mensajes);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ msg: "Error al obtener mensajes" });
  }
};

exports.responderMensaje = async (req, res) => {
  const { mensajeOriginalId, respuesta } = req.body;
  await MensajeAgente.findByIdAndUpdate(mensajeOriginalId, {
    $push: { respuestas: respuesta }
  });
  res.json({ msg: 'Respuesta agregada correctamente' });
};

exports.obtenerMensajesAgentes = async (req, res) => {
  try {
    const userEmail = (req.user.correo || req.user.email || '').toLowerCase().trim();
    if (!userEmail) {
      return res.status(401).json({ msg: 'Usuario no autenticado' });
    }

    // 🔹 Buscar todos los mensajes donde participe este usuario
    const mensajes = await MensajeAgente.find({
      $or: [{ emailAgente: userEmail }, { emailCliente: userEmail }],
    }).sort({ updatedAt: -1 });

    if (!mensajes.length) return res.json([]);

    // 🔹 Construir lista base
    const lista = mensajes.map((m) => {
      const soyAgente = m.emailAgente?.toLowerCase() === userEmail;

      return {
        correo: soyAgente ? m.emailCliente : m.emailAgente,
        nombre: soyAgente
          ? m.nombreCliente || m.emailCliente
          : m.nombreAgente || m.emailAgente,
        tipoOperacion: m.tipoOperacion || '',
        fecha: m.updatedAt || m.createdAt,
        origen: 'mensajes',
        tipoCliente: null, // luego lo completamos
      };
    });

    // 🔹 Obtener lista de correos únicos
    const correos = lista
      .map((c) => (c.correo || '').toLowerCase())
      .filter((c) => !!c);

    // 🔹 Buscar relaciones existentes entre este agente y los clientes
    const relaciones = await Relacion.find()
      .populate('cliente', 'correo email')
      .populate('agente', 'correo email tipoCliente');

    const mapaRelaciones = new Map();
    for (const r of relaciones) {
      const emailCliente = (r.cliente?.correo || r.cliente?.email || '').toLowerCase();
      const emailAgente = (r.agente?.correo || r.agente?.email || '').toLowerCase();
      if (emailAgente === userEmail) {
        mapaRelaciones.set(emailCliente, r.tipoCliente);
      }
    }

    // 🔹 Buscar información adicional de usuarios (nombre y foto)
    const users = await User.find({
      $or: [
        { correo: { $in: correos } },
        { email: { $in: correos } },
      ],
    }).select('correo email nombre fotoPerfil picture logo');

    const mapaUsuarios = new Map();
    for (const u of users) {
      const key = (u.correo || u.email || '').toLowerCase();
      mapaUsuarios.set(key, u);
    }

    // 🔹 Fusionar mensajes + relaciones + usuarios
    const fusion = lista.map((c) => {
      const tipoCliente = mapaRelaciones.get(c.correo.toLowerCase()) || '—';
      const userExtra = mapaUsuarios.get(c.correo.toLowerCase());

      return {
        ...c,
        tipoCliente,
        nombre: userExtra?.nombre || c.nombre || c.correo,
        fotoPerfil:
          userExtra?.fotoPerfil ||
          userExtra?.picture ||
          userExtra?.logo ||
          'https://www.svgrepo.com/show/452030/avatar-default.svg',
      };
    });

    // 🔹 Eliminar duplicados (por correo) y ordenar por fecha
    const mapaFinal = new Map();
    for (const c of fusion) {
      if (!mapaFinal.has(c.correo)) mapaFinal.set(c.correo, c);
    }

    const resultado = Array.from(mapaFinal.values()).sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener mensajes-agentes:', error);
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