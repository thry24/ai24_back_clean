const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCredenciales(to, nombreInmo, correo, password) {
  const html = `
    <h2>Bienvenido a Thry24 🚀</h2>
    <p>Ahora eres parte de la plataforma CRM.</p>
    <p>La inmobiliaria <b>${nombreInmo}</b> te ha dado de alta.</p>
    <p><b>Correo:</b> ${correo}</p>
    <p><b>Contraseña temporal:</b> ${password}</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <verificaciones@thry24.com>',
    to: [to],
    subject: 'Bienvenido a Thry24 - Credenciales de acceso',
    html
  });
}

// ===============================
// 🤝 Solicitud de colaboración
// ===============================
async function enviarSolicitudColaboracion({
  to,
  agenteNombre,
  propiedadClave,
  imagenPropiedad,
}) {
  const html = `
    <h2>🤝 Nueva solicitud de colaboración</h2>
    <p>El agente <b>${agenteNombre}</b> quiere colaborar contigo en:</p>
    <p><b>${propiedadClave}</b></p>
    ${imagenPropiedad ? `<img src="${imagenPropiedad}" width="300"/>` : ''}
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: 'Nueva solicitud de colaboración',
    html,
  });
}

// ===============================
// 📩 Contacto por propiedad
// ===============================
async function enviarCorreoContactoAgente({
  to,
  agenteNombre,
  clienteNombre,
  tipoCliente,
  propiedadClave,
  imagenPropiedad,
  mensaje,
}) {
  const { error } = await resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to,
    subject: `📩 Nuevo interés – ${propiedadClave}`,
    html: `
      <h2>Nuevo interés en tu propiedad</h2>
      <p><b>${clienteNombre}</b> (${tipoCliente}) ha seleccionado:</p>
      <h3>${propiedadClave}</h3>
      ${imagenPropiedad ? `<img src="${imagenPropiedad}" width="300"/>` : ''}
      <p>${mensaje}</p>
    `,
  });

  if (error) {
    console.error('❌ Error enviando correo:', error);
    throw error;
  }
}

// ===============================
// 📄 Checklist documentos
// ===============================
async function enviarChecklistPropietario({
  to,
  nombrePropietario,
  tipoOperacion,
  documentos,
  linkChecklist
}) {
  if (!linkChecklist) {
    throw new Error('linkChecklist es obligatorio para enviar checklist');
  }

  const lista = documentos.map(d => `<li>${d}</li>`).join('');

  const html = `
    <h2>📄 Documentación requerida</h2>

    <p>Hola <b>${nombrePropietario}</b>,</p>

    <p>
      Para continuar con la <b>${tipoOperacion}</b>, sube los siguientes documentos:
    </p>

    <ul>
      ${lista}
    </ul>

    <p>
      <a
        href="${linkChecklist}"
        style="
          display:inline-block;
          padding:12px 20px;
          background:#2563eb;
          color:#ffffff;
          border-radius:6px;
          text-decoration:none;
          font-weight:bold;
        "
      >
        👉 Subir documentos
      </a>
    </p>

    <br />
    <p>— Equipo Thry24</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: '📄 Documentación requerida',
    html
  });
}

/**
 * 📩 Correo: Carta oferta generada (pendiente de respuesta)
 */
async function enviarCartaOfertaPropietario({
  to,
  nombrePropietario,
  propiedadClave,
  tipoOperacion,
  linkCarta
}) {
  const html = `
    <h2>📄 Nueva Carta Oferta</h2>

    <p>Hola <b>${nombrePropietario}</b>,</p>

    <p>
      Tu asesor ha generado una <b>Carta Oferta</b> para tu propiedad
      <b>${propiedadClave}</b> en modalidad de <b>${tipoOperacion}</b>.
    </p>

    <p>
      Por favor revisa la propuesta y decide si deseas aceptarla o rechazarla.
    </p>

    <p>
      <a
        href="${linkCarta}"
        style="
          display:inline-block;
          padding:12px 20px;
          background:#2563eb;
          color:#fff;
          text-decoration:none;
          border-radius:6px;
        "
      >
        👉 Ver Carta Oferta
      </a>
    </p>

    <p>
      Tu decisión permitirá continuar o no con el proceso.
    </p>

    <br />
    <p>— Equipo Thry24</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: '📄 Tienes una nueva Carta Oferta',
    html
  });
}

async function enviarCartaFirmadaAgente({
  to,
  nombreAgente,
  propiedadClave,
  pdfBuffer
}) {
  return resend.emails.send({
    from: 'Thry24 <notificaciones@thry24.com>',
    to: [to],
    subject: '📄 Carta Oferta Aceptada y Firmada',
    html: `
      <h2>📄 Carta Oferta Aceptada</h2>
      <p>Hola <b>${nombreAgente}</b>,</p>
      <p>
        El propietario ha <b>aceptado y firmado</b> la carta oferta
        de la propiedad <b>${propiedadClave}</b>.
      </p>
      <p>Se adjunta la carta firmada en PDF.</p>
      <br/>
      <p>— Equipo Thry24</p>
    `,
    attachments: [
      {
        filename: `Carta-Oferta-${propiedadClave}.pdf`,
        content: pdfBuffer
      }
    ]
  });
}
async function enviarRecuperacionPassword({ to, nombre, password }) {
  const html = `
    <h2>🔐 Recuperación de contraseña</h2>
    <p>Hola <b>${nombre}</b>,</p>

    <p>Hemos generado una contraseña temporal para que accedas a Thry24.</p>

    <p><b>Contraseña temporal:</b></p>
    <h3>${password}</h3>

    <p>Te recomendamos cambiarla una vez que inicies sesión.</p>

    <br />
    <p>— Equipo Thry24</p>
  `;

  return resend.emails.send({
    from: 'Thry24 <verificaciones@thry24.com>',
    to: [to],
    subject: '🔐 Recupera tu acceso a Thry24',
    html
  });
}


module.exports = {
  enviarCredenciales,
  enviarSolicitudColaboracion,
  enviarCorreoContactoAgente,
  enviarChecklistPropietario, 
  enviarCartaOfertaPropietario,
  enviarCartaFirmadaAgente,
  enviarRecuperacionPassword
};
