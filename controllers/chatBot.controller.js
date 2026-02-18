// controllers/chatbot.controller.js
const Lead = require("../models/Lead");
const Conversation = require("../models/Conversation");
const { getNextState, getQuestionForState } = require("../services/flowEngine");
const { searchPropertiesForLead } = require("../services/propertySearchForBot");
const { searchAllByLocationForLead } = require("../services/searchAllByLocationForLead");

function tempEmail() {
  return `chatbot_${Date.now()}_${Math.random().toString(16).slice(2)}@thry24.local`;
}

function setDeep(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

// ✅ misma pregunta FEATURES pero sin texto para que el front NO la vuelva a imprimir
function silentFeaturesQuestion(lead) {
  const q = getQuestionForState({ leadType: lead.leadType, state: "FEATURES", lead });
  return { ...q, text: "" };
}

// ================= START =================
exports.startConversation = async (req, res) => {
  try {
    const { leadType } = req.body;
    if (!leadType) return res.status(400).json({ error: "Falta leadType" });

    const lead = await Lead.create({
      email: tempEmail(),
      origen: "chatbot",
      estatus: "nuevo",
      leadType,
      rol: leadType === "propietario" ? "propietario" : "cliente",
      tipoCliente: leadType === "propietario" ? "propietario" : "cliente",
      mensaje: "Lead iniciado por chatbot",
    });

    const conv = await Conversation.create({
      leadId: lead._id,
      state: "OPERATION",
      context: {
        featuresTries: 0,
        lastNoMatch: false,
      },
      history: [
        {
          role: "bot",
          text: "Hola 👋😊 soy Rentin y te haré unas preguntas rápidas para ayudarte a encontrar tu propiedad ideal 🏘️🔎.",
        },
      ],
    });

    const q = getQuestionForState({ leadType, state: conv.state, lead });

    return res.json({
      conversationId: conv._id,
      leadId: lead._id,
      bot: conv.history[0],
      question: q,
    });
  } catch (err) {
    console.error("[chatbot.startConversation] error:", err);
    return res.status(500).json({ error: err.message || "Error interno" });
  }
};

// ================= REPLY =================
exports.reply = async (req, res) => {
  try {
    const { conversationId, key, value, payload } = req.body;

    if (!conversationId) return res.status(400).json({ error: "Falta conversationId" });
    if (!key && !payload) return res.status(400).json({ error: "Falta key/payload" });

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ error: "Conversación no encontrada" });

    const lead = await Lead.findById(conv.leadId);
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    // ✅ context seguro (Mixed)
    if (!conv.context || typeof conv.context !== "object") conv.context = {};
    if (typeof conv.context.featuresTries !== "number") conv.context.featuresTries = 0;
    if (typeof conv.context.lastNoMatch !== "boolean") conv.context.lastNoMatch = false;

    // 1) Guardar mensaje usuario
    conv.history.push({
      role: "user",
      text: String(value ?? "[respuesta]"),
      payload: { key, value, payload },
    });

    // 2) Guardar en lead (normal)
    if (payload?.features) {
      lead.features = payload.features;
      lead.markModified("features");
    } else if (key) {
      const keyMap = {
        operation: "tipoOperacion",
        propertyType: "tipoPropiedad",
      };
      const realKey = keyMap[key] || key;

      if (realKey.includes(".")) {
        setDeep(lead, realKey, value);
        if (realKey.startsWith("extra.")) lead.markModified("extra");
      } else {
        lead[realKey] = value;
      }
    }
    await lead.save();

    // ================= FEATURES =================
    const isFeaturesState = conv.state === "FEATURES";
    const isMensajeKey = key === "mensaje";

    if (isFeaturesState && isMensajeKey) {
      const userMessage = String(value || "").trim();

      // ✅ mensaje muy corto: no subas tries, solo pide más detalle
      if (userMessage.length < 3) {
        const msg = {
          role: "bot",
          text: "Escríbeme un poquito más 😊 (ej: “2 recámaras, Querétaro, hasta 2.5M”).",
          payload: { type: "text" },
        };
        conv.history.push(msg);

        // (no tocamos context)
        await conv.save();

        return res.json({
          leadId: lead._id,
          state: "FEATURES",
          botMessage: msg,
          question: silentFeaturesQuestion(lead),
        });
      }

      // ✅ sube contador (y PERSISTE)
      conv.context.featuresTries = Number(conv.context.featuresTries || 0) + 1;
      conv.markModified("context");

      const result = await searchPropertiesForLead({ lead, mensaje: userMessage });

      // si el usuario metió ubicación aquí, corrige lead.ubicacion
      if (result?.parsed?.locationText) {
        lead.ubicacion = result.parsed.locationText;
        await lead.save();
      }

      const items = result.items || [];

      // ===== SI HAY RESULTADOS =====
      if (items.length) {
        const cameFromNoMatch = Boolean(conv.context.lastNoMatch);

        // ✅ resetea flags (y PERSISTE)
        conv.context.featuresTries = 0;
        conv.context.lastNoMatch = false;
        conv.markModified("context");

        const cardsMsg = {
          role: "bot",
          text: cameFromNoMatch
            ? "No encontré coincidencias exactas 😕, pero mira estas opciones en tu zona 👇"
            : "Encontré estas opciones 👇 (toca una para verla)",
          payload: { type: "property_cards", items },
        };

        conv.history.push(cardsMsg);
        await conv.save();

        return res.json({
          leadId: lead._id,
          state: "FEATURES",
          botMessage: cardsMsg,
          question: silentFeaturesQuestion(lead),
        });
      }

      // ===== NO HAY RESULTADOS =====
      conv.context.lastNoMatch = true;
      conv.markModified("context");

      const tries = Number(conv.context.featuresTries || 0);

      // ✅ 3er intento: fallback por zona + mensaje especial
      if (tries >= 3) {
        const loc = String(lead?.ubicacion || result?.parsed?.locationText || "").trim();
        const fallbackItems = loc ? await searchAllByLocationForLead({ lead, loc }) : [];

        const msgText = fallbackItems.length
          ? "No encontré propiedades con esas características 😕, pero ¿qué te parecen estas opciones en tu zona? 👇"
          : "No encontré propiedades con esas características 😕 y tampoco encontré opciones en esa zona.";

        const cardsMsg = {
          role: "bot",
          text: msgText,
          payload: { type: "property_cards", items: fallbackItems },
        };

        // ✅ reset (y PERSISTE)
        conv.context.featuresTries = 0;
        conv.context.lastNoMatch = false;
        conv.markModified("context");

        conv.history.push(cardsMsg);
        await conv.save();

        return res.json({
          leadId: lead._id,
          state: "FEATURES",
          botMessage: cardsMsg,
          question: silentFeaturesQuestion(lead),
        });
      }

      // ✅ intentos 1-2: solo “no encontré”
      const msg = {
        role: "bot",
        text: "No encontré coincidencias 😕. Prueba ajustando zona/presupuesto/recámaras.",
        payload: { type: "text" },
      };

      conv.history.push(msg);
      await conv.save();

      return res.json({
        leadId: lead._id,
        state: "FEATURES",
        botMessage: msg,
        question: silentFeaturesQuestion(lead),
      });
    }

    // ================= FLUJO NORMAL =================
    const nextState = getNextState({ leadType: lead.leadType, state: conv.state, lead });
    conv.state = nextState;

    const nextQuestion = getQuestionForState({ leadType: lead.leadType, state: nextState, lead });

    if (nextQuestion?.text) {
      conv.history.push({ role: "bot", text: nextQuestion.text, payload: nextQuestion });
    }

    await conv.save();

    return res.json({
      leadId: lead._id,
      state: nextState,
      botMessage: null,
      question: nextQuestion,
    });
  } catch (err) {
    console.error("[chatbot.reply] error:", err);
    return res.status(500).json({ error: err.message || "Error interno" });
  }
};
