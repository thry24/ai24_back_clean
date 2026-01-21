const { v4: uuidv4 } = require('uuid');

const Seguimiento = require('../models/Seguimiento');
const Notificacion = require('../models/Notificacion');
const CartaOferta = require('../models/temps'); // ✅ MODELO REAL
const ChecklistDocumento = require('../models/ChecklistDocumento');
const Propiedad = require('../models/Propiedad');
const generarCartaOfertaPDF = require('../utils/generarCartaOfertaPDF');

const {
  enviarCartaOfertaPropietario,
  enviarChecklistPropietario,
  enviarCartaFirmadaAgente
} = require('../utils/mailer');

// ===============================
// CREAR / ENVIAR CARTA OFERTA
// ===============================
// ===============================
// CREAR / ENVIAR CARTA OFERTA
// ===============================
const crearCartaOferta = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      tipoOperacion,   // 'RENTA' | 'VENTA'
      montoOferta,     // renta mensual o precio venta
      condiciones,
      archivoUrl
    } = req.body;

    // 1️⃣ Validar seguimiento
    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ message: 'Seguimiento no encontrado' });
    }

    if (!seguimiento.fechaRecorrido) {
      return res.status(400).json({
        message: 'No se puede enviar carta oferta sin recorrido'
      });
    }

    // 2️⃣ Propiedad
    const propiedad = await Propiedad.findById(propiedadId);
    if (!propiedad) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }

    if (!propiedad.datosPropietario?.email) {
      return res.status(400).json({
        message: 'La propiedad no tiene correo del propietario'
      });
    }

    // 3️⃣ Crear carta oferta
    const carta = await CartaOferta.create({
      seguimientoId,
      propiedadId,
      propiedadClave: propiedad.clave,

      tipoOperacion,
      montoOferta,        // 🔥 ESTE ES EL BUENO
      condiciones,
      archivoUrl,

      clienteNombre: seguimiento.clienteNombre,
      clienteEmail: seguimiento.clienteEmail,

      propietarioEmail: propiedad.datosPropietario.email,
      agenteEmail: seguimiento.agenteEmail,

      enviadoA: 'PROPIETARIO',
      estado: 'ENVIADA'
    });

    // 4️⃣ Enviar correo al propietario
    const linkCarta =
      `${process.env.FRONTEND_URL}/cartas-oferta/${carta._id}`;

    await enviarCartaOfertaPropietario({
      to: propiedad.datosPropietario.email,
      nombrePropietario: propiedad.datosPropietario.nombre,
      propiedadClave: propiedad.clave,
      tipoOperacion,
      linkCarta
    });

    // 5️⃣ Actualizar seguimiento
    seguimiento.fechaCartaOferta = new Date();
    seguimiento.estatus = 'CARTA_OFERTA_ENVIADA';
    await seguimiento.save();

    // 6️⃣ Notificación interna
    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Carta oferta de ${tipoOperacion.toLowerCase()} enviada al propietario`,
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });

    res.status(201).json(carta);

  } catch (error) {
    console.error('❌ Error crear carta oferta:', error);
    res.status(500).json({ message: 'Error al crear carta oferta' });
  }
};

// ===============================
// ACEPTAR CARTA OFERTA
// ===============================
// ===============================
// ACEPTAR CARTA OFERTA
// ===============================
const aceptarCartaOferta = async (req, res) => {
  try {
    const { id } = req.params;

    const carta = await CartaOferta.findById(id);
    if (!carta || carta.estado !== 'ENVIADA') {
      return res.status(400).json({ message: 'Carta no válida' });
    }

    // 1️⃣ Aceptar carta
    carta.estado = 'ACEPTADA';
    carta.fechaRespuesta = new Date();
    await carta.save();
    // 🔥 PASO 2: GENERAR PDF
    const propiedad = await Propiedad.findById(carta.propiedadId);
    const { fileName } = await generarCartaOfertaPDF(carta, propiedad);
    carta.archivoUrl = `/uploads/cartas/${fileName}`;
    await carta.save();

    // 2️⃣ Actualizar seguimiento
    const seguimiento = await Seguimiento.findByIdAndUpdate(
      carta.seguimientoId,
      {
        fechaAceptacionCartaOferta: new Date(),
        estatus: 'CARTA_OFERTA_ACEPTADA'
      },
      { new: true }
    );

    // 3️⃣ Documentos según operación
    const documentosBase =
      carta.tipoOperacion === 'VENTA'
        ? [
            'Escritura del inmueble',
            'Identificación oficial',
            'CURP',
            'RFC',
            'Comprobante de domicilio',
            'Último predial pagado',
            'Certificado de libertad de gravamen'
          ]
        : [
            'Identificación oficial',
            'Comprobante de domicilio',
            'RFC',
            'Estado de cuenta'
          ];

      const checklist = await ChecklistDocumento.create({
        seguimientoId: seguimiento._id,
        tipoOperacion: carta.tipoOperacion,
        rol: 'PROPIETARIO',
        emailUsuario: carta.propietarioEmail,
        tokenAcceso: uuidv4(), // 👈 EXISTE
        documentos: documentosBase.map(nombre => ({
          nombre,
          obligatorio: true,
          subido: false
        }))
      });


    // 5️⃣ Enviar correo checklist
    const linkChecklist =
      `${process.env.FRONTEND_URL}/documentos/subir/${checklist.tokenAcceso}`;


    await enviarChecklistPropietario({
      to: checklist.emailUsuario,
      nombrePropietario: 'Propietario',
      tipoOperacion: checklist.tipoOperacion,
      documentos: documentosBase,
      linkChecklist
    });

    // 6️⃣ Notificación asesor
    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: 'Carta oferta aceptada. Checklist enviado al propietario.',
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });

    res.json({ ok: true });

  } catch (error) {
    console.error('❌ Error aceptar carta:', error);
    res.status(500).json({ message: 'Error al aceptar carta oferta' });
  }
};


// ===============================
// RECHAZAR CARTA OFERTA
// ===============================
const rechazarCartaOferta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ message: 'Motivo obligatorio' });
    }

    const carta = await CartaOferta.findById(id);
    if (!carta) {
      return res.status(404).json({ message: 'Carta oferta no encontrada' });
    }

    if (carta.estado !== 'ENVIADA') {
      return res.status(400).json({ message: 'La carta ya fue respondida' });
    }

    carta.estado = 'RECHAZADA';
    carta.motivoRechazo = motivo;
    carta.fechaRespuesta = new Date();
    await carta.save();

    const seguimiento = await Seguimiento.findById(carta.seguimientoId);
    seguimiento.estatus = 'CARTA_OFERTA_RECHAZADA';
    seguimiento.estatusOtraMotivo = motivo;
    await seguimiento.save();

    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Carta oferta rechazada: ${motivo}`,
      tipo: 'sistema',
      referenciaId: seguimiento._id,
    });

    res.json(carta);

  } catch (error) {
    console.error('❌ Error rechazar carta:', error);
    res.status(500).json({ message: 'Error al rechazar carta oferta' });
  }
};
// ===============================
// VER CARTA OFERTA (PÚBLICO)
// ===============================
// ===============================
// VER CARTA OFERTA (PÚBLICO)
// ===============================
const verCartaOfertaPublica = async (req, res) => {
  try {
    const { id } = req.params;

    const carta = await CartaOferta.findById(id)
      .populate('propiedadId');

    if (!carta) {
      return res.status(404).json({ message: 'Carta no encontrada' });
    }

    res.json(carta);
  } catch (error) {
    console.error('❌ Error obtener carta:', error);
    res.status(500).json({ message: 'Error al obtener carta oferta' });
  }
};
// ===============================
// ✍️ FIRMAR Y ACEPTAR CARTA (PÚBLICO)
// ===============================
const firmarCartaOferta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'Nombre obligatorio para firmar' });
    }

    const carta = await CartaOferta.findById(id);
    if (!carta) {
      return res.status(404).json({ message: 'Carta no encontrada' });
    }

    // 🔁 Si ya fue aceptada, no romper flujo
    if (carta.estado !== 'ENVIADA') {
      return res.status(200).json({
        ok: true,
        message: 'La carta ya fue aceptada previamente'
      });
    }

    /* ===============================
       1️⃣ Guardar firma
    =============================== */
    carta.firmaPropietario = {
      nombre,
      fecha: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    carta.estado = 'ACEPTADA';
    carta.fechaRespuesta = new Date();
    await carta.save();

    /* ===============================
       2️⃣ Generar PDF (BUFFER + PATH)
    =============================== */
    const propiedad = await Propiedad.findById(carta.propiedadId);

    const {
      filePath,
      fileName,
      buffer
    } = await generarCartaOfertaPDF(carta, propiedad);

    // Guardar solo la URL pública
    carta.archivoUrl = `/uploads/cartas/${fileName}`;
    await carta.save();

    /* ===============================
       3️⃣ Actualizar seguimiento
    =============================== */
    const seguimiento = await Seguimiento.findByIdAndUpdate(
      carta.seguimientoId,
      {
        fechaAceptacionCartaOferta: new Date(),
        estatus: 'CARTA_OFERTA_ACEPTADA'
      },
      { new: true }
    );

    /* ===============================
       4️⃣ Crear checklist
    =============================== */
    const documentosBase =
      carta.tipoOperacion === 'VENTA'
        ? [
            'Escritura del inmueble',
            'Identificación oficial',
            'CURP',
            'RFC',
            'Comprobante de domicilio',
            'Último predial pagado',
            'Certificado de libertad de gravamen'
          ]
        : [
            'Identificación oficial',
            'Comprobante de domicilio',
            'RFC',
            'Estado de cuenta'
          ];

    const checklist = await ChecklistDocumento.create({
      seguimientoId: seguimiento._id,
      tipoOperacion: carta.tipoOperacion,
      rol: 'PROPIETARIO',
      emailUsuario: carta.propietarioEmail,
      tokenAcceso: uuidv4(),
      documentos: documentosBase.map(nombre => ({
        nombre,
        obligatorio: true,
        subido: false
      }))
    });

    /* ===============================
       5️⃣ Enviar checklist
    =============================== */
    await enviarChecklistPropietario({
      to: carta.propietarioEmail,
      nombrePropietario: nombre,
      tipoOperacion: carta.tipoOperacion,
      documentos: documentosBase,
      linkChecklist: `${process.env.FRONTEND_URL}/documentos/subir/${checklist.tokenAcceso}`
    });

    /* ===============================
       6️⃣ Notificaciones internas
    =============================== */
    await Notificacion.create({
      usuarioEmail: carta.agenteEmail,
      mensaje: 'Carta oferta firmada y aceptada. Checklist enviado.',
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });

    await Notificacion.create({
      usuarioEmail: carta.agenteEmail,
      mensaje: 'El propietario aceptó y firmó la carta oferta. PDF adjunto enviado.',
      tipo: 'seguimiento',
      referenciaId: carta._id
    });

    /* ===============================
       7️⃣ 📎 Enviar PDF ADJUNTO al agente
    =============================== */
    await enviarCartaFirmadaAgente({
      to: carta.agenteEmail,
      nombreAgente: carta.agenteEmail,
      propiedadClave: carta.propiedadClave,
      pdfBuffer: buffer // 👈 AQUÍ ESTÁ LA MAGIA
    });

    /* ===============================
       RESPUESTA FINAL
    =============================== */
    return res.json({
      ok: true,
      message: 'Carta firmada, PDF generado y enviado al agente'
    });

  } catch (error) {
    console.error('❌ Error firmar carta:', error);
    return res.status(500).json({
      message: 'Error al firmar la carta oferta'
    });
  }
};



module.exports = {
  crearCartaOferta,
  aceptarCartaOferta,
  rechazarCartaOferta,
  verCartaOfertaPublica,
  firmarCartaOferta
};
