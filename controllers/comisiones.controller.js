const Colaboracion = require("../models/Colaboracion");
const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const mongoose = require("mongoose");
const Comision = require('../models/Comision');
const Seguimiento = require('../models/Seguimiento');
const Notificacion = require('../models/Notificacion');

exports.comisionesInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.user.inmobiliaria;
    if (!inmobiliariaId) {
      return res.status(403).json({ msg: "No perteneces a una inmobiliaria" });
    }

    // 1️⃣ Traer agentes de la inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
      .select("_id nombre fotoPerfil correo");

    const idsAgentes = agentes.map(a => a._id);

    // 2️⃣ Traer colaboraciones donde PARTICIPEN esos agentes
    const colabs = await Colaboracion.find({
      $or: [
        { agentePrincipal: { $in: idsAgentes } },
        { colaborador: { $in: idsAgentes } }
      ]
    })
      .populate("agentePrincipal", "nombre fotoPerfil correo")
      .populate("colaborador", "nombre fotoPerfil correo")
      .populate("propiedad", "imagenPrincipal tipoPropiedad precio createdAt")
      .lean();

    // 3️⃣ Armar respuesta final estilo tu front
    const resultado = colabs.map(c => {
      const principal = c.agentePrincipal
        ? {
            nombre: c.agentePrincipal.nombre,
            avatar: c.agentePrincipal.fotoPerfil
          }
        : null;

      const colab = c.colaborador
        ? {
            nombre: c.colaborador.nombre,
            avatar: c.colaborador.fotoPerfil
          }
        : null;

      return {
        idPropiedad: c.propiedad?._id || "SIN-ID",
        thumbnail: c.propiedad?.imagenPrincipal || "",
        miAgente: principal,
        tipoComision: colab ? "Compartida" : "Directa",
        colaborador: colab,
        porcentaje: c.comision || 0,
        comisionUSD: calcularComisionUSD(c.propiedad?.precio, c.comision),
        fechaPago: c.createdAt,
        comisionMensual: calcularMensual(c.propiedad?.precio, c.comision),
        comisionAnual: calcularAnual(c.propiedad?.precio, c.comision),
      };
    });

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error en comisionesInmobiliaria:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};

// 📌 Helpers de cálculo
function calcularComisionUSD(precio, porcentaje) {
  if (!precio || !porcentaje) return 0;
  return (precio * porcentaje) / 100;
}

function calcularMensual(precio, porcentaje) {
  const total = calcularComisionUSD(precio, porcentaje);
  return total / 12;
}

function calcularAnual(precio, porcentaje) {
  return calcularComisionUSD(precio, porcentaje);
}

exports.generarComision = async (req, res) => {
  try {
    const { seguimientoId, porcentaje, monto, notas } = req.body;
    const user = req.user;

    if (!seguimientoId || !porcentaje || !monto) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento || seguimiento.estadoFinal !== 'GANADO') {
      return res.status(400).json({ msg: 'El seguimiento no está ganado' });
    }

    const propiedad = await Propiedad.findById(seguimiento.propiedadId);

    // 🔒 Evitar duplicados
    const existe = await Comision.findOne({ seguimiento: seguimientoId });
    if (existe) {
      return res.status(400).json({ msg: 'La comisión ya fue generada' });
    }

    const comision = await Comision.create({
      seguimiento: seguimientoId,
      propiedad: propiedad._id,
      agentePagador: propiedad.agenteEmail || seguimiento.agenteEmail,
      agenteReceptor: seguimiento.agenteEmail,
      tipoOperacion: seguimiento.tipoOperacion,
      porcentaje,
      monto,
      notas
    });

    // 🔔 Notificaciones
    await Notificacion.create({
      usuarioEmail: comision.agenteReceptor,
      mensaje: `Se generó un formato de comisión por ${monto}`,
      tipo: 'sistema',
      referenciaId: comision._id
    });

    await Notificacion.create({
      usuarioEmail: comision.agentePagador,
      mensaje: `Debes realizar el pago de comisión por ${monto}`,
      tipo: 'contacto',
      referenciaId: comision._id
    });

    res.json({ ok: true, comision });
  } catch (err) {
    console.error('❌ generarComision', err);
    res.status(500).json({ msg: 'Error al generar comisión' });
  }
};
exports.confirmarPagoComision = async (req, res) => {
  try {
    const { id } = req.params;

    const comision = await Comision.findById(id);
    if (!comision) {
      return res.status(404).json({ msg: 'Comisión no encontrada' });
    }

    comision.estado = 'PAGADA';
    comision.fechaPago = new Date();
    await comision.save();

    // 🔔 Notificaciones
    await Notificacion.create({
      usuarioEmail: comision.agenteReceptor,
      mensaje: `El pago de comisión fue confirmado`,
      tipo: 'sistema',
      referenciaId: comision._id
    });

    await Notificacion.create({
      usuarioEmail: comision.agentePagador,
      mensaje: `Confirmaste el pago de la comisión`,
      tipo: 'sistema',
      referenciaId: comision._id
    });

    res.json({ ok: true, comision });
  } catch (err) {
    console.error('❌ confirmarPagoComision', err);
    res.status(500).json({ msg: 'Error al confirmar pago' });
  }
};
