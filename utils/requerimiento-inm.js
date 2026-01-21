async function enviarNuevoRequerimientoInmo({
  to,
  nombreAgente,
  nombreInmobiliaria,
}) {
  const html = `
    <h2>📢 Nuevo requerimiento publicado</h2>

    <p>Hola <b>${nombreAgente}</b>,</p>

    <p>
      Tu inmobiliaria <b>${nombreInmobiliaria}</b> ha publicado
      un nuevo requerimiento.
    </p>

    <p>
      Por favor ingresa a <a href="https://thry24.com">Thry24</a>
      para revisarlo.
    </p>

    <br />
    <p>— Equipo Thry24</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: 'Nuevo requerimiento publicado por tu inmobiliaria',
    html,
  });
}
module.exports = {
  enviarNuevoRequerimientoInmo
};

