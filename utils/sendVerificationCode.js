const nodemailer = require("nodemailer");
const EmailVerification = require("../models/EmailVerification");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
      telefono: telefono,
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

    await transporter.sendMail({
      from: `"Verificación Ai24" <${process.env.SMTP_USER}>`,
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
    console.error("Error al enviar código de verificación:", error.message);
    return {
      success: false,
      message: "Error al enviar el código. Inténtalo más tarde.",
    };
  }
}


module.exports = { sendVerificationCode };
