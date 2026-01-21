const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = function generarCartaOfertaPDF(carta, propiedad) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    const fileName = `carta-oferta-${carta._id}.pdf`;
    const dirPath = path.join(__dirname, '../uploads/cartas');
    const filePath = path.join(dirPath, fileName);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath);
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve({
        filePath,
        fileName,
        buffer: pdfBuffer
      });
    });

    doc.pipe(writeStream);

    /* =======================
       CONTENIDO DEL PDF
       (igual al HTML firmado)
    ======================= */

    doc.fontSize(18).text('CARTA OFERTA DE RENTA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text('(Propuesta sujeta a aceptación del propietario)', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).text(`Fecha: ${new Date(carta.createdAt).toLocaleDateString()}`);
    doc.text(`Operación: ${carta.tipoOperacion}`);
    doc.moveDown();

    doc.fontSize(12).text('1. DATOS DEL ARRENDATARIO (CLIENTE INTERESADO)');
    doc.fontSize(11).text(`Nombre: ${carta.clienteNombre}`);
    doc.text(`Correo: ${carta.clienteEmail}`);
    doc.moveDown();

    doc.fontSize(12).text('2. DATOS DEL INMUEBLE');
    doc.fontSize(11).text(`Clave: ${carta.propiedadClave}`);
    doc.text(`Tipo: ${propiedad.tipoPropiedad || '—'}`);
    doc.text(`Dirección: ${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`);
    doc.moveDown();

    doc.fontSize(12).text('3. CONDICIONES DE LA OFERTA');
    doc.fontSize(11).text(
      `Monto mensual ofrecido: $${carta.montoOferta.toLocaleString('es-MX')} MXN`
    );
    doc.text(`Condiciones: ${carta.condiciones || 'Sin condiciones adicionales'}`);
    doc.moveDown(2);

    doc.fontSize(12).text('FIRMAS');
    doc.moveDown();

    doc.fontSize(11).text(`Propietario: ${carta.firmaPropietario?.nombre}`);
    doc.text(`Fecha de aceptación: ${new Date(carta.fechaRespuesta).toLocaleString()}`);

    doc.moveDown(3);
    doc.fontSize(9).text('CRM Thry24 – CRM Inmobiliario', { align: 'center' });

    doc.end();
  });
};
