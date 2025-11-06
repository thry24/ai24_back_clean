const Formulario = require('../models/FormularioCompraRenta');
const nodemailer = require('nodemailer');
const { Parser } = require('json2csv');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.enviarFormulario = async (req, res) => {
  try {
    const datos = {
  ...req.body,
  tipo: 'compra' 
};

    const nuevo = new Formulario(datos);
    await nuevo.save();

   let contenido = `
  <h2>Nuevo formulario recibido</h2>
  <p><b>Tipo de operación:</b> Venta</p>
  <p><b>Tipo de propiedad:</b> ${datos.tipoPropiedad}</p>
  <p><b>Soy:</b> ${datos.soy}</p>
  <p><b>Nombre completo:</b> ${datos.nombre} ${datos.apellidos}</p>
  <p><b>Teléfono:</b> ${datos.telefono}</p>
  <p><b>Email:</b> ${datos.email}</p>
  <p><b>Ciudad:</b> ${datos.ciudad}</p>
  <p><b>Municipio:</b> ${datos.municipio}</p>
  <p><b>Características:</b> ${datos.caracteristicas || 'No especificadas'}</p>
  <p><b>Presupuesto mínimo:</b> ${datos.presupuestoMin || 'N/A'}</p>
  <p><b>Presupuesto máximo:</b> ${datos.presupuestoMax || 'N/A'}</p>

  <p><b>Medio de contacto preferido:</b> ${datos.medioContacto}</p>
`;

if (datos.soy === 'cliente-arrendatario') {
  contenido += `
    <p><b>¿Cuenta con póliza?:</b> ${datos.cuentaPoliza ? 'Sí' : 'No'}</p>
    <p><b>¿Cuenta con aval?:</b> ${datos.cuentaAval ? 'Sí' : 'No'}</p>
    <p><b>Cantidad de mascotas:</b> ${datos.cuantasMascotas || 'Ninguna'}</p>
    <p><b>¿Cuándo desea mudarse?:</b> ${datos.tiempoMudanza || 'No especificado'}</p>
  `;
}else{
  contenido += `
  <p><b>Forma de pago:</b> ${datos.formaPago || 'N/A'}</p>
 `;
}


    await transporter.sendMail({
      from: `"AI24" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `Nuevo formulario de contacto - ${datos.tipo}`,
      html: contenido
    });

    res.status(200).json({ msg: 'Formulario recibido y enviado por correo.' });
  } catch (err) {
    console.error('Error al enviar formulario:', err);
    res.status(500).json({ msg: 'Error al procesar el formulario.' });
  }
};

exports.getFormularios = async (req, res) => {
  try {
    const { tipo, estado, presupuestoMin, presupuestoMax, fechaInicio, fechaFin } = req.query;

    const filtros = {};

    if (tipo) filtros.tipo = tipo;

    if (estado) filtros.estado = estado;

    if (presupuestoMin || presupuestoMax) {
      filtros.presupuesto = {};
      if (presupuestoMin) filtros.presupuesto.$gte = parseFloat(presupuestoMin);
      if (presupuestoMax) filtros.presupuesto.$lte = parseFloat(presupuestoMax);
    }

    if (fechaInicio || fechaFin) {
      filtros.fechaEnvio = {};
      if (fechaInicio) filtros.fechaEnvio.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fechaEnvio.$lte = new Date(fechaFin);
    }

    const resultados = await Formulario.find(filtros).sort({ fechaEnvio: -1 });

    res.status(200).json(resultados);
  } catch (err) {
    console.error('Error al obtener formularios:', err);
    res.status(500).json({ msg: 'Error interno del servidor.' });
  }
};

exports.exportarFormularios = async (req, res) => {
  try {
    const formularios = await Formulario.find().lean();

    if (!formularios.length) {
      return res.status(404).json({ msg: 'No hay formularios para exportar.' });
    }

    const campos = [
  'tipo',
  'tipoPropiedad',
  'soy',
  'nombre',
  'apellidos',
  'telefono',
  'email',
  'ciudad',
  'municipio',
  'caracteristicas',
  'presupuestoMin',
  'presupuestoMax',
  'formaPago',
  'medioContacto',
  'cuentaPoliza',
  'cuentaAval',
  'cuantasMascotas',
  'tiempoMudanza',
  'estado', 
  'fechaEnvio'
];


    const parser = new Parser({ fields: campos });
    const csv = parser.parse(formularios);

    res.header('Content-Type', 'text/csv');
    res.attachment('formularios_ai24.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Error al exportar formularios:', err);
    res.status(500).json({ msg: 'Error al exportar los formularios.' });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['nuevo', 'en seguimiento', 'contactado', 'cerrado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ msg: 'Estado inválido.' });
    }

    const actualizado = await Formulario.findByIdAndUpdate(id, { estado }, { new: true });
    if (!actualizado) {
      return res.status(404).json({ msg: 'Formulario no encontrado.' });
    }

    res.status(200).json({ msg: 'Estado actualizado correctamente.', formulario: actualizado });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ msg: 'Error interno del servidor.' });
  }
};
