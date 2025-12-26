// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'verificaciones@ai24mx.com',  // tu cuenta en Hostinger
    pass: 'ai24EkJc-2025-src'           // tu contraseña SMTP
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP ERROR:', error);
  } else {
    console.log('✅ SMTP listo para enviar');
  }
});

async function enviarCredenciales(to, nombreInmo, correo, password) {
  const mensaje = `
    <h2>Bienvenido a Thry24 🚀</h2>
    <p>Ahora eres parte de la plataforma CRM.</p>
    <p>La inmobiliaria <b>${nombreInmo}</b> te ha dado de alta.</p>
    <p><b>Correo:</b> ${correo}</p>
    <p><b>Contraseña temporal:</b> ${password}</p>
    <br/>
    <p>Puedes entrar a <a href="https://thry24.com">Thry24</a> y cambiar tu contraseña.</p>
    <p>¡Esperamos que disfrutes tu experiencia!</p>
  `;

  return transporter.sendMail({
    from: `"Thry24" <verificaciones@ai24mx.com>`,
    to,
    subject: "Bienvenido a Thry24 - Credenciales de acceso",
    html: mensaje
  });
}

module.exports = { enviarCredenciales };
