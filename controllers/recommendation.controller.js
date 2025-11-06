const Recommendation = require('../models/Recommendation');
const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

exports.enviarRecomendacion = async (req, res) => {
  try {
    const agenteId = req.user.id;
    const { clienteId, propiedadId, nota } = req.body;

    const rec = await Recommendation.findOneAndUpdate(
      { cliente: clienteId, propiedad: propiedadId },
      { $setOnInsert: { agente: agenteId, nota }, $set: { estado: 'pendiente' } },
      { new: true, upsert: true }
    );

    res.status(201).json({ msg: 'Recomendación enviada.', rec });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ msg: 'Ya existía una recomendación para este cliente/propiedad.' });
    }
    console.error(err);
    res.status(500).json({ msg: 'Error al enviar recomendación.' });
  }
};

exports.obtenerRecomendaciones = async (req, res) => {
  try {
    const clienteId = req.user.id;
    const { estado } = req.query;
    const filtro = { cliente: clienteId, ...(estado ? { estado } : {}) };

    const recs = await Recommendation.find(filtro)
      .populate('propiedad')
      .populate({ path:'agente', select:'nombre apellidos email' })
      .sort({ createdAt: -1 });

    await Recommendation.updateMany(
      { _id: { $in: recs.filter(r=>!r.vistoEn).map(r=>r._id) } },
      { $set: { vistoEn: new Date() } }
    );

    res.json(recs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener recomendaciones.' });
  }
};

exports.aceptarRecomendacion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const clienteId = req.user.id;
    const { recomendacionId } = req.params;

    const rec = await Recommendation.findOneAndUpdate(
      { _id: recomendacionId, cliente: clienteId },
      { $set: { estado: 'aceptada' } },
      { new: true, session }
    );
    if (!rec) {
      await session.abortTransaction();
      return res.status(404).json({ msg: 'Recomendación no encontrada.' });
    }

    await Wishlist.updateOne(
      { usuario: clienteId, propiedad: rec.propiedad },
      { $setOnInsert: { usuario: clienteId, propiedad: rec.propiedad } },
      { upsert: true, session }
    );

    await session.commitTransaction();
    res.json({ msg: 'Recomendación aceptada y agregada a favoritos.' });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ msg: 'Error al aceptar recomendación.' });
  } finally {
    session.endSession();
  }
};

exports.rechazarRecomendacion = async (req, res) => {
  try {
    const clienteId = req.user.id;
    const { recomendacionId } = req.params;

    const rec = await Recommendation.findOneAndUpdate(
      { _id: recomendacionId, cliente: clienteId },
      { $set: { estado: 'rechazada' } },
      { new: true }
    );
    if (!rec) return res.status(404).json({ msg: 'Recomendación no encontrada.' });

    res.json({ msg: 'Recomendación rechazada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al rechazar recomendación.' });
  }
};
