// Main-thread client of the simulation worker (ww3sim.js run as a Web Worker): the sim and Godot's rendering run on two
// cores. Godot sends orders + "step k" and gets one transferred ArrayBuffer snapshot + events per step. Plain Worker,
// transferable buffers: no SharedArrayBuffer, so no COOP/COEP headers (works on GitHub Pages). Contract: godot/bridge/README.md
window.WW3W = (function () {
  var w = null, boot = null, init = null, Q = [], cur = null, orders = [], pending = 0, lines = '{}', fog = null, hash = '', snap = '', ans = {}, asked = {}, reqLast = {}, st0 = 0;
  var st = { steps: 0, bytes: 0, wms: 0, mainMs: 0 };
  function onmsg(e) {
    var t0 = performance.now(), m = e.data;
    if (m.c === 'boot') boot = m;
    else if (m.c === 'new') { init = m; Q = []; pending = 0; cur = { js: '', ent: m.ent, proj: new ArrayBuffer(0) }; lines = m.lines; hash = m.hash; snap = m.snap || ''; fog = null; }
    else if (m.c === 'step') { pending--; Q.push(m); if (m.lines) lines = m.lines; if (m.fog) fog = m.fog; if (m.hash) hash = m.hash; if (m.snap) snap = m.snap; st0++; st.steps++; st.bytes += m.ent.byteLength + m.proj.byteLength + m.js.length; st.wms += m.wms; }
    else if (m.c === 'sync') { Q.push(m); if (m.lines) lines = m.lines; if (m.hash) hash = m.hash; if (m.snap) snap = m.snap; }
    else if (m.c === 'snap') { if (m.snap) snap = m.snap; }
    else if (m.c === 'ans') { ans[m.key] = m.v; delete asked[m.key]; }
    st.mainMs += performance.now() - t0;
  }
  function ask(q, a, dflt) { var key = q + ':' + a.join(','); if (!asked[key]) { asked[key] = 1; w.postMessage({ c: 'ask', q: q, a: a, key: key }); } return key in ans ? ans[key] : dflt; }
  return {
    start: function (url) { if (w) return 1; try { w = new Worker(url || 'ww3sim.js'); w.onmessage = onmsg; w.onerror = function (e) { console.error('WW3 worker: ' + (e.message || e)); }; return 1; } catch (e) { console.error(e); return 0; } },
    booted: function () { return boot ? 1 : 0; },
    tables: function () { return boot ? boot.tables : '{}'; },
    rules: function (fac) { return boot && boot.rules[fac] ? boot.rules[fac] : '{}'; },
    newGame: function (json) { init = null; orders = []; ans = {}; asked = {}; w.postMessage({ c: 'new', o: json }); },
    ready: function () { return init ? 1 : 0; },
    initInfo: function () { return init ? init.r : '{}'; },
    mapMeta: function () { return init ? init.meta : '{}'; },
    mapBuf: function (k) { return new Uint8Array(init && init.bufs[k] ? init.bufs[k] : 0); },
    order: function (team, json) { orders.push([team, json]); },
    // asks the worker for k ticks (with the orders queued so far); 0 = the worker is more than 6 steps behind, try next frame
    step: function (k, fogTeam, wantHash) { if (!init || pending >= 6) return 0; pending++; w.postMessage({ c: 'step', k: k, orders: orders, fog: fogTeam == null ? -1 : fogTeam, hash: wantHash ? 1 : 0 }); orders = []; return 1; },
    pending: function () { return pending; },
    // next finished step: its JSON (events, teams, clock) or '' when none arrived; entBuf/projBuf then belong to it
    poll: function () { if (!Q.length) return ''; cur = Q.shift(); return cur.js; },
    entBuf: function () { return new Uint8Array(cur ? cur.ent : 0); },
    projBuf: function () { return new Uint8Array(cur ? cur.proj : 0); },
    lines: function () { return lines; },
    fog: function () { return new Uint8Array(fog || 0); },
    hash: function () { return hash; },
    validSpot: function (t, k, x, y) { return ask('valid', [t, k, Math.round(x / 8) * 8, Math.round(y / 8) * 8], 0); },
    reqMet: function (t, k) { var b = st0 >> 5, v = ask('req', [t, k, b], undefined); if (v !== undefined) reqLast[t + ',' + k] = v; return reqLast[t + ',' + k] || 0; },
    inside: function (id) { return ask('inside', [id, st0 >> 4], '[]'); },
    rangeCmd: function (json) { if (!init) return 0; w.postMessage({ c: 'range', o: json }); return 1; },
    saveSnap: function () { if (init) w.postMessage({ c: 'snap' }); return snap; },
    loadSnap: function (json) { if (!init || !json) return 0; Q = []; w.postMessage({ c: 'load', snap: json }); snap = json; return 1; },
    ev: function (src) { return ask('ev', [src], 'null'); },
    stats: function () { var o = JSON.stringify({ steps: st.steps, bytesPerStep: st.steps ? Math.round(st.bytes / st.steps) : 0, workerMsPerStep: st.steps ? +(st.wms / st.steps).toFixed(3) : 0, mainMsPerStep: st.steps ? +(st.mainMs / st.steps).toFixed(4) : 0 }); st = { steps: 0, bytes: 0, wms: 0, mainMs: 0 }; return o; },
  };
})();
