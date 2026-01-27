const Propiedad = require("../models/Propiedad");
const User = require("../models/User"); 
const MensajeAgente = require('../models/MensajesAgente');
const Seguimiento = require("../models/Seguimiento");
const Busqueda = require("../models/Busqueda");
const Notificacion = require('../models/Notificacion');
const Colaboracion = require('../models/Colaboracion');
const { crearNotificacion } = require('../utils/notificaciones');
const { enviarSolicitudColaboracion, enviarCorreoContactoAgente } = require('../utils/mailer');
const Lead = require('../models/Lead');
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { crearSeguimientoSiNoExiste } = require('./seguimientos.helper');

const { Storage } = require("@google-cloud/storage");
const PdfPrinter = require("pdfmake");
const {
  subirAGoogleStorage,
  eliminarDeGoogleStorage,
} = require("../utils/uploadToGCS");
const sendPropertyPdfEmail = require('../utils/sendPropertyPdfEmail');
const Mensaje = require('../models/Mensaje');
const { hashParticipants } = require('../utils/chatHash')

const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);
/** ================================
 *  OBTENER PROPIEDADES DE UNA INMOBILIARIA
 *  GET /propiedades/inmobiliaria/:id
 * ================================ **/
exports.obtenerPropiedadesDeInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params; // ID de la inmobiliaria

    if (!id) {
      return res.status(400).json({ msg: "Falta el ID de la inmobiliaria" });
    }

    // 1️⃣ Buscar agentes que pertenecen a esa inmobiliaria
    const agentes = await User.find({ inmobiliaria: id }).select("_id nombre fotoPerfil");

    if (!agentes.length) {
      return res.json([]); // Si no hay agentes, no hay propiedades
    }

    const agentesIds = agentes.map(a => a._id);

    // 2️⃣ Buscar propiedades de esos agentes
    const propiedades = await Propiedad.find({
      agente: { $in: agentesIds }
    })
    .populate("agente", "nombre fotoPerfil correo email")
    .lean();

    // 3️⃣ Preparar respuesta limpia
    const resultado = propiedades.map(p => ({
      _id: p._id,
      titulo: p.titulo || p.clave || "Propiedad sin título",
      tipoOperacion: p.tipoOperacion || "",
      tipoPropiedad: p.tipoPropiedad || "",
      estado: p.estado || "",
      descripcion: p.descripcion || "",
      habitaciones: p.recamaras || p.habitaciones || 0,
      banos: p.banos || 0,
      estacionamientos: p.estacionamientos || 0,
      m2Construccion: p.m2Construccion || 0,
      superficie: p.superficie || 0,
      precio: p.precio || 0,
      imagenes: p.imagenes || [],
      imagenPrincipal: p.imagenPrincipal || (p.imagenes?.[0] ?? ""),

      agente: {
        id: p.agente?._id || null,
        nombre: p.agente?.nombre || "Agente desconocido",
        foto: p.agente?.fotoPerfil || "",
        correo: p.agente?.correo || p.agente?.email || ""
      }
    }));

    res.json(resultado);

  } catch (err) {
    console.error("Error al obtener propiedades de la inmobiliaria:", err);
    res.status(500).json({ msg: "Error obteniendo propiedades de la inmobiliaria" });
  }
};
exports.listadoPropiedadesInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params; // ID de la inmobiliaria

    if (!id) {
      return res.status(400).json({ msg: "Falta el ID de la inmobiliaria" });
    }

    const agentes = await User.find({ inmobiliaria: id })
      .select("_id nombre fotoPerfil correo email");

    if (!agentes.length) return res.json([]);

    const agentesIds = agentes.map(a => a._id);

    const propiedades = await Propiedad.find({
      agente: { $in: agentesIds }
    })
    .populate("agente", "nombre fotoPerfil correo email")
    .lean();

    const resultado = propiedades.map(p => ({
      _id: p._id,
      titulo: p.titulo || p.clave || "Propiedad",
      tipoOperacion: p.tipoOperacion || "",
      tipoPropiedad: p.tipoPropiedad || "",
      descripcion: p.descripcion || "",
      precio: p.precio || 0,
      estado: p.estado || "",
      habitaciones: p.recamaras || p.habitaciones || 0,
      banos: p.banos || 0,
      estacionamientos: p.estacionamientos || 0,
      sqft: p.superficie || p.m2Construccion || 0,

      // 🔥🔥 IMAGEN CORRECTA
      imagen:
        p.imagenPrincipal ||
        (Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes[0] : ""),

      agente: {
        id: p.agente?._id || null,
        nombre: p.agente?.nombre || "Agente desconocido",
        foto: p.agente?.fotoPerfil || "",
        correo: p.agente?.correo || p.agente?.email || "",
      }
    }));

    res.json(resultado);

  } catch (err) {
    console.error("Error listado propiedades inmobiliaria:", err);
    res.status(500).json({ msg: "Error listando propiedades" });
  }
};


