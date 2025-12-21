const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // contacto@thry24.com.mx
    pass: process.env.EMAIL_PASS
  }
});

/**
 * 📧 Email para cliente creado por agente
 */
async function enviarAltaCliente({
  to,
  nombreCliente,
  nombreAgente,
  correo,
  password
}) {
  return transporter.sendMail({
    from: `"Thry24" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Bienvenido a Thry24 🚀",
    html: `
      <h2>¡Bienvenido a Thry24!</h2>
      <p>Hola <b>${nombreCliente}</b>,</p>

      <p>
        Has sido registrado en <b>Thry24</b> por tu agente
        <b>${nombreAgente}</b>.
      </p>

      <hr />

      <p><b>Correo:</b> ${correo}</p>
      <p><b>Contraseña temporal:</b> ${password}</p>

      <br />

      <p>
        Puedes iniciar sesión en:
        <a href="https://thry24.com">https://thry24.com</a>
      </p>

      <p>Te recomendamos cambiar tu contraseña al ingresar.</p>

      <br />
      <p>— Equipo Thry24</p>
    `
  });
}

module.exports = { enviarAltaCliente };
