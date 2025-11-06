const express = require("express");
const cors = require("cors");
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
const WaveVideoRoutes = require('./routes/waveVideo.routes');
const VideoGeneratorRoutes = require('./routes/videoGenerator');
const seguimientoRoutes = require("./routes/seguimiento.routes");
const ColaboracionesRoutes = require("./routes/colaboraciones");
const citasRoutes = require("./routes/citas.routes");
const recorridosRoutes = require("./routes/recorridos");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
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