exports.generarFichaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const propiedad = await Propiedad.findById(id)
      .populate("agente", "-password")
      .populate("inmobiliaria");

    if (!propiedad) {
      return res.status(404).json({ msg: "Propiedad no encontrada." });
    }

    const getImageBase64 = async (url) => {
      try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        return `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;
      } catch (error) {
        console.warn("Error al convertir imagen:", url);
        return null;
      }
    };

    const logo = await getImageBase64(propiedad.agente?.fotoPerfil || propiedad.agente?.logo);
    const imagenPrincipal = await getImageBase64(propiedad.imagenPrincipal);

    const docDefinition = {
      content: [
        { text: `Ficha de la propiedad: ${propiedad.clave}`, style: "header" },
        { text: `Agente: ${propiedad.agente?.nombre || "N/A"}`, margin: [0, 0, 0, 10] },
        {
          columns: [
            logo ? { image: logo, width: 80 } : {},
            imagenPrincipal ? { image: imagenPrincipal, width: 250 } : {},
          ],
        },
        { text: `Descripción: ${propiedad.descripcion || "N/A"}`, margin: [0, 10] },
        { text: `Precio: $${(propiedad.precio || 0).toLocaleString("es-MX")}`, bold: true },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      },
    };

    const pdfBuffer = await new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];

      pdfDoc.on("data", (chunk) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });

    const storage = new Storage();
    const nombreArchivo = `fichas/ficha-${propiedad.clave || propiedad._id}.pdf`;
    const file = storage.bucket("ai24").file(nombreArchivo);

    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      public: true,
    });

    const urlPublica = `https://storage.googleapis.com/ai24/${nombreArchivo}`;
    res.status(200).json({ msg: "PDF generado con éxito", url: urlPublica });
  } catch (err) {
    console.error("Error al generar el PDF:", err);
    res.status(500).json({ msg: "Error al generar la ficha PDF." });
  }
};

function obtenerNombreAsesor({ propiedad, usuario }) {
  if (propiedad?.agente?.nombre) {
    return `${propiedad.agente.nombre} ${propiedad.agente.apellido || ''}`.trim();
  }

  if (usuario?.nombre) {
    return `${usuario.nombre} ${usuario.apellido || ''}`.trim();
  }

  return 'Tu asesor';
}


