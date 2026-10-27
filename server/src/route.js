// Relay routing for one game room, kept free of Cloudflare APIs so orch/serverbench.mjs can time it in plain Node.
// A frame is one or more "<to>|<json>" records joined by "\n". Payloads are never parsed or copied beyond one slice.

// host -> players. byId: Map player id -> socket; send(socket, frame).
export function routeHost(msg, fromId, byId, send) {
  if (msg.indexOf('\n') < 0) {                        // one record: the common case, no lists
    const i = msg.indexOf('|');
    if (i < 0 || i > 40) return;
    const frame = fromId + msg.slice(i);
    if (i === 0) { for (const w of byId.values()) send(w, frame); }
    else { const w = byId.get(msg.slice(0, i)); if (w) send(w, frame); }
    return;
  }
  // a batch: group the records per receiving player, so each gets one frame
  const per = new Map();
  const add = (w, rec) => { const a = per.get(w); if (a) a.push(rec); else per.set(w, [rec]); };
  for (const r of msg.split('\n')) {
    const i = r.indexOf('|');
    if (i < 0 || i > 40) continue;
    const rec = fromId + r.slice(i);
    if (i === 0) { for (const w of byId.values()) add(w, rec); }
    else { const w = byId.get(r.slice(0, i)); if (w) add(w, rec); }
  }
  for (const [w, a] of per) send(w, a.length === 1 ? a[0] : a.join('\n'));
}

// player -> host: every record goes to the host, tagged with the player's id (whatever "to" the player wrote)
export function routePlayer(msg, fromId) {
  if (msg.indexOf('\n') < 0) { const i = msg.indexOf('|'); return i < 0 ? null : fromId + (i ? msg.slice(i) : msg); }
  const out = [];
  for (const r of msg.split('\n')) { const i = r.indexOf('|'); if (i >= 0) out.push(fromId + r.slice(i)); }
  return out.length ? out.join('\n') : null;
}
