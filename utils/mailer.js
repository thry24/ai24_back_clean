// src/utils/mailer.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCredenciales(to, nombreInmo, correo, password) {
  const html = `
    <h2>Bienvenido a Thry24 🚀</h2>
    <p>Ahora eres parte de la plataforma CRM.</p>
    <p>La inmobiliaria <b>${nombreInmo}</b> te ha dado de alta.</p>
    <p><b>Correo:</b> ${correo}</p>
    <p><b>Contraseña temporal:</b> ${password}</p>
    <br/>
    <p>
      Puedes entrar a 
      <a href="https://thry24.com">https://thry24.com</a>
      y cambiar tu contraseña.
    </p>
    <p>¡Esperamos que disfrutes tu experiencia!</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <verificaciones@thry24.com>', // DEBE ser del dominio verificado
    to: [to],
    subject: 'Bienvenido a Thry24 - Credenciales de acceso',
    html
  });
}
async function enviarSolicitudColaboracion({
  to,
  agenteNombre,
  propiedadClave,
  imagenPropiedad,
}) {
  const html = `
    <h2>🤝 Nueva solicitud de colaboración</h2>

    <p>
      El agente <b>${agenteNombre}</b> quiere colaborar contigo
      en la propiedad:
    </p>

    <p><b>${propiedadClave}</b></p>

    ${imagenPropiedad ? `<img src="${imagenPropiedad}" width="300"/>` : ''}

    <p>
      Ingresa a <a href="https://thry24.com">Thry24</a> para aceptar o rechazar la colaboración.
    </p>
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: 'Nueva solicitud de colaboración en Thry24',
    html,
  });
}

module.exports = { enviarCredenciales, enviarSolicitudColaboracion };