exports.agregarPropiedad = async (req, res) => {
  try {
    // 1️⃣ Parseo de datos
    const parsedData = JSON.parse(req.body.datos);
    console.log('📥 Datos recibidos:', parsedData);

    const {
      tipoOperacion,
      tipoPropiedad,
      descripcion,
      direccion,
      estadoPropiedad,
      comision,
      datosPropietario,
      caracteristicas,
      generales,
      servicios,
      amenidades,
      inmobiliaria,
      precio,
      precioRenta
    } = parsedData;

    // 2️⃣ Regla de negocio: precioRenta solo aplica en venta/renta
    const precioRentaFinal =
      tipoOperacion === "venta/renta" ? precioRenta : null;

    // 3️⃣ 🔥 LIMPIEZA OBLIGATORIA CASA / DEPARTAMENTO (ANTES DE CREAR EL DOCUMENTO)
    if (caracteristicas?.casaDepto) {

      if (tipoPropiedad === "casa") {
        console.log('🧹 Limpieza: eliminando departamento (es CASA)');
        delete caracteristicas.casaDepto.departamento;
      }

      if (tipoPropiedad === "departamento") {
        console.log('🧹 Limpieza: eliminando casa (es DEPARTAMENTO)');
        delete caracteristicas.casaDepto.casa;
      }
    }

    // 🔍 LOG FINAL PARA CONFIRMAR (MUY IMPORTANTE)
    console.log(
      '🧪 casaDepto FINAL:',
      JSON.stringify(caracteristicas?.casaDepto, null, 2)
    );

    // 4️⃣ Creación del documento (DESPUÉS de limpiar)
    const propiedad = new Propiedad({
      tipoOperacion,
      tipoPropiedad,
      precio,
      precioRenta: precioRentaFinal,
      descripcion,
      direccion,
      estadoPropiedad,
      comision,
      datosPropietario,
      caracteristicas,
      generales,
      servicios,
      amenidades,
      agente: req.user.id,
      inmobiliaria: inmobiliaria || null,
    });

    // 5️⃣ Archivos adjuntos
    if (req.files?.archivos) {
      const docs = [];
      for (const archivo of req.files.archivos) {
        const subida = await subirAGoogleStorage(archivo.path, "ai24/archivos");
        fs.unlinkSync(archivo.path);
        docs.push({
          nombre: archivo.originalname,
          tipo: getTipoArchivo(archivo.originalname),
          url: subida.url,
        });
      }
      propiedad.archivos = docs;
    }

    // 6️⃣ Imagen principal
    if (req.files?.imagenPrincipal?.[0]) {
      const subida = await subirAGoogleStorage(
        req.files.imagenPrincipal[0].path,
        "ai24/propiedades"
      );
      fs.unlinkSync(req.files.imagenPrincipal[0].path);
      propiedad.imagenPrincipal = subida.url;
    }

    // 7️⃣ Imágenes secundarias
    if (req.files?.imagenes) {
      const imgs = [];
      for (const img of req.files.imagenes) {
        const subida = await subirAGoogleStorage(img.path, "ai24/propiedades");
        fs.unlinkSync(img.path);
        imgs.push(subida.url);
      }
      propiedad.imagenes = imgs;
    }

    // 8️⃣ Estado inicial
    propiedad.estadoPublicacion = "no publicada";

    // 9️⃣ Clave automática
    propiedad.clave = await generarClave(direccion);

    // 🔟 Guardado final
    await propiedad.save();

    res.status(201).json({
      msg: "Propiedad registrada con éxito.",
      propiedad
    });

  } catch (error) {
    console.error("❌ Error al registrar propiedad:", error);
    res.status(500).json({
      msg: "Error interno al registrar la propiedad."
    });
  }
};


async function generarClave(direccion) {
  // 3 letras del estado (o usa municipio si prefieres)
  const lugar =
    direccion?.estado?.substring(0, 3).toUpperCase() || "XXX";

  // Prefijo nuevo
  const baseClave = `thry24-${lugar}`;

  let claveUnica;
  let intentos = 0;

  do {
    const sufijo = generarSufijoAleatorio(4); // Ej: A9X2
    claveUnica = `${baseClave}-${sufijo}`;
    intentos++;
    if (intentos > 10) break;
  } while (await Propiedad.exists({ clave: claveUnica }));

  return claveUnica;
}


function generarSufijoAleatorio(longitud = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return resultado;
}

function mapTipo(tipo) {
  if (["casa", "departamento"].includes(tipo)) return "casaDepto";
  return tipo;
}

function getTipoArchivo(nombre) {
  const ext = nombre.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "kmz") return "kmz";
  return "otro";
}

