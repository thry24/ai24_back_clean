const Wishlist = require("../models/Wishlist");
const Propiedad = require("../models/Propiedad");
const Seguimiento = require("../models/Seguimiento");
const Usuario = require("../models/User"); // asegúrate de importar el modelo

exports.obtenerFavoritosClientePorAgente = async (req, res) => {
  try {
    const { clienteEmail } = req.params;
    const agenteEmail = req.user.email; // del token

    // 1️⃣ Verificar relación agente-cliente
    const tieneRelacion = await Seguimiento.findOne({ clienteEmail, agenteEmail });
    if (!tieneRelacion) {
      return res.status(403).json({ msg: "No tienes acceso a este cliente" });
    }

    // 2️⃣ Buscar usuario (cliente)
    const usuario = await Usuario.findOne({ correo: clienteEmail });
    if (!usuario) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    // 3️⃣ Buscar favoritos con populate completo
    const favoritos = await Wishlist.find({ usuario: usuario._id })
      .populate({
        path: "propiedad",
        select: `
          clave
          tituloPropiedad
          tipoPropiedad
          tipoOperacion
          precio
          imagenPrincipal
          imagenes
          direccion
          estadoPropiedad
        `
      })
      .lean();

    // 4️⃣ Mapear propiedades para frontend
    const propiedades = favoritos.map(f => {
      const p = f.propiedad;
      return {
        id: p?._id,
        clave: p?.clave,
        tituloPropiedad: p?.tituloPropiedad,
        tipoOperacion: p?.tipoOperacion,
        tipoPropiedad: p?.tipoPropiedad,
        precio: p?.precio,
        propiedadImagen: p?.imagenPrincipal || (p?.imagenes?.length ? p.imagenes[0] : null),
        direccion: p?.direccion || {},
        estado: p?.estadoPropiedad
      };
    });

    res.json(propiedades);
  } catch (err) {
    console.error("Error favoritos cliente:", err);
    res.status(500).json({ msg: "Error obteniendo favoritos de cliente" });
  }
};


exports.agregarAFavoritos = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { propiedadId } = req.body;

    const nuevo = new Wishlist({ usuario: usuarioId, propiedad: propiedadId });
    await nuevo.save();

    res.status(201).json({ msg: 'Agregado a favoritos.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'La propiedad ya está en tu lista de favoritos.' });
    }
    console.error('Error al agregar a favoritos:', err);
    res.status(500).json({ msg: 'Error al agregar a favoritos.' });
  }
};

exports.eliminarDeFavoritos = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { propiedadId } = req.params;

    const eliminado = await Wishlist.findOneAndDelete({ usuario: usuarioId, propiedad: propiedadId });

    if (!eliminado) {
      return res.status(404).json({ msg: 'La propiedad no estaba en tu lista de favoritos.' });
    }

    res.status(200).json({ msg: 'Eliminado de favoritos.' });
  } catch (err) {
    console.error('Error al eliminar de favoritos:', err);
    res.status(500).json({ msg: 'Error al eliminar de favoritos.' });
  }
};

exports.obtenerFavoritos = async (req, res) => {
  try {
    if (!req.user) {
    return res.status(200).json({ favoritos: [], msg: "Usuario no logueado" });
  }
  
    const usuarioId = req.user.id;

    const favoritos = await Wishlist.find({ usuario: usuarioId })
      .populate({
        path: 'propiedad',
        populate: [
          { path: 'agente', select: 'nombre apellidos' },
          { path: 'inmobiliaria', select: 'nombre' }
        ]
      })
      .sort({ fechaAgregado: -1 });

    res.status(200).json(favoritos.map(f => f.propiedad));
  } catch (err) {
    console.error('Error al obtener favoritos:', err);
    res.status(500).json({ msg: 'Error al obtener favoritos.' });
  }
};
// controller
exports.obtenerFavoritosClienteLogueado = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const favoritos = await Wishlist.find({ usuario: usuarioId })
      .populate({
        path: "propiedad",
        select: `
          clave
          tituloPropiedad
          tipoPropiedad
          tipoOperacion
          precio
          imagenPrincipal
          imagenes
          direccion
          estadoPropiedad
        `
      })
      .lean();

    res.json(
      favoritos.map(f => ({
        id: f.propiedad?._id,
        clave: f.propiedad?.clave,
        tituloPropiedad: f.propiedad?.tituloPropiedad,
        tipoOperacion: f.propiedad?.tipoOperacion,
        tipoPropiedad: f.propiedad?.tipoPropiedad,
        precio: f.propiedad?.precio,
        imagen: f.propiedad?.imagenPrincipal,
        direccion: f.propiedad?.direccion
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error obteniendo favoritos" });
  }
};
