const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const router = express.Router();

// 📂 Directorios
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "videos");
const ASSETS_DIR = path.join(__dirname, "..", "public", "assets");
[UPLOADS_DIR, OUTPUT_DIR, ASSETS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: UPLOADS_DIR });

// 🧹 Sanitiza texto
const sanitizeText = (txt = "") =>
  txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/:/g, "\\:")
    .trim();

const FONT_PATH =
  process.platform === "win32"
    ? "C:/Windows/Fonts/arial.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

// 🎬 GENERAR VIDEO
router.post("/generar", upload.array("imagenes", 10), async (req, res) => {
  try {
    const { titulo, mensajes, plantilla } = req.body;
    const files = req.files;
    if (!files?.length)
      return res.status(400).json({ ok: false, msg: "No se recibieron imágenes" });

    const frases = mensajes
      ? mensajes.split(",").map((f) => f.trim())
      : ["Tu nuevo hogar te espera", "Vive con estilo", "Agenda tu visita hoy"];

    const estilos = {
      luxury: { color: "gold", bg: "#000000AA" },
      urban: { color: "cyan", bg: "#000000AA" },
      minimal: { color: "white", bg: "#11111199" },
      beach: { color: "yellow", bg: "#00000099" },
    };
    const estilo = estilos[plantilla] || estilos.minimal;

    const MUSIC_PATH = path.join(ASSETS_DIR, "fondo.mp3");
    const LOGO_PATH = path.join(ASSETS_DIR, "thry24.png");
    const randomId = Math.random().toString(36).substring(2, 10);

    // 1️⃣ Crear clips individuales verticales
    const tempVideos = [];
    for (const [i, file] of files.entries()) {
      const tempOut = path.join(UPLOADS_DIR, `clip_${i}_${randomId}.mp4`);
      const texto = sanitizeText(frases[i % frases.length]);

      const vfFilter = [
        "scale=720:1280:force_original_aspect_ratio=decrease",
        "pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
        `drawbox=x=0:y=1200:w=iw:h=80:color=${estilo.bg}`,
        `drawtext=text='${texto}':fontfile='${FONT_PATH}':fontcolor=${estilo.color}:fontsize=38:x=(w-text_w)/2:y=h-100`,
        "fade=t=in:st=0:d=0.5",
        "fade=t=out:st=2.5:d=0.5",
      ].join(",");

      await new Promise((resolve, reject) => {
        ffmpeg(file.path)
          .loop(3)
          .fps(30)
          .videoCodec("libx264")
          .outputOptions(["-pix_fmt", "yuv420p", "-vf", vfFilter])
          .on("end", resolve)
          .on("error", reject)
          .save(tempOut);
      });
      tempVideos.push(tempOut);
      fs.unlinkSync(file.path);
    }

    // 2️⃣ Concatenar los clips (sin filtros)
    const listFile = path.join(UPLOADS_DIR, `list_${randomId}.txt`);
    fs.writeFileSync(
      listFile,
      tempVideos.map((v) => `file '${v.replace(/\\/g, "/")}'`).join("\n")
    );

    const concatenated = path.join(UPLOADS_DIR, `concat_${randomId}.mp4`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .on("end", resolve)
        .on("error", reject)
        .save(concatenated);
    });

    // 3️⃣ Agregar logo, título y música
    const finalVideo = path.join(OUTPUT_DIR, `reel_${randomId}.mp4`);
    const tituloSan = sanitizeText(titulo);

    await new Promise((resolve, reject) => {
      const filters = [];

      // Escalar y preparar video base
      filters.push("[0:v]scale=720:1280,setdar=9/16[v0]");

      // Logo
      if (fs.existsSync(LOGO_PATH)) {
        filters.push(`[1:v]scale=100:100[wm]`);
        filters.push(`[v0][wm]overlay=W-w-40:H-h-40:format=auto[v1]`);
      } else {
        filters.push(`[v0]copy[v1]`);
      }

      // Texto final (titulo + marca)
      filters.push(
        `[v1]drawtext=text='${tituloSan}':fontfile='${FONT_PATH}':fontcolor=${estilo.color}:fontsize=52:x=(w-text_w)/2:y=80,drawtext=text='':fontfile='${FONT_PATH}':fontcolor=${estilo.color}:fontsize=30:x=(w-text_w)/2:y=h-80[final]`
      );

      const command = ffmpeg().input(concatenated);
      if (fs.existsSync(LOGO_PATH)) command.input(LOGO_PATH);
      if (fs.existsSync(MUSIC_PATH))
        command.input(MUSIC_PATH).audioCodec("aac").audioBitrate("192k");

      command
        .complexFilter(filters.join(";"))
        .outputOptions(["-map", "[final]", "-r", "30", "-pix_fmt", "yuv420p"])
        .save(finalVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // 4️⃣ Limpieza
    [...tempVideos, listFile, concatenated].forEach(
      (f) => fs.existsSync(f) && fs.unlinkSync(f)
    );

    res.json({
      ok: true,
      message: "🎬 Reel vertical con logo y música generado con éxito",
      videoUrl: `http://localhost:8080/videos/reel_${randomId}.mp4`,
    });
  } catch (err) {
    console.error("❌ Error general:", err);
    res.status(500).json({ ok: false, msg: "Error generando video" });
  }
});

module.exports = router;
