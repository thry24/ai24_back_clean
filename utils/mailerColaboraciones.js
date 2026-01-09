const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarSolicitudColaboracion({
  to,
  nombreColaborador,
  nombreAgente,
  nombrePropiedad,
  imagenPropiedad,
}) {
  const html = `
    <h2>🤝 Nueva solicitud de colaboración</h2>

    <p>
      El agente <b>${nombreAgente}</b> quiere colaborar contigo en la propiedad:
    </p>

    <h3>${nombrePropiedad}</h3>

    ${
      imagenPropiedad
        ? `<img src="${imagenPropiedad}" style="max-width:100%;border-radius:8px" />`
        : ''
    }

    <br/><br/>

    <p>
      Ingresa a <a href="https://thry24.com">Thry24</a> para aceptar o rechazar la colaboración.
    </p>
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: '🤝 Nueva solicitud de colaboración en Thry24',
    html,
  });
}

module.exports = { enviarSolicitudColaboracion };
