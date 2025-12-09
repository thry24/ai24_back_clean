const User = require("../models/User");
const Relacion = require("../models/RelacionAgenteCliente");
const { resend } = require("../config/resend");
const bcrypt = require("bcryptjs");

async function enviarCorreoBienvenida(email, passwordTemporal, nombreAgente) {
  try {
    await resend.emails.send({
      from: "Thry24 <notificaciones@thry24.com>",
      to: email,
      subject: "Bienvenido a Thry24",
      html: `
        <h2>Bienvenido a Thry24 🚀</h2>
        <p>Has sido dado de alta por tu asesor <b>${nombreAgente}</b>.</p>
        <p><b>Correo:</b> ${email}</p>
        <p><b>Contraseña temporal:</b> ${passwordTemporal}</p>
        <p>Cambia tu contraseña al iniciar sesión.</p>
      `
    });
  } catch (err) {
    console.error("Error enviando correo:", err);
  }
}

exports.agenteCreaCliente = async (req, res) => {
  try {
    const agente = req.user;
    const { nombre, email, telefono, tipoCliente, tipoOperacion } = req.body;

    if (!nombre || !email)
      return res.status(400).json({ msg: "Nombre y correo son obligatorios." });

    const emailNormalizado = email.toLowerCase().trim();

    // PLANES: límites
    let limite = 5;
    if (agente.tipoPlan === "6meses") limite = 10;
    if (agente.tipoPlan === "anual") limite = 20;

    const totalClientes = await Relacion.countDocuments({ agente: agente._id });
    if (totalClientes >= limite) {
      return res.status(403).json({
        msg: `Has alcanzado el límite de ${limite} clientes según tu plan (${agente.tipoPlan}).`
      });
    }

    let usuario = await User.findOne({ correo: emailNormalizado });
    let esNuevo = false;
    let passwordTemporal = null;

    // Crear usuario si no existe
    if (!usuario) {
      esNuevo = true;
      passwordTemporal = Math.random().toString(36).slice(-10);

      usuario = await User.create({
        nombre,
        correo: emailNormalizado,
        telefono: telefono || "",
        rol: "cliente",
        tipoCliente,
        tipoOperacion: tipoOperacion || "",
        password: await bcrypt.hash(passwordTemporal, 10),
        inmobiliaria: agente.inmobiliaria || null
      });
    } else {
      await User.findByIdAndUpdate(usuario._id, {
        telefono: telefono || usuario.telefono,
        tipoCliente: tipoCliente || usuario.tipoCliente,
        tipoOperacion: tipoOperacion || usuario.tipoOperacion
      });
    }

    // Crear relación si no existe
    const relacion = await Relacion.findOneAndUpdate(
      { agente: agente._id, cliente: usuario._id },
      { tipoCliente },
      { new: true, upsert: true }
    );

    // Correo solo a usuarios nuevos
    if (esNuevo) {
      await enviarCorreoBienvenida(
        usuario.correo,
        passwordTemporal,
        agente.nombre
      );
    }

    res.json({
      msg: esNuevo
        ? "Cliente creado y asignado correctamente."
        : "Cliente asignado correctamente.",
      usuario,
      relacion
    });

  } catch (err) {
    console.error("Error en agenteCreaCliente:", err);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};