exports.obtenerPropiedades = async (req, res) => {
  try {
    const {
      tipoOperacion,
      tipoPropiedad,
      estado,
      estadoPropiedad,
      keyword,
      precioMin,
      precioMax,
      caracteristicas,
       latitud,
  longitud,
  radio,
    } = req.query;

    const filtros = {
      estadoPublicacion: "publicada",
    };

    if (tipoOperacion) {
      const operaciones = tipoOperacion.split(",").map((op) => op.trim());
      filtros.tipoOperacion = { $in: operaciones };
    }

    if (tipoPropiedad) {
      const tipos = tipoPropiedad.split(",").map((t) => t.trim());
      filtros.tipoPropiedad = { $in: tipos };
    }

    if (estado) {
      filtros["direccion.estado"] = estado;
    }

    if (estadoPropiedad) {
      filtros.estadoPropiedad = estadoPropiedad;
    }

    if (precioMin || precioMax) {
      filtros.precio = {};

      if (precioMin) {
        const limpioMin = parseFloat(
          precioMin.toString().replace(/[^0-9.]/g, "")
        );
        if (!isNaN(limpioMin)) filtros.precio.$gte = limpioMin;
      }

      if (precioMax) {
        const limpioMax = parseFloat(
          precioMax.toString().replace(/[^0-9.]/g, "")
        );
        if (!isNaN(limpioMax)) filtros.precio.$lte = limpioMax;
      }

      if (Object.keys(filtros.precio).length === 0) {
        delete filtros.precio;
      }
    }

    if (keyword) {
      filtros.keywords = { $regex: keyword, $options: "i" };
    }
   //Filtro por ubicación / zona / colonia / municipio / estado
    if (req.query.zona && req.query.zona.trim() !== "") {
      const zonaRegex = new RegExp(req.query.zona, "i");

      filtros.$or = [
        { "direccion.zona": zonaRegex },
        { "direccion.colonia": zonaRegex },
        { "direccion.municipio": zonaRegex },
        { "direccion.estado": zonaRegex },
        { "direccion.calle": zonaRegex },
      ];
    }

    if (caracteristicas) {
      try {
        const todas = JSON.parse(caracteristicas);

        for (const tipo in todas) {
          const valores = todas[tipo];
          if (!valores || typeof valores !== "object") continue;

          for (const campo in valores) {
            const valor = valores[campo];
            if (
              valor !== null &&
              valor !== "" &&
              valor !== false &&
              valor !== undefined
            ) {
              const key = `caracteristicas.${tipo}.${campo}`;
              filtros[key] = valor;
            }
          }
        }
      } catch (e) {
        console.warn("Características mal formateadas:", e);
      }
    }

    let propiedades = await Propiedad.find(filtros)
      .populate("agente")
      .populate("inmobiliaria", "nombre");


      if (latitud && longitud && radio) {
      const centroLat = parseFloat(latitud);
      const centroLng = parseFloat(longitud);
      const rango = parseFloat(radio);

      propiedades = propiedades.filter((prop) => {
        const lat = prop.direccion?.lat;
        const lng = prop.direccion?.lng;
        if (lat == null || lng == null) return false;

        const distancia = calcularDistancia(centroLat, centroLng, lat, lng);
        return distancia <= rango;
      });
    }

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};
// 🔹 Obtener propiedades por correo del agente
exports.obtenerPropiedadesPorAgenteEmail = async (req, res) => {
  try {
    const { agenteEmail } = req.query;
    if (!agenteEmail) {
      return res.status(400).json({ message: "El parámetro agenteEmail es obligatorio" });
    }

    const user = await User.findOne({ correo: agenteEmail.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Agente no encontrado" });
    }

    const propiedades = await Propiedad.find({
      agente: user._id,
      estadoPublicacion: "publicada",
    })
      .populate("agente", "nombre correo")
      .populate("inmobiliaria", "nombre");

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("❌ Error al obtener propiedades por agente:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; 
}

exports.obtenerPropiedadPorId = async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id)
      .populate("agente", "-password")
      .populate("inmobiliaria", "-password");

    if (!propiedad) {
      return res.status(404).json({ msg: "Propiedad no encontrada." });
    }

    res.status(200).json(propiedad);
  } catch (error) {
    console.error("Error al buscar propiedad:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.obtenerPropiedadesDeAgente = async (req, res) => {
  try {
    const { id } = req.params;

    const propiedades = await Propiedad.find({ agente: id })
      .populate("agente", "nombre apellidos correo")
      .populate("inmobiliaria", "nombre correo")
      .sort({ fechaCreacion: -1 });

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades del agente:", error);
    res.status(500).json({ msg: "Error al obtener propiedades del agente." });
  }
};

exports.obtenerPropiedadesDeInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params;

    const propiedades = await Propiedad.find({ inmobiliaria: id })
      .populate("agente", "nombre apellidos correo")
      .populate("inmobiliaria", "nombre correo")
      .sort({ fechaCreacion: -1 });

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades de la inmobiliaria:", error);
    res
      .status(500)
      .json({ msg: "Error al obtener propiedades de la inmobiliaria." });
  }
};

exports.obtenerPropiedadesAgente = async (req, res) => {
  try {
    const propiedades = await Propiedad.find({ agente: req.user.id }).sort({
      fechaCreacion: -1,
    });

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades del agente:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.obtenerPropiedadesInmobiliaria = async (req, res) => {
  try {
    const propiedades = await Propiedad.find({
      inmobiliaria: req.user.id,
    }).sort({ fechaCreacion: -1 });

    res.status(200).json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades de la inmobiliaria:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.actualizarPropiedad = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;
    const body = req.body;

    const propiedad = await Propiedad.findById(id);
    if (!propiedad)
      return res.status(404).json({ msg: "Propiedad no encontrada." });

    if (
      (usuario.rol === "agente" &&
        propiedad.agente?.toString() !== usuario.id) ||
      (usuario.rol === "inmobiliaria" &&
        propiedad.inmobiliaria?.toString() !== usuario.id)
    ) {
      return res.status(403).json({
        msg: "No tienes permiso para modificar esta propiedad.",
      });
    }

    if (body.imagenesExistentes) {
      propiedad.imagenes = JSON.parse(body.imagenesExistentes);
    }

    if (req.files?.imagenPrincipal?.[0]) {
      const subida = await subirAGoogleStorage(
        req.files.imagenPrincipal[0].path,
        "ai24/propiedades"
      );
      fs.unlinkSync(req.files.imagenPrincipal[0].path);
      propiedad.imagenPrincipal = subida.url;
    }

    if (req.files?.imagenes) {
      for (const file of req.files.imagenes) {
        const subida = await subirAGoogleStorage(file.path, "ai24/propiedades");
        propiedad.imagenes.push(subida.url);
        fs.unlinkSync(file.path);
      }
    }

    propiedad.imagenes = [...new Set(propiedad.imagenes)];

    if (body.archivosExistentes) {
      propiedad.archivos = JSON.parse(body.archivosExistentes);
    }

    if (req.files?.archivos) {
      for (const archivo of req.files.archivos) {
        const subida = await subirAGoogleStorage(archivo.path, "ai24/archivos");
        propiedad.archivos.push({
          nombre: archivo.originalname,
          tipo: getTipoArchivo(archivo.originalname),
          url: subida.url,
        });
        fs.unlinkSync(archivo.path);
      }
    }

    if (body.datos) {
      const datos = JSON.parse(body.datos);
      for (const key in datos) {
        propiedad[key] = datos[key];
      }
    }

    await propiedad.save();

    res.status(200).json({
      msg: "Propiedad actualizada correctamente.",
      propiedad,
    });
  } catch (err) {
    console.error("Error al actualizar propiedad:", err);
    res.status(500).json({ msg: "Error al actualizar la propiedad." });
  }
};

exports.eliminarPropiedad = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    const propiedad = await Propiedad.findById(id);
    if (!propiedad)
      return res.status(404).json({ msg: "Propiedad no encontrada." });

    if (
      (usuario.rol === "agente" &&
        propiedad.agente?.toString() !== usuario.id) ||
      (usuario.rol === "inmobiliaria" &&
        propiedad.inmobiliaria?.toString() !== usuario.id)
    ) {
      return res
        .status(403)
        .json({ msg: "No tienes permisos para eliminar esta propiedad." });
    }

    await propiedad.deleteOne();
    res.status(200).json({ msg: "Propiedad eliminada correctamente." });
  } catch (err) {
    console.error("Error al eliminar propiedad:", err);
    res.status(500).json({ msg: "Error interno al eliminar la propiedad." });
  }
};

exports.publicarPropiedad = async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBase64 } = req.body || {};

    const propiedad = await Propiedad.findById(id);
    if (!propiedad) {
      return res.status(404).json({ msg: "Propiedad no encontrada." });
    }

    const estabaPublicada = propiedad.estadoPublicacion === "publicada";

    if (!estabaPublicada) {
      if (
        !propiedad.imagenPrincipal ||
        !propiedad.imagenes ||
        propiedad.imagenes.length === 0
      ) {
        return res.status(400).json({
          msg:
            "Para publicar esta propiedad debes agregar al menos una imagen principal y otras imágenes.",
        });
      }
      propiedad.estadoPublicacion = "publicada";
    } else {
      propiedad.estadoPublicacion = "no publicada";
    }

    await propiedad.save();

    // ✅ RESPONDER AL FRONTEND PRIMERO
    res.status(200).json({
      msg: `Propiedad ${
        propiedad.estadoPublicacion === "publicada"
          ? "publicada"
          : "marcada como no publicada"
      } exitosamente.`,
      propiedad,
    });

    // 📧 ENVIAR CORREO EN SEGUNDO PLANO
    if (!estabaPublicada && propiedad.estadoPublicacion === "publicada") {
      const propietarioEmail = propiedad?.datosPropietario?.email;
      const usuarioActivoEmail = req?.user?.email || req?.user?.correo;

      const correos = [propietarioEmail, usuarioActivoEmail].filter(Boolean);

      if (correos.length >= 2) {
        sendPropertyPdfEmail({
          toList: correos,
          pdfBase64,
        }).catch(err => {
          console.error("❌ Error enviando correo de publicación:", err);
        });
      } else {
        console.warn("⚠️ Correos insuficientes para envío:", correos);
      }
    }

  } catch (err) {
    console.error("Error al cambiar estado de publicación:", err);
    res
      .status(500)
      .json({ msg: "Error interno al actualizar la publicación." });
  }
};


