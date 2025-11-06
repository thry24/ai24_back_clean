require("dotenv").config();
const mongoose = require("mongoose");
const Seguimiento = require("../models/Seguimiento");
const Relacion = require("../models/RelacionAgenteCliente");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("❌ No se encontró MONGODB_URI en tu archivo .env");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
};

(async () => {
  try {
    await connectDB();

    const seguimientos = await Seguimiento.find({
      $or: [
        { tipoCliente: { $exists: false } },
        { tipoCliente: null },
        { tipoCliente: "" },
      ],
    });

    console.log(`🧩 Encontrados ${seguimientos.length} seguimientos sin tipoCliente`);

    for (const s of seguimientos) {
      const rel = await Relacion.findOne({
        clienteEmail: s.clienteEmail,
        agenteEmail: s.agenteEmail,
      });

      if (rel?.tipoCliente) {
        s.tipoCliente = rel.tipoCliente;
        await s.save();
        console.log(`✅ Actualizado seguimiento de ${s.clienteEmail} → ${rel.tipoCliente}`);
      }
    }

    console.log("🎉 Migración completada");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error en migración:", err);
    mongoose.connection.close();
  }
})();
