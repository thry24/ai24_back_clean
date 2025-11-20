const EmailVerification = require("../models/EmailVerification");
const { resend } = require("../config/resend");

async function sendVerificationCode({
  nombre,
  apellidos,
  email,
  password,
  rol,
  telefono,
  fotoPerfil,
  logo,
  firmaDigital,
  inmobiliaria,
}) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const updateData = {
      correo: email,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      nombre,
      apellidos,
      password,
      rol,
      telefono,
      verified: false,
    };

    if (rol === "agente" && fotoPerfil) updateData.fotoPerfil = fotoPerfil;
    if (rol === "inmobiliaria" && logo) updateData.logo = logo;
    if (firmaDigital) updateData.firmaDigital = firmaDigital;
    if (rol === "agente" && inmobiliaria) updateData.inmobiliaria = inmobiliaria;

    await EmailVerification.findOneAndUpdate(
      { correo: email },
      updateData,
      { upsert: true, new: true }
    );

    await resend.emails.send({
      from: `Thry24 <contacto@thry24.com.mx>`,
      to: email,
      subject: "Código de verificación de correo",
      html: `
        <h3>Hola ${nombre},</h3>
        <p>Tu código de verificación es:</p>
        <h2>${code}</h2>
        <p>Este código es válido por 10 minutos.</p>
      `,
    });

    return { success: true, message: "Código enviado al correo" };
  } catch (error) {
    console.error("Error enviando código:", error.message);
    return { success: false, message: "Error al enviar correo" };
  }
}

async function sendColaboracionNotificacion({
  agenteEmail,
  colaboradorNombre,
  colaboradorEmail,
  accion,
  propiedad,
}) {
  try {
    const accionTexto = accion === "aceptar" ? "aceptó" : "rechazó";
    const color = accion === "aceptar" ? "#4caf50" : "#e74c3c";

    await resend.emails.send({
      from: `Ai24 <contacto@thry24.com.mx>`,
      to: agenteEmail,
      subject: `Tu colaboración fue ${accionTexto}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; border-radius: 8px; background: #f8f9fb; border: 1px solid #ddd;">
          <h2 style="color: ${color};">Colaboración ${accionTexto.toUpperCase()}</h2>
          <p style="font-size: 15px;">
            El usuario <strong>${colaboradorNombre}</strong> (${colaboradorEmail}) ha <b>${accionTexto}</b> tu colaboración
            ${propiedad ? `para la propiedad <strong>${propiedad}</strong>` : ""}.
          </p>
          <p style="margin-top: 16px;">Ingresa a tu panel de Ai24 para ver más detalles.</p>
        </div>
      `,
    });

    console.log(`Correo enviado al agente: ${agenteEmail}`);
  } catch (error) {
    console.error("Error enviando correo:", error.message);
  }
}

module.exports = { sendVerificationCode, sendColaboracionNotificacion };
