// utils/googleVerify.js
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload(); // sub, email, email_verified, name, picture
  if (!payload?.email || !payload?.email_verified) {
    const e = new Error('Email de Google no verificado');
    e.status = 401;
    throw e;
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    nombre: payload.name || payload.given_name || 'Usuario',
    picture: payload.picture || null,
  };
}

module.exports = { verifyGoogleIdToken };
