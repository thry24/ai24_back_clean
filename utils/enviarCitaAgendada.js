const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCitaAgendada({
  to,
  nombreCliente,
  nombreAgente,
  fecha,
  hora,
  tipoOperacion
}) {
  const { error } = await resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to,
    subject: '📅 Tu cita ha sido agendada',
    html: `
      <h2>📅 Cita agendada</h2>

      <p>Hola <b>${nombreCliente}</b>,</p>

      <p>
        Tu agente <b>${nombreAgente}</b> ha agendado una cita contigo.
      </p>

      <hr />

      <p><b>Tipo:</b> ${tipoOperacion}</p>
      <p><b>Fecha:</b> ${fecha}</p>
      <p><b>Hora:</b> ${hora}</p>

      <br />

      <p>
        Por favor no olvides asistir puntualmente.
      </p>

      <br />
      <p>
        — Equipo <b>Thry24</b>
      </p>
    `
  });

  if (error) {
    console.error('❌ Error enviando correo de cita:', error);
    throw error;
  }

  console.log('✅ Email de cita enviado a', to);
}

module.exports = { enviarCitaAgendada };
