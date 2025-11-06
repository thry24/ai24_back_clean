// scripts/backfillParticipantsHash.js
const mongoose = require('mongoose');
const Mensaje = require('../models/Mensaje');
function hashParticipants(a,b){return [String(a||'').toLowerCase(), String(b||'').toLowerCase()].sort().join('#');}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const cursor = Mensaje.find({ $or: [{ participantsHash: { $exists: false } }, { participantsHash: null }, { participantsHash: '' }] }).cursor();
  let n=0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const hash = hashParticipants(doc.emisorEmail, doc.receptorEmail);
    doc.participantsHash = hash;
    await doc.save();
    n++;
  }
  console.log('Backfilled:', n);
  await mongoose.disconnect();
})();