exports.actualizarEstadoPropiedad = async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoPropiedad } = req.body;

    const estadosValidos = [
      "activa",
      "con propuesta",
      "desactivada",
      "rentada",
      "con inquilino",
      "oportunidad",
      "remate bancario",
    ];

    if (!estadosValidos.includes(estadoPropiedad)) {
      return res.status(400).json({ msg: "Estado de propiedad inválido." });
    }

    const propiedad = await Propiedad.findByIdAndUpdate(
      id,
      { estadoPropiedad },
      { new: true }
    );

    if (!propiedad) {
      return res.status(404).json({ msg: "Propiedad no encontrada." });
    }

    res
      .status(200)
      .json({ msg: "Estado actualizado correctamente.", propiedad });
  } catch (err) {
    console.error("Error al actualizar estado de propiedad:", err);
    res.status(500).json({ msg: "Error interno al actualizar el estado." });
  }
};
//método para la zona de mayor demanda a KPIS
exports.registrarBusqueda = async (req, res) => {
  try {
    await Busqueda.create({
      keyword: req.body.keyword,
      tipoOperacion: req.body.tipoOperacion,
      estado: req.body.estado,
      zona: req.body.zona,
      usuario: req.user?._id,
      inmobiliaria: req.user?.inmobiliaria
    });

    res.json({ msg: "OK" });
  } catch (err) {
    console.error("Error al registrar búsqueda:", err);
    res.status(500).json({ msg: "Error al registrar búsqueda" });
  }
};

