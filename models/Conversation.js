// models/Conversation.js
const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
  state: { type: String, required: true },        // ej: OPERATION, PROPERTY_TYPE, FEATURES, NAME...
  context: { type: mongoose.Schema.Types.Mixed, default: {} }, // cache de cosas
  history: [{
    role: { type: String, enum: ["bot", "user"], required: true },
    text: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
