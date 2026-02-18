// controllers/chatController
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Mensaje = require('../models/Mensaje');
const Propiedad = require('../models/Propiedad');
const { subirAGoogleStorage } = require('../utils/uploadToGCS');
const { hashParticipants } = require('../utils/chatHash');
const Seguimiento = require('../models/Seguimiento');

const upload = multer({ dest: path.join(__dirname, '../tmp') });
exports.uploadOne = upload.single('archivo');

  function emitSocketTo(req, evento, payload, receptorEmail, emisorEmail) {
    const io = req.app.get('io');
    if (!io) return;
    const toRoom = String(receptorEmail || '').toLowerCase();
    const fromRoom = String(emisorEmail || '').toLowerCase();
    if (toRoom) io.to(toRoom).emit(evento, payload);
    if (fromRoom) io.to(fromRoom).emit(evento, payload);
  }

  exports.enviarMensaje = async (req, res) => {
    try {
      const user = req.user;

      const usuarioEmail = (user.email || user.correo || '').toLowerCase();
      const emisorEmail = String(req.body.emisorEmail || '').toLowerCase();
      const receptorEmail = String(req.body.receptorEmail || '').toLowerCase();

      if (emisorEmail !== usuarioEmail) {
        return res.status(403).json({ msg: 'No puedes enviar como otro usuario' });
      }

      const existeConversacion = await Mensaje.exists({
        participantsHash: hashParticipants(emisorEmail, receptorEmail)
      });

      if (user.rol === 'agente' && !existeConversacion) {
        return res.status(403).json({
          msg: 'Los agentes no pueden iniciar conversaciones con clientes'
        });
      }

      const mensaje = String(req.body.mensaje || '');

      const doc = await Mensaje.create({
        emisorEmail,
        receptorEmail,
        mensaje,
        leido: false,
        fecha: new Date(),
        participantsHash: hashParticipants(emisorEmail, receptorEmail),
      });

      emitSocketTo(req, 'nuevoMensaje', doc, receptorEmail, emisorEmail);

      return res.json({ ok: true, mensaje: doc });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: 'Error al enviar mensaje' });
    }
  };


  exports.obtenerConversacion = async (req, res) => {
    try {
      const user = req.user;
      const authEmail = (user?.email || user?.correo || '').toLowerCase();

      let email1 = String(req.params.email1 || '').toLowerCase();
      let email2 = String(req.params.email2 || '').toLowerCase();

      if (!email1 || email1 === 'undefined') email1 = authEmail;
      if (!email2 || email2 === 'undefined') email2 = authEmail;

      if (authEmail !== email1 && authEmail !== email2) return res.status(403).json({ msg: 'No autorizado' });

      const mensajes = await Mensaje.aggregate([
        {
          $addFields: {
            emisorLower: { $toLower: { $ifNull: ['$emisorEmail', ''] } },
            receptorLower: { $toLower: { $ifNull: ['$receptorEmail', ''] } }
          }
        },
        {
          $match: {
            $expr: {
              $setEquals: [
                ['$emisorLower', '$receptorLower'],
                [email1, email2]
              ]
            }
          }
        },
        { $sort: { fecha: 1, createdAt: 1, _id: 1 } }
      ]);

      return res.json(mensajes);
    } catch (err) {
      return res.status(500).json({ msg: 'Error al obtener mensajes' });
    }
  };


  exports.misThreads = async (req, res) => {
    try {
      const user = req.user;
      const my = (user?.email || user?.correo || '').toLowerCase();
      if (!my) return res.status(401).json({ msg: 'No autenticado' });

      const ultimos = await Mensaje.aggregate([
        {
          $addFields: {
            emisorLower: { $toLower: { $ifNull: ['$emisorEmail', ''] } },
            receptorLower: { $toLower: { $ifNull: ['$receptorEmail', ''] } }
          }
        },
        {
          $match: {
            $or: [
              { $expr: { $eq: ['$emisorLower', my] } },
              { $expr: { $eq: ['$receptorLower', my] } }
            ]
          }
        },
        {
          $addFields: {
            a: {
              $cond: [
                { $lte: ['$emisorLower', '$receptorLower'] },
                '$emisorLower',
                '$receptorLower'
              ]
            },
            b: {
              $cond: [
                { $lte: ['$emisorLower', '$receptorLower'] },
                '$receptorLower',
                '$emisorLower'
              ]
            },
            otherLower: {
              $cond: [
                { $eq: ['$emisorLower', my] },
                '$receptorLower',
                '$emisorLower'
              ]
            }
          }
        },
        {
          $addFields: {
            participantsHash: { $concat: ['$a', '#', '$b'] }
          }
        },
        { $sort: { fecha: -1, createdAt: -1, _id: -1 } },
        {
          $group: {
            _id: '$participantsHash',
            lastMessage: { $first: '$$ROOT' }
          }
        },
        {
          $project: {
            participantsHash: '$_id',
            _id: 0,
            lastMessage: 1,
            otherLower: '$lastMessage.otherLower'
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { otherEmail: '$otherLower' },
            pipeline: [
              {
                $addFields: {
                  correoLower: { $toLower: { $ifNull: ['$correo', ''] } }
                }
              },
              {
                $match: {
                  $expr: { $eq: ['$correoLower', '$$otherEmail'] }
                }
              },
              {
                $project: {
                  _id: 0,
                  nombre: 1,
                  correo: 1,
                  fotoPerfil: 1,
                  picture: 1,
                  logo: 1,
                  rol: 1,          // 👈 CORRECTO
                  tipoCliente: 1   // 👈 CLAVE
                }
              }

            ],
            as: 'otherUser'
          }
        },
        {
          $addFields: {
            otherUser: { $first: '$otherUser' }
          }
        },
        {
          $project: {
            email: '$otherLower',
            username: { $ifNull: ['$otherUser.nombre', '$otherLower'] },
            fotoPerfil: {
              $ifNull: [
                '$otherUser.fotoPerfil',
                { $ifNull: ['$otherUser.picture', '$otherUser.logo'] }
              ]
            },

            tipoCliente: { $ifNull: ['$otherUser.tipoCliente', null] },
            rol: { $ifNull: ['$otherUser.rol', null] },

            lastMessage: {
              _id: '$lastMessage._id',
              mensaje: '$lastMessage.mensaje',
              fecha: '$lastMessage.fecha',
              leido: '$lastMessage.leido',
              archivoUrl: '$lastMessage.archivoUrl',
              tipoDocumento: '$lastMessage.tipoDocumento'
            }
          }
        },



        { $limit: 100 }
      ], { allowDiskUse: true });

      return res.json(ultimos);
    } catch (e) {
      console.error('Error al listar threads', e);
      return res.status(500).json({ msg: 'Error al listar threads' });
    }
  };



  exports.marcarLeido = async (req, res) => {
    try {
      const user = req.user;
      const authEmail = (user?.email || user?.correo || '').toLowerCase();
      const { id } = req.params;
      const msg = await Mensaje.findById(id);
      if (!msg) return res.status(404).json({ msg: 'Mensaje no encontrado' });
      if (String(msg.receptorEmail).toLowerCase() !== authEmail) {
        return res.status(403).json({ msg: 'No puedes marcar como leído mensajes de otros' });
      }
      msg.leido = true;
      await msg.save();
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ msg: 'Error al marcar leído' });
    }
  };

  exports.mensajesPorAgente = async (req, res) => {
    try {
      const { email } = req.params;
      const agenteEmail = String(email || '').toLowerCase();

      if (!agenteEmail)
        return res.status(400).json({ msg: 'Email del agente requerido' });

      const mensajes = await Mensaje.find({
        $or: [
          { emisorEmail: agenteEmail },
          { receptorEmail: agenteEmail }
        ]
      })
        .sort({ updatedAt: -1 })
        .lean();

      res.json(mensajes);
    } catch (err) {
      console.error('Error obteniendo mensajes por agente:', err);
      res.status(500).json({ msg: 'Error obteniendo mensajes' });
    }
  };

  exports.iniciarDesdePropiedad = async (req, res) => {
    try {
      const user = req.user;
      const clienteEmail = user?.email || user?.correo;
      const { propiedadId, mensajeOpcional } = req.body;

      if (!clienteEmail) return res.status(401).json({ msg: 'No autenticado' });
      if (!propiedadId) return res.status(400).json({ msg: 'propiedadId requerido' });

      const prop = await Propiedad.findById(propiedadId)
        .populate('agente', 'email correo nombre');
      if (!prop) return res.status(404).json({ msg: 'Propiedad no encontrada' });

      const agenteEmail = prop.agente?.email || prop.agente?.correo;
      const texto = mensajeOpcional || `Hola, me interesa la propiedad ${prop.clave || prop._id}.`;

      const doc = await Mensaje.create({
        emisorEmail: clienteEmail,
        receptorEmail: agenteEmail,
        mensaje: texto,
        propiedadId,
        propiedadClave: prop.clave || '',
        nombreCliente: user.nombre || '',
        fecha: new Date()
      });

      let seg = await Seguimiento.findOne({ clienteEmail, agenteEmail });
      if (!seg) {
        seg = await Seguimiento.create({
          clienteEmail,
          clienteNombre: user.nombre || '',
          agenteEmail,
          tipoOperacion: prop.tipoOperacion?.toUpperCase(),
          propiedadId,
          origen: 'mensajes',
          fechaPrimerContacto: new Date(),
        });
      } else if (!seg.propiedadId) {
        seg.propiedadId = propiedadId;
        await seg.save();
      }

      io.to(agenteEmail).emit("nuevoLead", {
        propiedad: prop.clave,
        cliente: clienteEmail,
        fecha: new Date()
      });

      await Propiedad.findByIdAndUpdate(propiedadId, {
        $inc: { contactosGenerados: 1 }
      });

      return res.json({ ok: true, mensaje: doc, seguimiento: seg });

    } catch (err) {
      console.error('iniciarDesdePropiedad error:', err);
      return res.status(500).json({ msg: 'Error al iniciar chat' });
    }
  };
  exports.cerrarSeguimiento = async (req, res) => {
    try {
      const { id } = req.params;
      const { estadoFinal } = req.body; // 'ganado' o 'perdido'

      const seg = await Seguimiento.findById(id);
      if (!seg) return res.status(404).json({ msg: 'Seguimiento no encontrado' });

      seg.estadoFinal = estadoFinal;
      seg.fechaCierre = new Date();
      seg.save();

      if (seg.propiedadId) {
        if (estadoFinal === 'ganado')
          await Propiedad.findByIdAndUpdate(seg.propiedadId, { $inc: { leadsGanados: 1 } });
        if (estadoFinal === 'perdido')
          await Propiedad.findByIdAndUpdate(seg.propiedadId, { $inc: { leadsPerdidos: 1 } });
      }

      return res.json({ ok: true, seguimiento: seg });

    } catch (err) {
      console.error('cerrarSeguimiento error:', err);
      return res.status(500).json({ msg: 'Error al cerrar seguimiento' });
    }
  };

