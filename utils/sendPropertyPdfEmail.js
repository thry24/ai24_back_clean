const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía un correo con el PDF de la propiedad adjunto.
 * @param {Object} params
 * @param {string[]} params.toList 
 * @param {string} params.subject 
 * @param {string} params.html 
 * @param {string} params.pdfBase64 
 */
async function sendPropertyPdfEmail({ toList, subject, html, pdfBase64 }) {
  if (!toList || toList.length === 0) {
    throw new Error('No hay destinatarios para enviar el correo.');
  }

  const attachments = [];
  if (pdfBase64) {
    const base64Data = pdfBase64.includes('base64,')
      ? pdfBase64.split('base64,')[1]
      : pdfBase64;

    attachments.push({
      filename: 'ficha-propiedad.pdf',
      content: base64Data,
      encoding: 'base64',
      contentType: 'application/pdf',
    });
  }

  await transporter.sendMail({
    from: `"Publicación Ai24" <${process.env.SMTP_USER}>`,
    to: toList.filter(Boolean),
    subject,
    html,
    attachments,
  });
}

module.exports = sendPropertyPdfEmail;
