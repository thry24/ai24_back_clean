const Seguimiento = require("../models/Seguimiento");
const Relacion = require('../models/RelacionAgenteCliente'); // 👈 asegúrate de importar tu modelo de relación
const Propiedad = require("../models/Propiedad"); 
const User = require("../models/User"); // 👈 tu modelo real
const CartaOferta = require('../models/temps'); // 👈 AQUÍ
const Colaboracion = require('../models/Colaboracion');
const SeleccionPropiedad = require('../models/SeleccionPropiedad');

const { resolverTipoOperacion, calcularEstatus, aplicarCierreAutomatico } = require('./seguimiento.logic');
exports.crearOObtenerSeguimiento = async (req, res) => {
  try {
    const { clienteEmail, agenteEmail } = req.body;

    // 1️⃣ Buscar si ya existe
    let seguimiento = await Seguimiento.findOne({ clienteEmail, agenteEmail });

    if (!seguimiento) {
      // 2️⃣ Intentar traer el tipoCliente desde la relación
      const relacion = await Relacion.findOne({ clienteEmail, agenteEmail });
      const tipoCliente = relacion?.tipoCliente || null;

      // 3️⃣ Crear nuevo seguimiento con ese tipo
      seguimiento = new Seguimiento({
        ...req.body,
        tipoCliente,
      });
      await seguimiento.save();
    }

    res.status(200).json(seguimiento);
  } catch (err) {
    console.error('❌ Error creando seguimiento:', err);
    res.status(500).json({ msg: 'Error al crear seguimiento' });
  }
};
// ✅ Crear o devolver seguimiento existente sin reemplazar a otros
exports.createOrGetSeguimiento = async (req, res) => {
  try {
    const {
      clienteEmail,
      clienteNombre = "",
      agenteEmail,
      tipoOperacion = "",
    } = req.body;

    if (!clienteEmail || !agenteEmail) {
      return res.status(400).json({ message: "clienteEmail y agenteEmail son requeridos" });
    }

    // Normalizar correos
    const clienteEmailLower = clienteEmail.toLowerCase();
    const agenteEmailLower = agenteEmail.toLowerCase();

    // 🔍 Buscar los usuarios reales (por correo)
    const clienteUser = await User.findOne({ correo: clienteEmailLower });
    const agenteUser = await User.findOne({ correo: agenteEmailLower });

    if (!clienteUser || !agenteUser) {
      return res.status(404).json({ message: "No se encontraron los usuarios" });
    }

    // 🔎 Buscar si ya existe seguimiento (por emails)
    const existente = await Seguimiento.findOne({
      clienteEmail: clienteEmailLower,
      agenteEmail: agenteEmailLower,
    });

    if (existente) return res.json(existente);

    // 🧩 Buscar la relación cliente–agente por IDs
    const relacion = await Relacion.findOne({
      cliente: clienteUser._id,
      agente: agenteUser._id,
    });

    // ⚙️ Determinar tipoCliente desde la relación
    const tipoClienteFinal = relacion?.tipoCliente || "directo";

    // 🆕 Crear el seguimiento con el tipoCliente correcto
    const nuevo = await Seguimiento.create({
      clienteEmail: clienteEmailLower,
      clienteNombre,
      agenteEmail: agenteEmailLower,
      tipoCliente: tipoClienteFinal,
      tipoOperacion,
      fechaPrimerContacto: new Date(),
    });

    return res.status(201).json(nuevo);
  } catch (err) {
    console.error("❌ createOrGetSeguimiento error:", err);
    return res.status(500).json({ message: "Error creando seguimiento" });
  }
};

