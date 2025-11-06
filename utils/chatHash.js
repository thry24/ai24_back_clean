// utils/chatHash.js
function hashParticipants(a, b) {
  return [String(a || '').toLowerCase(), String(b || '').toLowerCase()].sort().join('#');
}
module.exports = { hashParticipants };
