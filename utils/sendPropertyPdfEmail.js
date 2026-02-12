const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía correos de publicación de propiedad:
 * - Cliente (dueño)
 * - Asesor inmobiliario
 */
async function sendPropertyPdfEmail({
  toList,
  pdfBase64,
  nombreAsesor = 'Tu asesor',
}) {
  if (!toList || toList.length < 2) {
    throw new Error('Se requieren dos correos: cliente y asesor.');
  }

  const [correoCliente, correoAsesor] = toList;

  // 📎 Adjuntar PDF
  const attachments = [];
  if (pdfBase64) {
    const base64Data = pdfBase64.includes('base64,')
      ? pdfBase64.split('base64,')[1]
      : pdfBase64;

    attachments.push({
      filename: 'ficha-propiedad.pdf',
      content: base64Data,
    });
  }

  // =========================
  // 📢 CORREO AL CLIENTE
  // =========================
  await resend.emails.send({
    from: 'THRY24 <verificaciones@thry24.com>',
    to: correoCliente,
    subject: '📢 ¡Tu propiedad ya está publicada en THRY24!',
    html: `
      <h2>📢 ¡Tu propiedad ya está publicada en THRY24!</h2>
      <p>
        Tu asesor <b>${correoAsesor}</b> ha subido tu inmueble y ya
        está disponible para potenciales compradores o arrendadores.
      </p>
      <p>👉 Revisa la ficha técnica adjunta a este correo.</p>
      <br />
      <p>— Equipo THRY24</p>
    `,
    attachments,
  });

  // =========================
  // 🏡 CORREO AL ASESOR
  // =========================
  await resend.emails.send({
    from: 'THRY24 <verificaciones@thry24.com>',
    to: correoAsesor,
    subject: '🏡 Propiedad dada de alta exitosamente en THRY24',
    html: `
      <h2>🏡 ¡Felicidades!</h2>
      <p>
        Has dado de alta la propiedad de tu cliente en <b>THRY24</b>.
      </p>
      <p>
        Ahora el inmueble está listo para promoción dentro del
        portal publicitario.
      </p>
      <p>📎 Se adjunta la ficha técnica en PDF.</p>
      <br />
      <p>— Equipo THRY24</p>
    `,
    attachments,
  });

  console.log('✅ Correos enviados correctamente:', {
    cliente: correoCliente,
    asesor: correoAsesor,
  });
}

async function sendPrePublicacionEmail({
  correoCliente,
  correoAsesor,
  pdfBase64,
}) {

  const attachments = [];

  if (pdfBase64) {
    const base64Data = pdfBase64.includes('base64,')
      ? pdfBase64.split('base64,')[1]
      : pdfBase64;

    attachments.push({
      filename: 'ficha-tecnica-thry24.pdf',
      content: base64Data,
    });
  }

  await resend.emails.send({
    from: 'THRY24 <verificaciones@thry24.com>',
    to: correoCliente,
    subject: '📝 Tu propiedad está por ser publicada en THRY24',
    html: `
      <h2>📝 Tu propiedad está por ser publicada en THRY24</h2>

      <p>
        Hemos recibido la información de tu propiedad.
      </p>

      <p>
        Es importante validar todos los datos con tu asesor 
        <b>${correoAsesor}</b> antes de su publicación oficial en
        <b>THRY24.com</b>.
      </p>

      <br />

      <p>
        Una vez confirmada la información, tu propiedad será publicada
        dentro del portal.
      </p>

      <br />

      <p>— Equipo THRY24</p>
    `,
    attachments,
  });

  console.log('✅ Pre-correo enviado al cliente');
}


module.exports = {
  sendPropertyPdfEmail,
  sendPrePublicacionEmail
};