exports.verificarCoordenadas = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng)
    return res.status(400).json({ msg: "Coordenadas faltantes." });

  const coincidencias = await Propiedad.countDocuments({
    "direccion.lat": parseFloat(lat),
    "direccion.lng": parseFloat(lng),
  });

  res.json({ coincidencias });
};

exports.incrementarVisita = async (req, res) => {
  try {
    const { id } = req.params;
    const propiedad = await Propiedad.findByIdAndUpdate(
      id,
      { $inc: { visitas: 1 } },
      { new: true }
    );
    if (!propiedad) return res.status(404).json({ msg: "Propiedad no encontrada" });
    res.json({ msg: "Visita registrada", visitas: propiedad.visitas });
  } catch (err) {
    console.error("Error al registrar visita:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};

exports.incrementarContacto = async (req, res) => {
  try {
    const { id: propiedadId } = req.params;

    // ===========================
    // 🔐 Usuario desde token
    // ===========================
    const user = req.user || {};
    const rol = (user.rol || 'cliente').toLowerCase(); // cliente | agente

    const {
      citaNombre,
      citaEmail,
      citaTelefono,
      citaMensaje,
    } = req.body || {};

    const emailContacto = (
      user.email ||
      user.correo ||
      citaEmail
    )?.toLowerCase().trim();

    if (!emailContacto) {
      return res.status(400).json({ msg: 'Email requerido' });
    }

    // ===========================
    // 🏠 Propiedad
    // ===========================
    const propiedad = await Propiedad.findById(propiedadId)
      .populate('agente', 'nombre correo email')
      .lean();

    if (!propiedad) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    const agenteEmail = (
      propiedad.agente?.email ||
      propiedad.agente?.correo
    )?.toLowerCase();

    // ===========================
    // 📊 Contador general
    // ===========================
    await Propiedad.findByIdAndUpdate(propiedadId, {
      $inc: { contactosGenerados: 1 },
    });

    // ===========================
    // 👤 Usuario real si existe
    // ===========================
    const clienteUser = await User.findOne({
      $or: [{ email: emailContacto }, { correo: emailContacto }],
    }).lean();

    const nombreFinal =
      citaNombre ||
      clienteUser?.nombre ||
      'Contacto';

    const telefonoFinal =
      clienteUser?.telefono ||
      citaTelefono ||
      null;

    const tipoClienteFinal =
      clienteUser?.tipoCliente ||
      clienteUser?.rol ||
      rol;

    // =========================================================
    // 🧑‍💼 CASO 1: CONTACTA UN AGENTE → MensajeAgente
    // =========================================================
    if (rol === 'agente') {
      await MensajeAgente.create({
        nombreAgente: propiedad.agente?.nombre,
        emailAgente: agenteEmail,
        nombreCliente: nombreFinal,
        emailCliente: emailContacto,
        telefonoCliente: telefonoFinal,
        texto: citaMensaje || 'Un agente está interesado en colaborar',
        idPropiedad: propiedad._id,
        imagenPropiedad: propiedad.imagenPrincipal,
        tipoOperacion: propiedad.tipoOperacion,
        ubicacion: `${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`,
        remitenteId: user._id,
      });

      await Colaboracion.findOneAndUpdate(
        {
          propiedad: propiedad._id,
          agenteEmail,
          colaboradorEmail: emailContacto,
        },
        {
          agentePrincipal: propiedad.agente?._id,
          colaborador: user._id,
          tipoColaboracion: 'externo',
          nombreColaborador: user.nombre,
          colaboradorEmail: emailContacto,
          agenteEmail,
          nombreAgente: propiedad.agente?.nombre,
          propiedad: propiedad._id,
          nombrePropiedad: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal,
          tipoOperacion: propiedad.tipoOperacion.toUpperCase(),
          estado: 'pendiente',
        },
        { upsert: true, new: true }
      );

      try {
        await enviarSolicitudColaboracion({
          to: agenteEmail,
          agenteNombre: user.nombre,
          propiedadClave: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal,
        });
      } catch (e) {
        console.error('❌ Error enviando correo de colaboración', e);
      }

      await Notificacion.create({
        usuarioEmail: agenteEmail,
        mensaje: `Un agente quiere colaborar contigo por la propiedad ${propiedad.clave}`,
        tipo: 'contacto',
        referenciaId: propiedad._id,
      });

      return res.json({ ok: true, tipo: 'AGENTE' });
    }

    // =========================================================
    // 👤 CASO 2: CONTACTA UN CLIENTE → Mensaje
    // =========================================================

    // 🔥 Lead (NO duplicar)
    let lead = await Lead.findOne({
      clienteEmail: emailContacto,
      agenteEmail,
      propiedadId: propiedad._id,
    });

    if (!lead) {
      lead = await Lead.create({
        propiedadId: propiedad._id,
        agenteEmail,
        nombre: nombreFinal,
        email: emailContacto,
        telefono: telefonoFinal,
        rol: clienteUser?.rol || 'cliente',
        tipoCliente: tipoClienteFinal,
        mensaje: citaMensaje || 'Interesado en la propiedad',
        tipoOperacion: propiedad.tipoOperacion,
        ubicacion: `${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`,
        origen: 'propiedad',
        estatus: 'nuevo',
      });
    }

    // 💬 MENSAJE CLIENTE → AGENTE (CHAT REAL)
    await Mensaje.create({
      emisorEmail: emailContacto,     // cliente
      receptorEmail: agenteEmail,     // agente

      mensaje: citaMensaje || 'Estoy interesado en esta propiedad',
      nombreCliente: nombreFinal,

      propiedadId: propiedad._id,
      propiedadClave: propiedad.clave,

      propiedadSnapshot: {
        id: propiedad._id,
        clave: propiedad.clave,
        imagen: propiedad.imagenPrincipal,
        precio: propiedad.precio,
        tipoOperacion: propiedad.tipoOperacion,
        ubicacion: `${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`,
      },
    });

    // 📧 ENVIAR CORREO AL AGENTE
    try {
      await enviarCorreoContactoAgente({
        to: agenteEmail,
        agenteNombre: propiedad.agente?.nombre || 'Agente',
        clienteNombre: nombreFinal,
        tipoCliente: tipoClienteFinal,
        propiedadClave: propiedad.clave,
        imagenPropiedad: propiedad.imagenPrincipal,
        mensaje: citaMensaje || 'Estoy interesado en esta propiedad',
      });
    } catch (e) {
      console.error('❌ Error enviando correo al agente', e);
    }

    await Notificacion.create({
      usuarioEmail: agenteEmail,
      mensaje: `Un cliente te ha contactado por la propiedad ${propiedad.clave}`,
      tipo: 'contacto',
      referenciaId: propiedad._id,
    });

    const seguimiento = await crearSeguimientoSiNoExiste({
      clienteEmail: emailContacto,
      clienteNombre: nombreFinal,
      agenteEmail,
      tipoCliente: tipoClienteFinal,
      tipoOperacion: propiedad.tipoOperacion,
      propiedadId: propiedad._id,
      origen: 'Directo',
    });

    return res.json({
      ok: true,
      tipo: 'CLIENTE',
      lead,
      seguimiento,
    });

  } catch (err) {
    console.error('❌ incrementarContacto', err);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// =============================================
// 🔥 OBTENER PROPIEDADES POR INMOBILIARIA (POR AGENTES)
// =============================================
exports.obtenerPropiedadesDeInmobiliariaXAgente= async (req, res) => {
  try {
    const inmobiliariaId = req.params.id;

    // 1️⃣ Buscar agentes que pertenecen a esa inmobiliaria
    const agentes = await User.find({
      inmobiliaria: inmobiliariaId,
      rol: "agente"
    }).select("_id nombre correo");

    const agentesIds = agentes.map(a => a._id);

    // 2️⃣ Buscar las propiedades cuyo campo `agente` esté en los agentes
    const propiedades = await Propiedad.find({
      agente: { $in: agentesIds }
    })
      .populate("agente", "nombre correo telefono fotoPerfil")
      .populate("inmobiliaria", "nombre correo logo");

    return res.status(200).json({
      ok: true,
      totalAgentes: agentes.length,
      totalPropiedades: propiedades.length,
      propiedades
    });

  } catch (error) {
    console.error("Error al obtener propiedades:", error);
    res.status(500).json({ ok: false, error: "Error al obtener propiedades" });
  }

  
};