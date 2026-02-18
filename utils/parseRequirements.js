// utils/parseRequirements.js
function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\s+/g, " ")
    .trim();
}

function pickNumberAfter(text, words) {
  for (const w of words) {
    const r = new RegExp(`(\\d{1,2})\\s*(?:${w})`, "i");
    const m = text.match(r);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function pickBudget(text) {
  const t = text.replace(/,/g, "");

  const m1 = t.match(
    /(?:presupuesto|hasta|max(?:imo)?|tope)\s*\$?\s*(\d+(?:\.\d+)?)\s*(m|millones)?/i
  );
  if (m1) {
    const n = parseFloat(m1[1]);
    return m1[2] ? Math.round(n * 1_000_000) : Math.round(n);
  }

  const nums = (t.match(/\d{4,9}/g) || []).map((n) => parseInt(n, 10));
  if (!nums.length) return null;
  return Math.max(...nums);
}

function pickLocationText(text) {
  // "en queretaro", "zona norte", "por juriquilla"
  const m = text.match(/(?:en|por|zona)\s+([a-z0-9\s]{3,40})/i);
  return m ? normalize(m[1]).slice(0, 40) : null;
}

function pickLocationFromComma(text) {
  // ejemplo: "2 recamaras, queretaro" => "queretaro"
  const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1];
  if (!last) return null;

  // evita cosas tipo "2 banos"
  if (/\d/.test(last)) return null;
  if (/recamara|habitacion|bano|cochera|estacionamiento|presupuesto|hasta|max/i.test(last)) {
    return null;
  }

  return normalize(last).slice(0, 40);
}

function parseRequirements(rawMessage = "") {
  const msg = normalize(rawMessage);

  const rooms = pickNumberAfter(msg, ["recamaras?", "habitaciones?"]);
  const baths = pickNumberAfter(msg, ["banos?"]);
  const budget = pickBudget(msg);

  // ✅ ubicación: primero "en/zona", si no, por coma
  let locationText = pickLocationText(msg);
  if (!locationText) locationText = pickLocationFromComma(msg);

  const tokens = msg
    .split(" ")
    .filter((w) => w.length >= 3)
    .slice(0, 14);

  return { rooms, baths, budget, locationText, tokens, raw: msg };
}

module.exports = { parseRequirements };
