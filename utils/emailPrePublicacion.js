const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPrePublicationEmail({
  correoCliente,
  correoAsesor,
  pdfBase64,
  nombreAsesor = 'Tu asesor'
}) {
  if (!correoCliente) {
    throw new Error('Correo del cliente requerido.');
  }

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
    subject: '📄 Tu propiedad está por ser publicada en THRY24',
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>🏡 Tu propiedad está por ser publicada en THRY24</h2>

        <p>
          Hola,
        </p>

        <p>
          Tu asesor <b>${correoAsesor}</b> ha cargado tu propiedad en nuestra
          plataforma <b>THRY24</b>.
        </p>

        <p>
          📎 Revisa la ficha técnica adjunta a este correo y valida que
          toda la información sea correcta.
        </p>

        <p>
          Una vez confirmada con tu asesor, procederemos a publicarla en
          <b>THRY24.com</b>.
        </p>

        <br/>
        <p>— Equipo THRY24</p>
      </div>
    `,
    attachments,
  });

  console.log('✅ Correo de pre-publicación enviado al cliente');
}

module.exports = { sendPrePublicationEmail };
