const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


async function enviarAltaCliente({
  to,
  nombreCliente,
  nombreAgente,
  correo,
  password
}) {
  const { error } = await resend.emails.send({
    from: 'Thry24 <verificaciones@thry24.com>', 
    to,
    subject: 'Bienvenido a Thry24 🚀',
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

  if (error) {
    console.error('❌ RESEND ERROR:', error);
    throw error;
  }

  console.log('✅ Email enviado correctamente a', to);
}

module.exports = { enviarAltaCliente };
