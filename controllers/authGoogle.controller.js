const { OAuth2Client } = require('google-auth-library');

function getOAuthClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });
}

exports.googleStart = (req, res) => {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    scope: ['openid','email','profile'],
    prompt: 'consent',
  });
  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(req.query.code);
    const { googleId, email, nombre, picture } = await verifyGoogleIdToken(tokens.id_token);

    let user = await User.findOne({ $or: [{ googleId }, { correo: email }] }).select('+password');
    if (!user) {
      user = new User({
        nombre: nombre || 'Usuario',
        correo: email.toLowerCase(),
        rol: 'cliente',
        authProvider: 'google',
        googleId,
        picture
      });
      await user.save();
    } else {
      const toUpdate = {};
      if (!user.googleId) toUpdate.googleId = googleId;
      if (user.authProvider !== 'google') toUpdate.authProvider = 'google';
      if (!user.picture && picture) toUpdate.picture = picture;
      if (Object.keys(toUpdate).length) {
        Object.assign(user, toUpdate);
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, rol: user.rol, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const frontend = process.env.FRONTEND_URL || 'https://tu-frontend.com';
    return res.redirect(`${frontend}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('[googleCallback] error:', err);
    return res.status(500).send('Error en callback de Google');
  }
};
