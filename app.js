const express = require("express");
const cors = require("cors");
const allowedOrigins = [
  "https://thry24.com",
  "https://www.thry24.com",
    "http://localhost:8100",   // Ionic local
  "http://localhost:4200",   // Angular local
  "http://localhost:5173",   // Vite local
  "https://thry24.com/inmobiliaria/"
];

require("dotenv").config();
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const formularioRoutes = require("./routes/formulario.routes");
const propiedadRoutes = require("./routes/propiedad.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const compararRoutes = require("./routes/comparar.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const crmDashboardRoutes = require("./routes/crmDashboardRoutes");
const chatRoutes = require("./routes/chatRoutes");
const suscripcionesRoutes = require('./routes/suscripciones');
const requerimientosRoutes = require('./routes/requerimientos.routes');
const mensajesAgentesRoutes = require('./routes/mensajes-agentes.routes');
const agentesRoutes = require('./routes/agentes');
const WaveVideoRoutes = require('./routes/waveVideo.routes');
const VideoGeneratorRoutes = require('./routes/videoGenerator');
const seguimientoRoutes = require("./routes/seguimiento.routes");
const ColaboracionesRoutes = require("./routes/colaboraciones");
const citasRoutes = require("./routes/citas.routes");
const recorridosRoutes = require("./routes/recorridos");
const http = require("http");
const { Server } = require("socket.io");
const kpisRoutes = require("./routes/kpis.routes");
const comisionesRoutes = require("./routes/comisiones.routes");

const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      // Permite apps móviles / ionic / postman
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS bloqueado por seguridad"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api", formularioRoutes);
app.use("/api", propiedadRoutes);
app.use("/api", wishlistRoutes);
app.use("/api", compararRoutes);
app.use("/api/recorridos", recorridosRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api", crmDashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/requerimientos', requerimientosRoutes);
app.use('/api/mensajes-agentes', mensajesAgentesRoutes);
app.use('/api/wave-video', WaveVideoRoutes);
app.use('/api/video', VideoGeneratorRoutes);
app.use("/api/seguimientos", seguimientoRoutes);
app.use('/api/colaboraciones', ColaboracionesRoutes);
app.use("/api/relaciones", require("./routes/relacion.routes"));
app.use('/api', require('./routes/directorioRoutes'));
app.use("/api/citas", citasRoutes);
app.use('/api/agentes', agentesRoutes);
app.use("/api/kpis", require("./routes/kpis.routes"));
app.use("/api/comisiones", comisionesRoutes);
app.use("/api/productividad", require("./routes/productividad.routes"));
app.use("/api/inmobiliaria", require("./routes/inmobiliaria.routes"));
app.use("/api/busquedas", require("./routes/busquedas.routes"));


app.use('/videos', express.static(path.join(__dirname, 'public/videos')));
app.get("/", (req, res) => {
  res.send("API THRY24 funcionando...");
});

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  const q = socket.handshake?.query || {};
  const a = socket.handshake?.auth || {};
  const email = String(q.email || a.email || "").toLowerCase();
  socket.data.email = email;
  next();
});

io.on("connection", (socket) => {
  const email = socket.data.email;
  if (email) socket.join(email);
  socket.on("disconnect", () => {});
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = { app, server, io };
