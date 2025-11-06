const Comparar = require('../models/Comparar');

exports.agregarAComparacion = async (req, res) => {
  try {
    if (!req.user) {
    return res.status(200).json({ favoritos: [], msg: "Usuario no logueado" });
  }

    const usuarioId = req.user.id;
    const { propiedadId, tipoPropiedad } = req.body;

    let comparacion = await Comparar.findOne({ usuario: usuarioId });

    if (!comparacion) {
      comparacion = new Comparar({
        usuario: usuarioId,
        propiedades: [propiedadId],
        fechaActualizado: new Date()
      });
      await comparacion.save();

      return res.status(201).json({
        msg: 'Agregado a comparación.',
        cantidadTipo: 1,
        advertencia: 'Para comparar necesitas agregar al menos otra propiedad del mismo tipo.'
      });
    }

    const propiedadesExistentes = await Comparar.findOne({ usuario: usuarioId }).populate('propiedades');

    const propiedadesDelMismoTipo = propiedadesExistentes.propiedades.filter(
      (p) => p.tipoPropiedad === tipoPropiedad
    );

    if (propiedadesDelMismoTipo.length >= 3) {
      return res.status(400).json({
        msg: `Ya tienes 3 propiedades del tipo "${tipoPropiedad}" en comparación.`,
      });
    }

    if (!comparacion.propiedades.includes(propiedadId)) {
      comparacion.propiedades.push(propiedadId);
    }

    comparacion.fechaActualizado = new Date();
    await comparacion.save();

    const nuevasPropiedades = await Comparar.findOne({ usuario: usuarioId }).populate('propiedades');
    const nuevasDelMismoTipo = nuevasPropiedades.propiedades.filter(
      (p) => p.tipoPropiedad === tipoPropiedad
    );

    const cantidadTipo = nuevasDelMismoTipo.length;

    const response = {
      msg: 'Agregado a comparación.',
      cantidadTipo,
    };

    if (cantidadTipo === 1) {
      response.advertencia = 'Para comparar necesitas agregar al menos otra propiedad del mismo tipo.';
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Error al agregar a comparación:', err);
    res.status(500).json({ msg: 'Error al agregar a comparación.' });
  }
};


exports.eliminarDeComparacion = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { propiedadId } = req.params;

    const comparacion = await Comparar.findOneAndUpdate(
      { usuario: usuarioId },
      { $pull: { propiedades: propiedadId }, $set: { fechaActualizado: new Date() } },
      { new: true }
    );

    if (!comparacion) {
      return res.status(404).json({ msg: 'No hay comparación activa para este usuario.' });
    }

    res.status(200).json({ msg: 'Propiedad eliminada de la comparación.' });
  } catch (err) {
    console.error('Error al eliminar de comparación:', err);
    res.status(500).json({ msg: 'Error al eliminar de comparación.' });
  }
};

exports.obtenerComparaciones = async (req, res) => {
  try {
    // ✅ Usuario NO logueado
    if (!req.user?.id) {
      return res.status(200).json({ propiedades: [] });
    }

    const usuarioId = req.user.id;

    const comparacion = await Comparar.findOne({ usuario: usuarioId })
      .populate({
        path: 'propiedades',
        populate: [
          { path: 'agente', select: 'nombre apellidos' },
          { path: 'inmobiliaria', select: 'nombre' }
        ]
      });

    if (!comparacion) {
      return res.status(200).json({ propiedades: [] });
    }

    const agrupadas = {};

    comparacion.propiedades.forEach(prop => {
      const tipo = prop.tipoPropiedad;
      if (!agrupadas[tipo]) agrupadas[tipo] = [];
      if (agrupadas[tipo].length < 3) agrupadas[tipo].push(prop);
    });

    res.status(200).json(agrupadas);
  } catch (err) {
    console.error('Error al obtener comparaciones:', err);
    res.status(500).json({ msg: 'Error al obtener comparaciones.' });
  }
};

