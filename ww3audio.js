// World War 3 — AAA WebAudio + Streaming Music Engine (godot/web/ww3audio.js)
// Solves all Godot 4.4 single-threaded Web audio issues:
//  - Synchronous DOM user-gesture unlock for both AudioContext and <audio> music decks (never blocked by autoplay policy)
//  - Automatic multi-base fallback (?assets= -> ./ -> ../ -> canonical GitHub Pages) with real MP3 header validation
//  - Hardware-accelerated WebAudio decoding + exact slice playback (offset/duration) with 50ms soft-edge fades
//  - AAA master bus chain: Limiter <- Battle Compressor <- Sfx (Close/Mid/Far LPF + subtle battlefield hall reverb) + Voice presence EQ & auto-ducking
//  - Procedural Hollywood audio layers (sub-bass shockwave, VHF radio squelch chirp, warning klaxon, promotion brass, EMP, jet flyby, construction lock, crisp UI tick)
(function () {
  'use strict';
  if (window.WW3Audio) return;

  const SITE = 'https://abdullahhaidar5-ux.github.io/ww3/';
  const AC = window.AudioContext || window.webkitAudioContext;

  let ctx = null;
  let unlocked = false;
  let baseOk = '';
  let cachedBases = null;

  // Buses
  let masterGain, limiter, battleGain, battleComp;
  let sfxGain, sfxMidLPF, sfxFarLPF, sfxRevSend, sfxRevNode;
  let voiceGain, voiceEQ, voiceComp;
  let uiGain;

  // Volumes (0..1) + ducking
  const vol = { master: 1.0, music: 0.7, voices: 1.0, effects: 1.0, announcer: 0.8 };
  let musDuck = 1.0, sfxDuck = 1.0;

  // Buffers: rel -> AudioBuffer | 'loading' | 'fail'
  const bufs = Object.create(null);
  const failAt = Object.create(null);
  const loops = Object.create(null); // key -> { src, gain, target, rel }
  const activeVoice = { vox: null, ann: null, shout: null };
  let sfxActive = 0;
  const SFX_CAP = 32;

  // Procedural buffers (built once when ctx starts)
  const synths = Object.create(null);

  // Dual streaming <audio> decks for soundtrack (no crossOrigin -> never breaks 302 redirects)
  const decks = [new Audio(), new Audio()];
  decks.forEach(a => { a.preload = 'auto'; });
  let curDeck = -1;
  const dg = [0, 0], dto = [0, 0], drt = [0, 0];
  let wantTrack = null; // { rel, fade, bases, idx }

  function getBases() {
    if (baseOk) return [baseOk];
    if (cachedBases) return cachedBases;
    const out = [];
    const add = u => {
      if (!u) return;
      const clean = u.endsWith('/') ? u : u + '/';
      if (!out.includes(clean)) out.push(clean);
    };
    try {
      const href = String(window.location.href || '');
      const cleanHref = href.split('#')[0];
      const qIdx = cleanHref.indexOf('?');
      const page = qIdx >= 0 ? cleanHref.slice(0, qIdx) : cleanHref;
      const search = qIdx >= 0 ? cleanHref.slice(qIdx + 1) : '';
      const own = page.startsWith('http') ? page.slice(0, page.lastIndexOf('/') + 1) : '';
      let parent = '';
      if (own) {
        const trimmed = own.slice(0, -1);
        const cut = trimmed.lastIndexOf('/');
        if (cut > 8) parent = trimmed.slice(0, cut + 1);
      }
      if (search) {
        for (const kv of search.split('&')) {
          if (kv.startsWith('assets=')) {
            const a = decodeURIComponent(kv.slice(7));
            add(a.startsWith('http') ? a : own + a.replace(/^\.\//, ''));
          }
        }
      }
      if (own) add(own);
      if (parent) {
        add(parent);
        add(parent + 'godot/');
      }
    } catch (_) {}
    add(SITE);
    cachedBases = out;
    return out;
  }

  function isValidMp3(ab) {
    if (!ab || ab.byteLength < 256) return false;
    const b = new Uint8Array(ab, 0, Math.min(32, ab.byteLength));
    // Reject HTML/JSON/text responses
    if (b[0] === 0x3C) return false; // '<' (<!DOCTYPE or <html>)
    // Check ID3 tag ("ID3")
    if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true;
    // Check MPEG frame sync (0xFF followed by 0xE0 mask) in first 32 bytes
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i] === 0xFF && (b[i + 1] & 0xE0) === 0xE0) return true;
    }
    return false;
  }

  function initCtx() {
    if (ctx || !AC) return;
    ctx = new AC();

    masterGain = ctx.createGain();
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.2;
    limiter.knee.value = 3.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    // Battle sub-bus
    battleGain = ctx.createGain();
    battleGain.gain.value = 0.74;
    battleComp = ctx.createDynamicsCompressor();
    battleComp.threshold.value = -16.0;
    battleComp.knee.value = 8.0;
    battleComp.ratio.value = 4.5;
    battleComp.attack.value = 0.004;
    battleComp.release.value = 0.22;
    battleGain.connect(battleComp);
    battleComp.connect(masterGain);

    // SFX Close / Mid / Far + subtle outdoor slapback/hall reverb
    sfxGain = ctx.createGain();
    sfxGain.connect(battleGain);

    sfxMidLPF = ctx.createBiquadFilter();
    sfxMidLPF.type = 'lowpass';
    sfxMidLPF.frequency.value = 4200;
    sfxMidLPF.connect(sfxGain);

    sfxFarLPF = ctx.createBiquadFilter();
    sfxFarLPF.type = 'lowpass';
    sfxFarLPF.frequency.value = 1450;
    sfxFarLPF.connect(sfxGain);

    // Short procedural outdoor battlefield reverb impulse (0.9s warm air decay)
    try {
      const len = Math.floor(ctx.sampleRate * 0.9);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8);
          lp += 0.22 * (n - lp);
          d[i] = lp * 0.45;
        }
      }
      sfxRevNode = ctx.createConvolver();
      sfxRevNode.buffer = ir;
      sfxRevSend = ctx.createGain();
      sfxRevSend.gain.value = 0.14;
      sfxGain.connect(sfxRevSend);
      sfxRevSend.connect(sfxRevNode);
      sfxRevNode.connect(battleGain);
    } catch (_) {}

    // Voice bus (presence EQ + crisp radio compressor -> Master directly)
    voiceGain = ctx.createGain();
    voiceEQ = ctx.createBiquadFilter();
    voiceEQ.type = 'peaking';
    voiceEQ.frequency.value = 2500;
    voiceEQ.Q.value = 1.1;
    voiceEQ.gain.value = 3.0;
    voiceComp = ctx.createDynamicsCompressor();
    voiceComp.threshold.value = -14.0;
    voiceComp.ratio.value = 3.5;
    voiceComp.attack.value = 0.003;
    voiceComp.release.value = 0.12;
    voiceGain.connect(voiceEQ);
    voiceEQ.connect(voiceComp);
    voiceComp.connect(masterGain);

    // UI bus -> Master directly
    uiGain = ctx.createGain();
    uiGain.connect(masterGain);

    buildSynths();
    applyVol();
  }

  function makeBuf(dur, fn) {
    const sr = ctx.sampleRate;
    const n = Math.max(1, Math.floor(sr * dur));
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    fn(d, n, sr);
    return buf;
  }

  function buildSynths() {
    // 1. Crisp military UI tick
    synths.tick = makeBuf(0.045, (d, n, sr) => {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        ph += Math.PI * 2 * (540 + (330 - 540) * k) / sr;
        d[i] = (Math.sin(ph) * 0.09 + (Math.random() * 2 - 1) * 0.02 * (1 - k)) * (1 - k);
      }
    });
    // 2. Concussive sub-bass artillery/explosion punch (56Hz -> 24Hz + shockwave crack)
    synths.sub = makeBuf(0.78, (d, n, sr) => {
      let ph = 0, lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = 24 + 32 * Math.exp(-t * 6.5);
        ph += Math.PI * 2 * f / sr;
        const atk = Math.min(1, t / 0.005);
        const tail = Math.min(1, (0.78 - t) / 0.03);
        const body = Math.sin(ph) * Math.exp(-t * 4.0) * 0.85;
        const ns = Math.random() * 2 - 1;
        lp += 0.09 * (ns - lp);
        lp2 += 0.025 * (lp - lp2);
        const shock = lp * Math.exp(-t * 14.0) * 0.90;
        const rumble = lp2 * Math.exp(-t * 3.0) * 0.55;
        d[i] = Math.tanh((body + shock + rumble) * 1.45) * 0.88 * atk * tail;
      }
    });
    // 3. Military VHF radio PTT squelch chirp
    synths.chirp = makeBuf(0.045, (d, n, sr) => {
      let ph = 0, lo = 0, hi = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, k = i / n;
        ph += Math.PI * 2 * (1850 + 350 * Math.min(1, k * 1.45)) / sr;
        const ns = Math.random() * 2 - 1;
        lo += 0.35 * (ns - lo); hi += 0.09 * (ns - hi);
        const bp = lo - hi;
        const toneEnv = t < 0.028 ? Math.sin(Math.PI * Math.min(1, t / 0.028)) : 0;
        const sqEnv = Math.exp(-k * 3.2) * Math.min(1, (1 - k) * 6);
        d[i] = Math.sin(ph) * 0.14 * toneEnv + bp * 0.30 * sqEnv;
      }
    });
    // 4. Urgent 2-pulse tactical warning klaxon
    synths.klaxon = makeBuf(0.65, (d, n, sr) => {
      let ph1 = 0, ph2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let env = 0;
        if (t < 0.27) env = Math.min(1, t / 0.014) * Math.min(1, (0.27 - t) / 0.028);
        else if (t >= 0.33 && t < 0.63) {
          const lt = t - 0.33;
          env = Math.min(1, lt / 0.014) * Math.min(1, (0.30 - lt) / 0.032);
        }
        const bend = 1 - 0.025 * Math.exp(-(t % 0.33) * 28);
        ph1 += Math.PI * 2 * 520 * bend / sr;
        ph2 += Math.PI * 2 * 780 * bend / sr;
        d[i] = Math.tanh((Math.sin(ph1) * 0.55 + Math.sin(ph2) * 0.38 + Math.sin(ph1 * 2) * 0.14) * 1.5) * 0.55 * env;
      }
    });
    // 5. Promotion brass triad sting
    synths.promo = makeBuf(0.48, (d, n, sr) => {
      const notes = [[0.0, 0.14, 440], [0.11, 0.15, 554.37], [0.22, 0.26, 659.25]];
      const phs = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const t = i / sr; let acc = 0;
        for (let j = 0; j < 3; j++) {
          const [t0, nd, fq] = notes[j];
          if (t >= t0 && t < t0 + nd) {
            const lt = t - t0;
            phs[j] += Math.PI * 2 * fq / sr;
            const a = Math.min(1, lt / 0.009);
            const r = Math.min(1, (nd - lt) / (j === 2 ? 0.09 : 0.035));
            const dec = Math.exp(-lt * (j === 2 ? 3.2 : 4.5));
            const p = phs[j];
            acc += (Math.sin(p) * 0.62 + Math.sin(p * 2) * 0.28 + Math.sin(p * 3) * 0.13) * a * r * dec;
          }
        }
        d[i] = Math.tanh(acc * 1.1) * 0.62;
      }
    });
    // 6. EMP sweep
    synths.emp = makeBuf(0.65, (d, n, sr) => {
      let ph = 0, prevNs = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (95 + 1305 * Math.exp(-t * 5.8)) / sr;
        const atk = Math.min(1, t / 0.005);
        const rel = Math.min(1, Math.max(0, (0.65 - t) / 0.04));
        const env = Math.exp(-t * 2.8) * atk * rel;
        const ns = Math.random() * 2 - 1;
        const hp = ns - prevNs; prevNs = ns;
        const spark = (Math.random() < 0.09 ? hp * 0.55 : hp * 0.08) * Math.exp(-t * 4.8);
        const snap = hp * Math.exp(-t * 45) * 0.65;
        d[i] = Math.tanh((Math.sin(ph) * (0.72 + 0.28 * Math.sin(ph * 0.5)) * env * 0.68 + spark + snap) * 1.25) * 0.78 * rel;
      }
    });
    // 7. Jet flyover roar
    synths.jet = makeBuf(0.95, (d, n, sr) => {
      let phL = 0, phW = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        const env = Math.pow(Math.sin(Math.PI * Math.pow(k, 0.82)), 1.35);
        phL += Math.PI * 2 * (155 - 83 * k) / sr;
        phW += Math.PI * 2 * (720 - 410 * k) / sr;
        const ns = Math.random() * 2 - 1;
        lp += (0.26 - 0.19 * k) * (ns - lp);
        d[i] = Math.tanh((lp * 0.9 + Math.sin(phL) * 0.22 + Math.sin(phW) * 0.07) * 1.3) * 0.72 * env;
      }
    });
    // 8. Construction complete metallic lock chime
    synths.built = makeBuf(0.24, (d, n, sr) => {
      let p1 = 0, p2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr; let acc = 0;
        if (t < 0.11) {
          p1 += Math.PI * 2 * 660 / sr;
          acc += (Math.sin(p1) * 0.65 + Math.sin(p1 * 1.5) * 0.35) * Math.min(1, t / 0.004) * Math.exp(-t * 28);
        }
        if (t >= 0.075) {
          const lt = t - 0.075;
          p2 += Math.PI * 2 * 880 / sr;
          acc += (Math.sin(p2) * 0.65 + Math.sin(p2 * 1.5) * 0.30) * Math.min(1, lt / 0.004) * Math.exp(-lt * 19) * Math.min(1, (0.24 - t) / 0.02);
        }
        d[i] = Math.max(-1, Math.min(1, acc * 0.42));
      }
    });
  }

  function applyVol() {
    if (ctx && masterGain) {
      const now = ctx.currentTime;
      masterGain.gain.setTargetAtTime(vol.master, now, 0.02);
      sfxGain.gain.setTargetAtTime(vol.effects * sfxDuck, now, 0.03);
      voiceGain.gain.setTargetAtTime(0.95, now, 0.02);
      uiGain.gain.setTargetAtTime(Math.min(1.0, vol.effects), now, 0.02);
    }
    const mVol = Math.max(0, Math.min(1, 0.19 * (vol.music / 0.70) * musDuck * 2.6 * 0.68 * vol.master));
    for (let i = 0; i < 2; i++) {
      try { decks[i].volume = Math.max(0, Math.min(1, dg[i] * mVol)); } catch (_) {}
    }
  }

  // Smooth 50ms crossfade ticker for streaming music decks
  setInterval(() => {
    const mVol = Math.max(0, Math.min(1, 0.19 * (vol.music / 0.70) * musDuck * 2.6 * 0.68 * vol.master));
    for (let i = 0; i < 2; i++) {
      if (dg[i] !== dto[i]) {
        const s = drt[i] * 0.05;
        dg[i] = dg[i] < dto[i] ? Math.min(dto[i], dg[i] + s) : Math.max(dto[i], dg[i] - s);
        if (dg[i] <= 0 && dto[i] === 0) {
          try { decks[i].pause(); } catch (_) {}
        }
      }
      try { decks[i].volume = Math.max(0, Math.min(1, dg[i] * mVol)); } catch (_) {}
    }
  }, 50);

  function startDeckWithFallback(deckIdx, rel, fade, bases, bIdx) {
    if (bIdx >= bases.length) return;
    const a = decks[deckIdx];
    const url = bases[bIdx] + rel;
    a.onerror = () => {
      if (deckIdx === curDeck && bIdx + 1 < bases.length) {
        startDeckWithFallback(deckIdx, rel, fade, bases, bIdx + 1);
      }
    };
    a.oncanplay = () => {
      if (!baseOk) baseOk = bases[bIdx];
    };
    a.src = url;
    a.volume = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  function unlockGesture() {
    initCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!unlocked) {
      unlocked = true;
      // Immediately start queued music inside the real DOM user gesture!
      if (wantTrack) {
        const w = wantTrack;
        wantTrack = null;
        api.playMusic(w.rel, w.fade);
      }
    } else if (curDeck >= 0 && dto[curDeck] > 0 && decks[curDeck].paused) {
      const p = decks[curDeck].play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(ev => {
    window.addEventListener(ev, unlockGesture, { capture: true, passive: true });
  });

  function loadBuf(rel) {
    const cur = bufs[rel];
    if (cur instanceof AudioBuffer) return Promise.resolve(cur);
    if (cur === 'loading') return Promise.resolve(null);
    if (cur === 'fail' && (performance.now() - (failAt[rel] || 0)) < 25000) return Promise.resolve(null);
    bufs[rel] = 'loading';
    initCtx();
    const bases = getBases();
    const tryOne = idx => {
      if (idx >= bases.length) {
        bufs[rel] = 'fail';
        failAt[rel] = performance.now();
        return Promise.resolve(null);
      }
      const b = bases[idx];
      return fetch(b + rel, { mode: 'cors' })
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + r.status))))
        .then(ab => {
          if (!isValidMp3(ab)) return Promise.reject(new Error('Not MP3'));
          baseOk = b;
          if (!ctx) return null;
          return ctx.decodeAudioData(ab.slice(0));
        })
        .then(decoded => {
          if (decoded) {
            bufs[rel] = decoded;
            return decoded;
          }
          return tryOne(idx + 1);
        })
        .catch(() => tryOne(idx + 1));
    };
    return tryOne(0);
  }

  function playSlice(rel, off, dur, gainLin, rate, pan, busName, slotName) {
    if (!unlocked || !ctx) return false;
    const buf = bufs[rel];
    if (!(buf instanceof AudioBuffer)) {
      loadBuf(rel);
      return false;
    }
    if (busName.startsWith('Sfx') && sfxActive >= SFX_CAP) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const r = Math.max(0.15, rate || 1.0);
    src.playbackRate.value = r;

    const g = ctx.createGain();
    const now = ctx.currentTime;
    const playDur = Math.max(0.03, Math.min(dur / r, Math.max(0.05, (buf.duration - off) / r)));
    const lv = Math.max(0.0001, gainLin);
    g.gain.setValueAtTime(lv, now);
    if (playDur > 0.06) {
      g.gain.setValueAtTime(lv, now + playDur - 0.045);
      g.gain.linearRampToValueAtTime(0.0001, now + playDur);
    }

    let dest = sfxGain;
    if (busName === 'SfxMid') dest = sfxMidLPF;
    else if (busName === 'SfxFar') dest = sfxFarLPF;
    else if (busName === 'Voice') dest = voiceGain;
    else if (busName === 'UI') dest = uiGain;

    if (typeof pan === 'number' && Math.abs(pan) > 0.01 && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-0.95, Math.min(0.95, pan));
      src.connect(g);
      g.connect(pn);
      pn.connect(dest);
    } else {
      src.connect(g);
      g.connect(dest);
    }

    if (slotName && activeVoice[slotName]) {
      try { activeVoice[slotName].stop(); } catch (_) {}
      activeVoice[slotName] = null;
    }
    if (slotName) activeVoice[slotName] = src;

    if (busName.startsWith('Sfx')) {
      sfxActive++;
      src.onended = () => { sfxActive = Math.max(0, sfxActive - 1); };
    } else if (slotName) {
      src.onended = () => { if (activeVoice[slotName] === src) activeVoice[slotName] = null; };
    }

    try {
      src.start(now, Math.max(0, off), Math.max(0.03, dur));
      return true;
    } catch (_) {
      if (busName.startsWith('Sfx')) sfxActive = Math.max(0, sfxActive - 1);
      return false;
    }
  }

  function playSynth(name, gainLin, rate, pan, busName) {
    if (!unlocked || !ctx) return;
    const buf = synths[name];
    if (!buf) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.max(0.2, rate || 1.0);
    const g = ctx.createGain();
    g.gain.value = Math.max(0.0001, gainLin || 0.7);
    let dest = sfxGain;
    if (busName === 'SfxMid') dest = sfxMidLPF;
    else if (busName === 'SfxFar') dest = sfxFarLPF;
    else if (busName === 'Voice') dest = voiceGain;
    else if (busName === 'UI') dest = uiGain;
    if (typeof pan === 'number' && Math.abs(pan) > 0.01 && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-0.95, Math.min(0.95, pan));
      src.connect(g); g.connect(pn); pn.connect(dest);
    } else {
      src.connect(g); g.connect(dest);
    }
    try { src.start(ctx.currentTime); } catch (_) {}
  }

  function setLoop(key, rel, gainLin) {
    if (!unlocked || !ctx) return;
    let L = loops[key];
    if (!L) {
      if (gainLin < 0.01) return;
      const buf = bufs[rel];
      if (!(buf instanceof AudioBuffer)) { loadBuf(rel); return; }
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.connect(sfxGain);
      L = { src: null, gain: g, gVal: 0, rel };
      loops[key] = L;
    }
    L.gVal += (gainLin - L.gVal) * 0.25;
    if (L.gVal < 0.004) {
      if (L.src) { try { L.src.stop(); } catch (_) {} L.src = null; }
      return;
    }
    if (!L.src) {
      const buf = bufs[rel];
      if (!(buf instanceof AudioBuffer)) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(L.gain);
      try { src.start(ctx.currentTime, Math.random() * Math.min(2.0, buf.duration * 0.5)); } catch (_) {}
      L.src = src;
    }
    L.gain.gain.setTargetAtTime(L.gVal, ctx.currentTime, 0.05);
  }

  function stopLoops() {
    for (const k of Object.keys(loops)) {
      const L = loops[k];
      if (L && L.src) { try { L.src.stop(); } catch (_) {} L.src = null; }
      if (L) L.gVal = 0;
    }
  }

  const api = {
    isUnlocked: () => unlocked,
    preload: rel => { loadBuf(rel); },
    has: rel => bufs[rel] instanceof AudioBuffer,
    playSlice,
    playSynth,
    setLoop,
    stopLoops,
    setVol: (master, music, voices, effects, announcer, mk, sk) => {
      vol.master = master; vol.music = music; vol.voices = voices;
      vol.effects = effects; vol.announcer = announcer;
      musDuck = mk; sfxDuck = sk;
      applyVol();
    },
    playMusic: (rel, fade) => {
      const bases = getBases();
      if (!unlocked) {
        wantTrack = { rel, fade };
        return;
      }
      const old = curDeck;
      curDeck = curDeck === 0 ? 1 : 0;
      dg[curDeck] = 0; dto[curDeck] = 1; drt[curDeck] = 1 / Math.max(0.05, fade || 2.5);
      startDeckWithFallback(curDeck, rel, fade, bases, 0);
      if (old >= 0) {
        dto[old] = 0;
        drt[old] = Math.max(0.01, dg[old]) / Math.max(0.05, fade || 2.5);
      }
    },
    stopMusic: fade => {
      wantTrack = null;
      const f = Math.max(0.05, fade || 0.5);
      for (let i = 0; i < 2; i++) {
        dto[i] = 0;
        drt[i] = Math.max(0.01, dg[i]) / f;
      }
    },
    musicLeft: () => {
      if (curDeck < 0) return -1;
      const a = decks[curDeck];
      if (a.ended) return 0;
      if (!isFinite(a.duration) || !(a.duration > 0)) return 999;
      return a.duration - a.currentTime;
    },
    status: () => ({
      unlocked,
      ctxState: ctx ? ctx.state : 'none',
      base: baseOk,
      bases: getBases(),
      loaded: Object.values(bufs).filter(v => v instanceof AudioBuffer).length,
      sfxActive,
      music: curDeck >= 0 ? decks[curDeck].src : ''
    })
  };

  window.WW3Audio = api;
})();
