const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function makeJwt(user) {
  return jwt.sign(
    { id: user._id, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

exports.googleSignIn = async (req, res) => {
  try {
    // ✅ Acepta ambos: credential (GIS) o idToken (legacy)
    const credential = req.body.credential || req.body.idToken;
    const { rol, telefono, inmobiliaria } = req.body;

    if (!credential) {
      return res.status(400).json({ msg: "Falta credential (o idToken) de Google" });
    }

    // 1) Verificar ID token con Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = (payload?.email || "").toLowerCase().trim();
    const nombre = payload?.name || "Usuario";
    const picture = payload?.picture || "";

    if (!googleId || !email) {
      return res.status(401).json({ msg: "Token Google inválido" });
    }

    // 2) Buscar/crear usuario
    let user = await User.findOne({ $or: [{ googleId }, { correo: email }] }).select("+password");

    if (!user) {
      const rolValido = ["cliente", "agente", "inmobiliaria", "propietario"].includes(rol) ? rol : "cliente";


      user = new User({
        nombre,
        correo: email,
        rol: rolValido,
        authProvider: "google",
        googleId,
        picture,
        ...(telefono ? { telefono: String(telefono).trim() } : {}),
        inmobiliaria: rolValido === "agente" && inmobiliaria ? inmobiliaria : null,
      });


      if (rolValido === "agente" && picture) user.fotoPerfil = picture;
      if (rolValido === "inmobiliaria" && picture) user.logo = picture;

      await user.save();
    } else {
      let changed = false;
      if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (user.authProvider !== "google") { user.authProvider = "google"; changed = true; }
      if (!user.picture && picture) { user.picture = picture; changed = true; }
      if (!user.fotoPerfil && picture) { user.fotoPerfil = picture; changed = true; }
      if (changed) await user.save();
    }

    const token = makeJwt(user);
    const out = user.toObject();
    delete out.password;

    return res.status(200).json({ token, user: out });
  } catch (err) {
    console.error("[googleSignIn] error:", err);
    return res.status(400).json({ msg: "Error con Google Sign-In", error: err.message });
  }
};