exports.registrarRetroalimentacion = async (req, res) => {
  try {
    const { seguimientoId } = req.params;
    const {
      comentario,
      recorridoNoSeDio,
      continuar
    } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 📌 Guardar retroalimentación
    seguimiento.fechaRetroalimentacion = new Date();
    seguimiento.comentarioRetroalimentacion = comentario || '';

    // ❌ Si NO se dio el recorrido
    if (recorridoNoSeDio) {
      seguimiento.recorridoNoSeDio = true;
      seguimiento.estatus = 'Recorrido no realizado';
    }

    // ❌ Si el cliente NO desea continuar
    if (continuar === false) {
      seguimiento.estadoFinal = 'PERDIDO';
      seguimiento.fechaFinalizacion = new Date();
      seguimiento.estatus = 'Seguimiento cerrado';
    }

    await seguimiento.save();

    // 🔔 Notificación al agente
    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Se registró retroalimentación del recorrido del cliente ${seguimiento.clienteNombre}`,
      tipo: 'contacto',
      referenciaId: seguimiento._id,
    });

    res.json({ ok: true, seguimiento });
  } catch (err) {
    console.error('❌ registrarRetroalimentacion', err);
    res.status(500).json({ msg: 'Error al registrar retroalimentación' });
  }
};
exports.registrarSegundoRecorrido = async (req, res) => {
  try {
    const { seguimientoId } = req.params;
    const { fecha } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (!seguimiento.recorridoNoSeDio) {
      return res.status(400).json({
        msg: 'No se puede agendar segundo recorrido si el primero sí se realizó',
      });
    }

    seguimiento.fechaSegundoRecorrido = new Date(fecha);
    seguimiento.estatus = 'Segundo recorrido programado';
    await seguimiento.save();

    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Se programó segundo recorrido para el cliente ${seguimiento.clienteNombre}`,
      tipo: 'contacto',
      referenciaId: seguimiento._id,
    });

    res.json({ ok: true, seguimiento });
  } catch (err) {
    console.error('❌ registrarSegundoRecorrido', err);
    res.status(500).json({ msg: 'Error al programar segundo recorrido' });
  }
};
exports.registrarSegundaRetroalimentacion = async (req, res) => {
  try {
    const { seguimientoId } = req.params;
    const { comentario, continuar } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    seguimiento.fechaSegundaRetroalimentacion = new Date();
    seguimiento.comentarioSegundaRetroalimentacion = comentario || '';

    if (continuar === false) {
      seguimiento.estadoFinal = 'PERDIDO';
      seguimiento.fechaFinalizacion = new Date();
      seguimiento.estatus = 'Seguimiento cerrado';
    }

    await seguimiento.save();

    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Segunda retroalimentación registrada para ${seguimiento.clienteNombre}`,
      tipo: 'contacto',
      referenciaId: seguimiento._id,
    });

    res.json({ ok: true, seguimiento });
  } catch (err) {
    console.error('❌ registrarSegundaRetroalimentacion', err);
    res.status(500).json({ msg: 'Error al registrar segunda retroalimentación' });
  }
};

// ✅ Obtener todos los seguimientos de un agente
// ✅ Obtener todos los seguimientos de un agente
exports.getByAgente = async (req, res) => {
  try {
    // 🔥 Decodificar por si viene como %40
    const rawEmail = req.params.agenteEmail;
    const agenteEmail = decodeURIComponent(rawEmail).toLowerCase();

    if (!agenteEmail) {
      return res.status(400).json({ message: "agenteEmail requerido" });
    }

    // Buscar coincidencias exactas por email del agente
    const seguimientos = await Seguimiento.find({
      agenteEmail: agenteEmail,
    }).sort({ updatedAt: -1 });

    return res.json(seguimientos);
  } catch (err) {
    console.error("❌ getByAgente error:", err);
    return res.status(500).json({ message: "Error obteniendo seguimientos" });
  }
};


// ✅ Obtener seguimiento por cliente/agente
exports.getByClienteAgente = async (req, res) => {
  try {
    const { clienteEmail, agenteEmail } = req.query;
    if (!clienteEmail || !agenteEmail) {
      return res
        .status(400)
        .json({ message: "clienteEmail y agenteEmail requeridos" });
    }
    const seg = await Seguimiento.findOne({
      clienteEmail: clienteEmail.toLowerCase(),
      agenteEmail: agenteEmail.toLowerCase(),
    });
    if (!seg) return res.status(404).json({ message: "No encontrado" });
    return res.json(seg);
  } catch (err) {
    console.error("getByClienteAgente error:", err);
    return res.status(500).json({ message: "Error" });
  }
};

// ✅ Actualizar seguimiento
exports.patchSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body || {};

    const seg = await Seguimiento.findByIdAndUpdate(id, { $set: cambios }, { new: true });
    if (!seg) return res.status(404).json({ message: "No encontrado" });
    return res.json(seg);
  } catch (err) {
    console.error("patchSeguimiento error:", err);
    return res.status(500).json({ message: "Error actualizando seguimiento" });
  }
};
// controllers/seguimientoController.js
exports.getSeguimientosPorAgente = async (req, res) => {
  try {
    const agenteId = req.params.agenteId;

    // Obtén email del agente (porque tu modelo usa agenteEmail, no id)
    const agente = await User.findById(agenteId);
    if (!agente) {
      return res.status(404).json({ ok: false, msg: "Agente no encontrado" });
    }

    const seguimientos = await Seguimiento.find({
      agenteEmail: agente.correo
    });

    res.json({ ok: true, seguimientos });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: "Error obteniendo seguimientos" });
  }
};
exports.getByInmobiliaria = async (req, res) => {
  try {
    const { inmobiliariaId } = req.params;

    // 1. Obtener los agentes que pertenecen a esa inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId });

    if (!agentes.length) {
      return res.json({ seguimientos: [] });
    }

    const correos = agentes.map(a => a.correo);

    // 2. Traer todos los seguimientos de esos agentes
    const seguimientos = await Seguimiento.find({
      agenteEmail: { $in: correos }
    }).sort({ createdAt: -1 });

    return res.json({ seguimientos });

  } catch (error) {
    console.error("Error obteniendo seguimientos:", error);
    return res.status(500).json({ msg: "Error interno del servidor" });
  }
};
exports.obtenerSeguimientosDeInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.params.inmobiliariaId || req.params.id;

    // 1️⃣ Obtener agentes de la inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
      .select("_id nombre fotoPerfil correo email");

    if (!agentes.length) return res.json([]);

    const agentesMap = {};
    agentes.forEach(a => {
      agentesMap[a.correo || a.email] = {
        nombre: a.nombre,
        foto: a.fotoPerfil || "",
      };
    });

    const agentesEmails = Object.keys(agentesMap);

    // 2️⃣ Obtener seguimientos de esos agentes
    const seguimientos = await Seguimiento.find({
      agenteEmail: { $in: agentesEmails }
    })
      .sort({ updatedAt: -1 })
      .lean();

    // 3️⃣ Obtener propiedades vinculadas
    const propiedadesIds = seguimientos
      .filter(s => s.propiedadId)
      .map(s => s.propiedadId);

    const propiedades = await Propiedad.find({ _id: { $in: propiedadesIds } })
      .select("titulo descripcion clave imagenPrincipal imagenes")
      .lean();

    const propiedadesMap = {};
    propiedades.forEach(p => {
      propiedadesMap[p._id] = p;
    });

    // 4️⃣ Construir respuesta EXACTA para tu frontend
    const resultado = seguimientos.map(s => {
      const agente = agentesMap[s.agenteEmail] || { nombre: "Agente desconocido", foto: "" };
      const prop = propiedadesMap[s.propiedadId] || null;

      return {
        _id: s._id,
        clienteNombre: s.clienteNombre || "Sin nombre",
        clienteEmail: s.clienteEmail,

        agenteEmail: s.agenteEmail,
        agenteNombre: agente.nombre,
        agenteFoto: agente.foto,

        tipoOperacion: s.tipoOperacion || "—",
        tipoCliente: s.tipoCliente || "—",
        fechaPrimerContacto: s.fechaPrimerContacto,
        estatus: s.estatus || "—",

        propiedadId: s.propiedadId,
        propiedadDescripcion: prop?.descripcion || "—",
        propiedadImg: prop?.imagenPrincipal || prop?.imagenes?.[0] || "assets/img/no-image.png"
      };
    });

    res.json(resultado);

  } catch (err) {
    console.error("Error obteniendo seguimientos:", err);
    res.status(500).json({ msg: "Error al obtener seguimientos" });
  }
};
exports.getSeguimientosDashboardInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.params.id;

    // 1️⃣ Obtener agentes de la inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
      .select("_id nombre fotoPerfil correo email");

    if (!agentes.length) return res.json([]);

    const agentesMap = {};
    const agentesCorreos = [];

    agentes.forEach(a => {
      const correo = a.correo || a.email;
      agentesCorreos.push(correo);
      agentesMap[correo] = {
        nombre: a.nombre,
        avatar: a.fotoPerfil || ""
      };
    });

    // 2️⃣ Obtener seguimientos de todos esos agentes
    const seguimientos = await Seguimiento.find({
      agenteEmail: { $in: agentesCorreos }
    })
      .sort({ updatedAt: -1 })
      .lean();

    // 3️⃣ Traer propiedades ligadas
    const propiedadesIds = seguimientos
      .filter(s => s.propiedadId)
      .map(s => s.propiedadId);

    const propiedades = await Propiedad.find({
      _id: { $in: propiedadesIds }
    })
      .select("titulo clave descripcion imagenPrincipal imagenes agente")
      .lean();

    const propiedadesMap = {};
    propiedades.forEach(p => propiedadesMap[p._id] = p);

    // 4️⃣ Construir ARRAY para el dashboard (formato esperado por tu HTML)
    const resultado = seguimientos.map(seg => {
      const agente = agentesMap[seg.agenteEmail];
      const prop = seg.propiedadId ? propiedadesMap[seg.propiedadId] : null;

      return {
        id: prop?._id || "SIN ID",
        img: prop?.imagenPrincipal || (prop?.imagenes?.[0] ?? "assets/img/no-image.png"),

        agente: agente?.nombre || seg.agenteEmail,
        agenteAvatar: agente?.avatar || "",

        cliente: seg.clienteNombre || seg.clienteEmail,
        fecha: seg.fechaPrimerContacto,
        
        tipoOperacion: seg.tipoOperacion || "—",
        tipoComision: seg.tipoCliente === "compartido" ? "COMPARTIDA" : "DIRECTA",

        propiedades: 1,

        caracteristicas: prop?.descripcion || "—",

        estatusActual: seg.estatus,
        seguimientoId: seg._id,
        propiedadId: seg.propiedadId,

        asesorCompartido: seg.tipoCliente === "compartido" ? agente?.nombre : null
      };
    });

    res.json(resultado);

  } catch (error) {
    console.error("Error obteniendo dashboard:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};



// ✅ Crear/Upsert desde contacto (MENSAJES)
exports.upsertDesdeContacto = async ({ clienteEmail, clienteNombre, agenteEmail, tipoCliente, propiedad, origen }) => {
  const propiedadTipoOperacion = (propiedad?.tipoOperacion || '').toUpperCase(); // puede ser VENTA/RENTA
  const tipoOperacion = resolverTipoOperacion({ tipoCliente, propiedadTipoOperacion });

  const query = { clienteEmail, agenteEmail, propiedadId: propiedad._id };

  const update = {
    $setOnInsert: { fechaPrimerContacto: new Date(), estadoFinal: 'EN PROCESO' },
    $set: {
      clienteNombre: clienteNombre || '',
      tipoCliente: tipoCliente || 'cliente',
      origen: (origen || 'MENSAJES').toUpperCase(),
      propiedadTipoOperacion,
    },
  };

  if (tipoOperacion) update.$set.tipoOperacion = tipoOperacion;

  const seg = await Seguimiento.findOneAndUpdate(query, update, { new: true, upsert: true });
  seg.estatus = calcularEstatus(seg);
  aplicarCierreAutomatico(seg);
  await seg.save();

  return seg;
};

// ✅ Crear/Upsert desde colaboración (COLABORACIONES)
// Recomendación: si colaboración no tiene propiedad, crea seguimiento SIN propiedadId
exports.upsertDesdeColaboracion = async ({ agenteEmail, clienteEmail, clienteNombre, tipoCliente }) => {
  const query = { clienteEmail, agenteEmail, propiedadId: null };

  const update = {
    $setOnInsert: { fechaPrimerContacto: new Date(), estadoFinal: 'EN PROCESO' },
    $set: {
      clienteNombre: clienteNombre || '',
      tipoCliente: tipoCliente || 'agente',
      origen: 'COLABORACIONES',
      // aquí normalmente NO hay propiedad, así que no se define tipoOperacion a menos que tú lo quieras
    },
  };

  const seg = await Seguimiento.findOneAndUpdate(query, update, { new: true, upsert: true });
  seg.estatus = calcularEstatus(seg);
  await seg.save();
  return seg;
};

// ✅ Listar por agente
exports.getByAgente = async (req, res) => {
  try {
    const agenteEmail = decodeURIComponent(req.params.agenteEmail || '').toLowerCase().trim();
    const segs = await Seguimiento.find({ agenteEmail }).sort({ updatedAt: -1 });
    res.json(segs);
  } catch (e) {
    res.status(500).json({ msg: 'Error obteniendo seguimientos' });
  }
};

// ✅ Buscar por clienteEmail + propiedadId (para no duplicar)
exports.getByClienteYPropiedad = async (req, res) => {
  try {
    const clienteEmail = (req.query.clienteEmail || '').toLowerCase().trim();
    const propiedadId = req.query.propiedadId || null;
    const q = { clienteEmail };
    if (propiedadId) q.propiedadId = propiedadId;

    const segs = await Seguimiento.find(q).sort({ updatedAt: -1 });
    res.json(segs);
  } catch (e) {
    res.status(500).json({ msg: 'Error consultando seguimientos' });
  }
};

// ✅ Aplicar acción (checkbox/botón) con fecha automática
exports.aplicarAccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion, valor, motivo } = req.body || {};

    const seg = await Seguimiento.findById(id);
    if (!seg) return res.status(404).json({ msg: 'Seguimiento no encontrado' });

    const now = new Date();

    switch (accion) {
      // --------- COMUN -----------
      case 'SET_FECHA_CITA':
        seg.fechaCita = seg.fechaCita || now;
        break;

      case 'SET_FECHA_RECORRIDO':
        seg.fechaRecorrido = seg.fechaRecorrido || now;
        break;

      // --------- VENTA -----------
      case 'GENERAR_CARTA_INTENCION':
        seg.fechaCarta = seg.fechaCarta || now;
        break;

      case 'DOCS_COMPLETOS_VENTA':
        seg.docsCompletos = !!valor;
        seg.fechaDocsCompletos = valor ? (seg.fechaDocsCompletos || now) : null;
        break;

      case 'SET_FECHA_NOTARIA':
        seg.fechaNotaria = seg.fechaNotaria || now;
        break;

      case 'SET_FECHA_FIRMA_VENTA':
        seg.fechaFirma = seg.fechaFirma || now;
        break;

      // --------- RENTA -----------
      case 'RECORRIDO_NO_SE_DIO':
        seg.recorridoNoSeDio = !!valor;
        if (!valor) {
          seg.fechaSegundaRetroalimentacion = null;
          seg.fechaSegundoRecorrido = null;
        }
        break;

      case 'SEGUNDA_RETROALIMENTACION':
        seg.fechaSegundaRetroalimentacion = seg.fechaSegundaRetroalimentacion || now;
        break;

      case 'SEGUNDO_RECORRIDO':
        seg.fechaSegundoRecorrido = seg.fechaSegundoRecorrido || now;
        break;

      case 'GENERAR_CARTA_OFERTA':
        seg.fechaCartaOferta = seg.fechaCartaOferta || now;
        break;

      case 'DOCS_COMPLETOS_RENTA':
        seg.documentosCompletos = !!valor;
        seg.fechaDocumentosCompletos = valor ? (seg.fechaDocumentosCompletos || now) : null;
        break;

      case 'SET_BORRADOR_RENTA':
        seg.fechaBorradorArr = seg.fechaBorradorArr || now;
        break;

      case 'SET_FIRMA_RENTA':
        seg.fechaFirmaArr = seg.fechaFirmaArr || now;
        break;

      // --------- CIERRE -----------
      case 'CERRAR_PERDIDO':
        seg.estadoFinal = 'PERDIDO';
        seg.fechaCierre = seg.fechaCierre || now;
        seg.estatusOtraMotivo = motivo || seg.estatusOtraMotivo || 'Sin motivo';
        break;

      default:
        return res.status(400).json({ msg: 'Acción inválida' });
    }

    // recalcular estatus + cierre automático ganado
    seg.estatus = calcularEstatus(seg);
    aplicarCierreAutomatico(seg);

    await seg.save();
    return res.json(seg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Error aplicando acción' });
  }
};
exports.cerrarSeguimiento = async (req, res) => {
  try {
    const { seguimientoId } = req.params;
    const { resultado, motivoPerdida } = req.body; 
    // resultado: 'GANADO' | 'PERDIDO'

    if (!['GANADO', 'PERDIDO'].includes(resultado)) {
      return res.status(400).json({ msg: 'Resultado inválido' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 🔒 Evitar doble cierre
    if (seguimiento.estadoFinal !== 'EN PROCESO') {
      return res.status(400).json({ msg: 'El seguimiento ya fue cerrado' });
    }

    // 🧭 Actualizar seguimiento
    seguimiento.estadoFinal = resultado;
    seguimiento.fechaCierre = new Date();
    seguimiento.estatus = 'Operación finalizada';

    if (resultado === 'PERDIDO' && motivoPerdida) {
      seguimiento.estatusOtraMotivo = motivoPerdida;
    }

    await seguimiento.save();

    // 🏠 Actualizar métricas de propiedad
    if (seguimiento.propiedadId) {
      await Propiedad.findByIdAndUpdate(seguimiento.propiedadId, {
        $inc: resultado === 'GANADO'
          ? { leadsGanados: 1 }
          : { leadsPerdidos: 1 }
      });
    }

    // 🔔 Notificaciones
    const mensaje =
      resultado === 'GANADO'
        ? 'La operación se ha cerrado exitosamente 🎉'
        : 'La operación fue marcada como perdida';

    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje,
      tipo: 'sistema',
      referenciaId: seguimiento._id,
    });

    if (seguimiento.clienteEmail) {
      await Notificacion.create({
        usuarioEmail: seguimiento.clienteEmail,
        mensaje,
        tipo: 'contacto',
        referenciaId: seguimiento._id,
      });
    }

    res.json({ ok: true, seguimiento });
  } catch (err) {
    console.error('❌ cerrarSeguimiento', err);
    res.status(500).json({ msg: 'Error al cerrar seguimiento' });
  }
};


exports.obtenerSeguimientoPorId = async (req, res) => {
  try {
    const seguimiento = await Seguimiento.findById(req.params.id).lean();
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }
    const cartaOferta = await CartaOferta.findOne({
      seguimientoId: seguimiento._id
    }).lean();


    // ================================
    // 🔑 1️⃣ PROPIEDAD CONFIRMADA REAL
    // ================================
    const seleccionConfirmada = await SeleccionPropiedad.findOne({
      seguimiento: seguimiento._id,
      estado: 'SELECCIONADA'
    }).lean();

    let propiedadConfirmada = null;
    let esPropiedadMia = false;
    let colaboracionEstado = null;

    if (seleccionConfirmada) {
      propiedadConfirmada = await Propiedad.findById(
        seleccionConfirmada.propiedad
      )
        .populate('agente', 'correo email')
        .lean();

      if (propiedadConfirmada?.agente) {
        const correoAgentePropiedad =
          propiedadConfirmada.agente.correo ||
          propiedadConfirmada.agente.email;

        esPropiedadMia =
          correoAgentePropiedad === seguimiento.agenteEmail;

        // ================================
        // 🤝 2️⃣ COLABORACIÓN (SI NO ES MÍA)
        // ================================
        if (!esPropiedadMia) {
          const colaboracion = await Colaboracion.findOne({
            propiedad: propiedadConfirmada._id,
            agenteEmail: correoAgentePropiedad
          }).lean();

          colaboracionEstado = colaboracion?.estado || 'pendiente';
        }
      }
    }

    // ================================
    // 📤 RESPUESTA FINAL AL FRONT
    // ================================
    return res.json({
      ...seguimiento,

      // 🔥 CLAVES REALES
      propiedadConfirmadaId: propiedadConfirmada?._id || null,
      propiedadConfirmada,

      // 🔐 FLAGS DE CONTROL
      esPropiedadMia,
      colaboracionEstado,
      cartaOferta
    });

  } catch (err) {
    console.error('❌ obtenerSeguimientoPorId', err);
    res.status(500).json({ msg: 'Error al obtener seguimiento' });
  }
};



exports.getSeguimientoActivoCliente = async (req, res) => {
  try {
    const { clienteEmail } = req.params;

    if (!clienteEmail) {
      return res.status(400).json({ msg: 'clienteEmail requerido' });
    }

    const seguimiento = await Seguimiento.findOne({
      clienteEmail: clienteEmail.toLowerCase(),
      estatus: { $ne: 'cerrado' }
    }).sort({ createdAt: -1 });

    if (!seguimiento) {
      return res.status(404).json(null);
    }

    res.json(seguimiento);
  } catch (err) {
    console.error('❌ getSeguimientoActivoCliente', err);
    res.status(500).json({ msg: 'Error al obtener seguimiento activo' });
  }
};
exports.agendarCita = async (req, res) => {
  try {
    const { seguimientoId } = req.params;

    const seguimiento = await Seguimiento.findById(seguimientoId)
      .populate('propiedadConfirmada');

    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (!seguimiento.propiedadConfirmada) {
      return res.status(400).json({ msg: 'No hay propiedad confirmada' });
    }

    if (seguimiento.fechaCita) {
      return res.status(400).json({ msg: 'La cita ya fue creada' });
    }

    // 👉 crear cita
    const cita = await Cita.create({
      seguimiento: seguimiento._id,
      clienteNombre: seguimiento.clienteNombre,
      clienteEmail: seguimiento.clienteEmail,
      agenteEmail: seguimiento.agenteEmail,
      propiedad: seguimiento.propiedadConfirmada._id,
      propiedadClave: seguimiento.propiedadConfirmada.clave,
      propiedadImagen: seguimiento.propiedadConfirmada.imagenPrincipal,
      tipoOperacion: seguimiento.tipoOperacion,
      tipoEvento: 'CITA',
      fecha: new Date(), // luego la podrás editar
    });

    seguimiento.fechaCita = cita.fecha;
    await seguimiento.save();

    res.json(seguimiento);

  } catch (err) {
    console.error('❌ agendarCita', err);
    res.status(500).json({ msg: 'Error al agendar cita' });
  }
};
