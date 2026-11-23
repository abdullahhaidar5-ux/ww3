// World War 3 — $75 AAA WebAudio + Streaming & Faction-Themed Epic Score Engine (godot/web/ww3audio.js)
// Solves all browser audio issues AND delivers a rich, original, copyright-safe faction-aware orchestral score:
//  - Synchronous DOM user-gesture unlock (pointerdown/touchstart/touchend/mousedown/click/keydown) + iOS silent-buffer prime
//  - Pre-queues soundtrack before first gesture so the very first tap starts music immediately inside the gesture
//  - Automatic WebAudio fetch+decodeAudioData fallback if HTML5 <audio> ever fails or stalls
//  - Real-time Faction-Themed Cinematic Score Engine routed through a lush 2.4s Concert Hall / Canyon Reverb:
//      * Shia / Axis (IR, RS, DW, RV, OB): Solemn D-Hijaz (Phrygian Dominant) deep cello/viola strings,
//        pounding daf/taiko war-drum cadence, and emotional minor-key brass/ney heroic phrases
//      * West / NATO (US, GB, FR, DE, IL, UA): Driving C-minor tactical string ostinato, crisp snare/timpani, heroic horns
//      * East (RU, CN, KP): Heavy E-minor armored-column low brass chords & industrial war percussion
//      * Regional (TR, PK, IN, JP, KR, SA, AE, EG): Dramatic A-Phrygian strings, low brass & percussion
//  - Auto-swells during combat heat & seamlessly leads at full volume if external MP3 streaming is unavailable
(function () {
  'use strict';
  if (window.WW3Audio) return;

  const SITE = 'https://abdullahhaidar5-ux.github.io/ww3/';
  const AC = window.AudioContext || window.webkitAudioContext;

  let ctx = null;
  let unlocked = false;
  let baseOk = '';
  let cachedBases = null;
  let lastErr = '';

  // Buses
  let masterGain, limiter, battleGain, battleComp;
  let sfxGain, sfxMidLPF, sfxFarLPF, sfxRevSend, sfxRevNode;
  let voiceGain, voiceEQ, voiceComp;
  let musicGain, musicLowShelf, musicHighShelf, scoreBus, scoreRev, scoreRevSend;
  let uiGain;

  // Volumes (0..1) + ducking + battle state
  const vol = { master: 1.0, music: 0.78, voices: 1.0, effects: 1.0, announcer: 0.85 };
  let musDuck = 1.0, sfxDuck = 1.0;
  let battleHeat = 0.0;
  let inBattle = false;
  let curFac = 'IR';

  // Buffers: rel -> AudioBuffer | 'loading' | 'fail'
  const bufs = Object.create(null);
  const failAt = Object.create(null);
  const loops = Object.create(null);
  const activeVoice = { vox: null, ann: null, shout: null };
  let sfxActive = 0;
  const SFX_CAP = 36;

  // Procedural buffers
  const synths = Object.create(null);

  // Dual streaming <audio> decks for soundtrack (no crossOrigin -> never breaks 302 redirects)
  const decks = [new Audio(), new Audio()];
  decks.forEach(a => {
    a.preload = 'auto';
    a.playsInline = true;
    a.setAttribute('playsinline', '');
  });
  let curDeck = -1;
  const dg = [0, 0], dto = [0, 0], drt = [0, 0];
  const deckRel = ['', ''];
  let waMusSrc = null, waMusGain = null, waMusRel = '', waMusStart = 0, waMusDur = 0;
  let wantTrack = { rel: 'mus/st/menu-02.mp3', fade: 1.6 };
  let prewarmedSfx = false;

  // Faction musical style mapping
  const AXIS_FACS = new Set(['IR', 'RS', 'DW', 'RV', 'OB']);
  const WEST_FACS = new Set(['US', 'GB', 'FR', 'DE', 'IL', 'UA']);
  const EAST_FACS = new Set(['RU', 'CN', 'KP']);
  function factionStyle(fac) {
    if (AXIS_FACS.has(fac)) return 'axis';
    if (WEST_FACS.has(fac)) return 'west';
    if (EAST_FACS.has(fac)) return 'east';
    return 'regional';
  }

  // Original musical themes (frequencies in Hz, rich minor / Hijaz / Phrygian palettes)
  const THEMES = {
    // D Hijaz (D, Eb, F#, G, A, Bb, C, D) — solemn, deeply emotional, noble Middle-Eastern gravitas
    axis: {
      stepSec: 0.24,
      chords: [
        [73.42, 110.00, 146.83, 185.00], // D2, A2, D3, F#3 (D Hijaz tonic)
        [77.78, 116.54, 155.56, 196.00], // Eb2, Bb2, Eb3, G3 (dramatic bII tension!)
        [73.42, 110.00, 146.83, 185.00], // D Hijaz home
        [65.41, 98.00, 130.81, 155.56],  // C2, G2, C3, Eb3 (solemn bVII minor)
      ],
      melody: [
        293.66, 0, 311.13, 369.99, 392.00, 0, 369.99, 311.13,
        293.66, 0, 0, 261.63, 293.66, 0, 0, 0,
        440.00, 0, 466.16, 440.00, 392.00, 369.99, 311.13, 0,
        369.99, 311.13, 293.66, 0, 293.66, 0, 0, 0
      ],
      // Driving solemn chest-beat / daf-taiko rhythm (1 = deep skin boom, 2 = rim/frame accent)
      drums: [1.0, 0, 0, 0.55, 0.95, 0, 0.50, 0.25, 1.0, 0, 0.35, 0.55, 0.95, 0, 0.70, 0.30],
      rims:  [0, 0, 0.5, 0, 0, 0.45, 0, 0.65, 0, 0, 0.55, 0, 0, 0.5, 0, 0.75]
    },
    // C Minor / Dorian — NATO heroic brass & driving tactical strings
    west: {
      stepSec: 0.22,
      chords: [
        [65.41, 98.00, 130.81, 155.56], // Cm
        [58.27, 87.31, 116.54, 146.83], // Bb
        [51.91, 77.78, 103.83, 130.81], // Ab
        [65.41, 98.00, 130.81, 146.83], // Csus2
      ],
      melody: [
        261.63, 0, 311.13, 392.00, 0, 349.23, 311.13, 293.66,
        261.63, 0, 0, 196.00, 261.63, 0, 0, 0,
        392.00, 0, 466.16, 440.00, 392.00, 0, 349.23, 311.13,
        293.66, 311.13, 261.63, 0, 0, 0, 0, 0
      ],
      drums: [1.0, 0, 0.4, 0, 0.85, 0, 0.45, 0.3, 1.0, 0, 0.4, 0.3, 0.9, 0.4, 0.6, 0],
      rims:  [0, 0.3, 0, 0.5, 0, 0.3, 0.6, 0, 0, 0.3, 0, 0.5, 0, 0.4, 0.6, 0.4]
    },
    // E Minor — Heavy armored-column martial low brass & industrial percussion
    east: {
      stepSec: 0.25,
      chords: [
        [82.41, 123.47, 164.81, 196.00], // Em
        [65.41, 98.00, 130.81, 164.81],  // C
        [73.42, 110.00, 146.83, 185.00], // D
        [61.74, 92.50, 123.47, 155.56],  // B
      ],
      melody: [
        329.63, 0, 329.63, 392.00, 493.88, 0, 440.00, 392.00,
        369.99, 0, 329.63, 0, 293.66, 0, 0, 0,
        329.63, 392.00, 493.88, 0, 523.25, 493.88, 440.00, 0,
        392.00, 369.99, 329.63, 0, 0, 0, 0, 0
      ],
      drums: [1.0, 0, 0, 0, 0.95, 0, 0.4, 0, 1.0, 0, 0.5, 0, 0.95, 0.5, 0.7, 0.4],
      rims:  [0, 0, 0.6, 0, 0, 0, 0.6, 0, 0, 0, 0.7, 0, 0, 0, 0.8, 0]
    },
    // A Phrygian — Dramatic theater score
    regional: {
      stepSec: 0.24,
      chords: [
        [55.00, 82.41, 110.00, 130.81], // Am
        [58.27, 87.31, 116.54, 146.83], // Bb (Phrygian bII)
        [65.41, 98.00, 130.81, 164.81], // C
        [55.00, 82.41, 110.00, 130.81], // Am
      ],
      melody: [
        220.00, 0, 233.08, 261.63, 329.63, 0, 293.66, 261.63,
        233.08, 0, 220.00, 0, 196.00, 0, 0, 0,
        329.63, 0, 349.23, 329.63, 293.66, 261.63, 233.08, 0,
        261.63, 233.08, 220.00, 0, 0, 0, 0, 0
      ],
      drums: [1.0, 0, 0, 0.5, 0.9, 0, 0.5, 0, 1.0, 0, 0.4, 0.5, 0.9, 0, 0.65, 0],
      rims:  [0, 0, 0.45, 0, 0, 0.4, 0, 0.6, 0, 0, 0.5, 0, 0, 0.45, 0, 0.65]
    }
  };

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
    if (b[0] === 0x3C) return false;
    if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true;
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i] === 0xFF && (b[i + 1] & 0xE0) === 0xE0) return true;
    }
    return false;
  }

  function isMp3MusicActivelyPlaying() {
    if (waMusSrc) return true;
    if (curDeck >= 0 && dto[curDeck] > 0 && !decks[curDeck].paused && decks[curDeck].currentTime > 0.2) return true;
    return false;
  }

  function musicMasterVol() {
    return Math.max(0, Math.min(0.95, 0.58 * (vol.music / 0.70) * musDuck * vol.master));
  }

  function initCtx() {
    if (ctx || !AC) return;
    try {
      ctx = new AC();
    } catch (e) {
      lastErr = 'AC:' + (e && e.message ? e.message : String(e));
      return;
    }

    masterGain = ctx.createGain();
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.0;
    limiter.knee.value = 3.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.075;
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    // Cinematic Music Bus (+warm bass shelf & crisp orchestral air)
    musicGain = ctx.createGain();
    musicLowShelf = ctx.createBiquadFilter();
    musicLowShelf.type = 'lowshelf';
    musicLowShelf.frequency.value = 95;
    musicLowShelf.gain.value = 3.8;
    musicHighShelf = ctx.createBiquadFilter();
    musicHighShelf.type = 'highshelf';
    musicHighShelf.frequency.value = 6500;
    musicHighShelf.gain.value = 2.0;
    musicGain.connect(musicLowShelf);
    musicLowShelf.connect(musicHighShelf);
    musicHighShelf.connect(masterGain);

    // Faction Score Bus + Lush 2.4s Concert Hall / Cathedral Reverb (makes strings & brass sound HUGE & cinematic)
    scoreBus = ctx.createGain();
    scoreBus.gain.value = 0.65;
    scoreBus.connect(musicGain);
    try {
      const rLen = Math.floor(ctx.sampleRate * 2.4);
      const rIr = ctx.createBuffer(2, rLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = rIr.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < rLen; i++) {
          const t = i / rLen;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
          lp += 0.14 * (n - lp);
          d[i] = lp * 0.52;
        }
      }
      scoreRev = ctx.createConvolver();
      scoreRev.buffer = rIr;
      scoreRevSend = ctx.createGain();
      scoreRevSend.gain.value = 0.42;
      scoreBus.connect(scoreRevSend);
      scoreRevSend.connect(scoreRev);
      scoreRev.connect(musicGain);
    } catch (_) {}

    // Battle sub-bus
    battleGain = ctx.createGain();
    battleGain.gain.value = 0.80;
    battleComp = ctx.createDynamicsCompressor();
    battleComp.threshold.value = -15.0;
    battleComp.knee.value = 8.0;
    battleComp.ratio.value = 4.2;
    battleComp.attack.value = 0.003;
    battleComp.release.value = 0.20;
    battleGain.connect(battleComp);
    battleComp.connect(masterGain);

    // SFX Close / Mid / Far + canyon reverb
    sfxGain = ctx.createGain();
    sfxGain.connect(battleGain);

    sfxMidLPF = ctx.createBiquadFilter();
    sfxMidLPF.type = 'lowpass';
    sfxMidLPF.frequency.value = 4400;
    sfxMidLPF.connect(sfxGain);

    sfxFarLPF = ctx.createBiquadFilter();
    sfxFarLPF.type = 'lowpass';
    sfxFarLPF.frequency.value = 1400;
    sfxFarLPF.connect(sfxGain);

    try {
      const len = Math.floor(ctx.sampleRate * 1.15);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
          lp += 0.20 * (n - lp);
          d[i] = lp * 0.48;
        }
      }
      sfxRevNode = ctx.createConvolver();
      sfxRevNode.buffer = ir;
      sfxRevSend = ctx.createGain();
      sfxRevSend.gain.value = 0.17;
      sfxGain.connect(sfxRevSend);
      sfxRevSend.connect(sfxRevNode);
      sfxRevNode.connect(battleGain);
    } catch (_) {}

    // Voice bus
    voiceGain = ctx.createGain();
    voiceEQ = ctx.createBiquadFilter();
    voiceEQ.type = 'peaking';
    voiceEQ.frequency.value = 2500;
    voiceEQ.Q.value = 1.1;
    voiceEQ.gain.value = 3.2;
    voiceComp = ctx.createDynamicsCompressor();
    voiceComp.threshold.value = -13.5;
    voiceComp.ratio.value = 3.5;
    voiceComp.attack.value = 0.003;
    voiceComp.release.value = 0.12;
    voiceGain.connect(voiceEQ);
    voiceEQ.connect(voiceComp);
    voiceComp.connect(masterGain);

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
    synths.tick = makeBuf(0.045, (d, n, sr) => {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        ph += Math.PI * 2 * (560 + (340 - 560) * k) / sr;
        d[i] = (Math.sin(ph) * 0.12 + (Math.random() * 2 - 1) * 0.025 * (1 - k)) * (1 - k);
      }
    });
    // Seismic sub-bass shockwave (artillery / tanks / nukes)
    synths.sub = makeBuf(0.95, (d, n, sr) => {
      let ph = 0, lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = 24 + 40 * Math.exp(-t * 6.2);
        ph += Math.PI * 2 * f / sr;
        const atk = Math.min(1, t / 0.004);
        const tail = Math.min(1, (0.95 - t) / 0.04);
        const body = Math.sin(ph) * Math.exp(-t * 3.4) * 0.92;
        const ns = Math.random() * 2 - 1;
        lp += 0.11 * (ns - lp);
        lp2 += 0.022 * (lp - lp2);
        const shock = lp * Math.exp(-t * 13.0) * 0.95;
        const rumble = lp2 * Math.exp(-t * 2.5) * 0.65;
        d[i] = Math.tanh((body + shock + rumble) * 1.55) * 0.92 * atk * tail;
      }
    });
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
        d[i] = Math.tanh((Math.sin(ph1) * 0.55 + Math.sin(ph2) * 0.38 + Math.sin(ph1 * 2) * 0.14) * 1.5) * 0.58 * env;
      }
    });
    synths.promo = makeBuf(0.50, (d, n, sr) => {
      const notes = [[0.0, 0.14, 440], [0.11, 0.15, 554.37], [0.22, 0.28, 659.25]];
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
            const dec = Math.exp(-lt * (j === 2 ? 3.0 : 4.2));
            const p = phs[j];
            acc += (Math.sin(p) * 0.62 + Math.sin(p * 2) * 0.28 + Math.sin(p * 3) * 0.14) * a * r * dec;
          }
        }
        d[i] = Math.tanh(acc * 1.15) * 0.68;
      }
    });
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
    synths.jet = makeBuf(0.95, (d, n, sr) => {
      let phL = 0, phW = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        const env = Math.pow(Math.sin(Math.PI * Math.pow(k, 0.82)), 1.35);
        phL += Math.PI * 2 * (155 - 83 * k) / sr;
        phW += Math.PI * 2 * (720 - 410 * k) / sr;
        const ns = Math.random() * 2 - 1;
        lp += (0.26 - 0.19 * k) * (ns - lp);
        d[i] = Math.tanh((lp * 0.9 + Math.sin(phL) * 0.22 + Math.sin(phW) * 0.07) * 1.3) * 0.75 * env;
      }
    });
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
        d[i] = Math.max(-1, Math.min(1, acc * 0.48));
      }
    });
    // Solemn Battle-Start Cinematic Brass & War-Drum Fanfare (2.9s: D-Hijaz / minor-key thunder + brass swell)
    synths.fanfare = makeBuf(2.9, (d, n, sr) => {
      const freqs = [73.42, 110.0, 146.83, 185.00, 220.0, 293.66];
      const amps = [0.40, 0.32, 0.28, 0.22, 0.16, 0.12];
      const phs = [0, 0, 0, 0, 0, 0];
      let dph1 = 0, dph2 = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let horn = 0;
        const hEnv = Math.min(1, Math.max(0, (t - 0.05) / 0.60)) * Math.exp(-Math.max(0, t - 0.85) * 1.05) * Math.min(1, (2.9 - t) / 0.28);
        for (let j = 0; j < freqs.length; j++) {
          const vib = 1 + 0.0035 * Math.sin(t * 5.0 + j);
          phs[j] += Math.PI * 2 * freqs[j] * vib / sr;
          const p = phs[j];
          horn += (Math.sin(p) * 0.54 + Math.sin(p * 2) * 0.27 + Math.sin(p * 3) * 0.13 + Math.sin(p * 4) * 0.06) * amps[j];
        }
        let drum = 0;
        const ns = Math.random() * 2 - 1;
        lp += 0.08 * (ns - lp);
        if (t < 0.70) {
          dph1 += Math.PI * 2 * (42 + 48 * Math.exp(-t * 14)) / sr;
          drum += (Math.sin(dph1) * 0.88 + lp * 0.58) * Math.exp(-t * 6.0) * Math.min(1, t / 0.004);
        }
        if (t >= 0.44 && t < 1.35) {
          const lt = t - 0.44;
          dph2 += Math.PI * 2 * (38 + 52 * Math.exp(-lt * 13)) / sr;
          drum += (Math.sin(dph2) * 1.0 + lp * 0.68) * Math.exp(-lt * 4.8) * Math.min(1, lt / 0.004);
        }
        d[i] = Math.tanh((horn * hEnv * 0.88 + drum * 0.82) * 1.25) * 0.82;
      }
    });
    // Deep resonant frame-drum / taiko war drum
    synths.wardrum = makeBuf(0.46, (d, n, sr) => {
      let ph = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (42 + 52 * Math.exp(-t * 15)) / sr;
        const ns = Math.random() * 2 - 1;
        lp += 0.09 * (ns - lp);
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 6.8) * Math.min(1, (0.46 - t) / 0.03);
        d[i] = Math.tanh((Math.sin(ph) * 0.92 + lp * 0.52) * 1.35) * 0.76 * env;
      }
    });
    // Crisp organic daf / frame-drum rim slap
    synths.rim = makeBuf(0.14, (d, n, sr) => {
      let ph = 0, lo = 0, hi = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (280 + 180 * Math.exp(-t * 32)) / sr;
        const ns = Math.random() * 2 - 1;
        lo += 0.35 * (ns - lo); hi += 0.12 * (ns - hi);
        const bp = lo - hi;
        const env = Math.min(1, t / 0.002) * Math.exp(-t * 28);
        d[i] = Math.tanh((Math.sin(ph) * 0.45 + bp * 0.85) * 1.2) * 0.42 * env;
      }
    });
  }

  // ---- Lush Real-Time Orchestral Voice Helpers (Strings Ensemble + Expressive Brass/Ney Solo)
  function playStringChord(freqs, durSec, gainVal) {
    if (!ctx || !scoreBus || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(620, now);
    lpf.frequency.linearRampToValueAtTime(1450, now + durSec * 0.45);
    lpf.frequency.linearRampToValueAtTime(720, now + durSec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + Math.min(0.65, durSec * 0.28));
    g.gain.setValueAtTime(gainVal * 0.92, now + durSec * 0.72);
    g.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.15);
    lpf.connect(g);
    g.connect(scoreBus);
    for (const f of freqs) {
      for (const det of [-5.5, 5.5]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 0.22 / freqs.length;
        osc.connect(og);
        og.connect(lpf);
        osc.start(now);
        osc.stop(now + durSec + 0.18);
      }
    }
  }

  function playLeadMotif(freq, durSec, gainVal, isAxis) {
    if (!ctx || !scoreBus || !freq || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(isAxis ? 950 : 1200, now);
    lpf.frequency.linearRampToValueAtTime(isAxis ? 2100 : 2400, now + durSec * 0.35);
    lpf.frequency.linearRampToValueAtTime(1050, now + durSec);
    lpf.Q.value = isAxis ? 2.2 : 1.3;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.09);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal * 0.65), now + durSec * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.12);

    // Expressive vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = isAxis ? 5.4 : 4.8;
    lfoG.gain.value = freq * 0.011;
    lfo.connect(lfoG);

    const osc1 = ctx.createOscillator();
    osc1.type = isAxis ? 'sawtooth' : 'triangle';
    osc1.frequency.setValueAtTime(freq * (isAxis ? 0.985 : 1.0), now);
    if (isAxis) osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
    lfoG.connect(osc1.frequency);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 0.5; // warm lower horn/cello octave doubling
    const og2 = ctx.createGain();
    og2.gain.value = 0.45;

    osc1.connect(lpf);
    osc2.connect(og2);
    og2.connect(lpf);
    lpf.connect(g);
    g.connect(scoreBus);

    lfo.start(now); osc1.start(now); osc2.start(now);
    const endT = now + durSec + 0.15;
    lfo.stop(endT); osc1.stop(endT); osc2.stop(endT);
  }

  function applyVol() {
    if (ctx && masterGain) {
      const now = ctx.currentTime;
      masterGain.gain.setTargetAtTime(vol.master, now, 0.02);
      sfxGain.gain.setTargetAtTime(vol.effects * sfxDuck, now, 0.03);
      voiceGain.gain.setTargetAtTime(1.0, now, 0.02);
      uiGain.gain.setTargetAtTime(Math.min(1.0, vol.effects), now, 0.02);
      musicGain.gain.setTargetAtTime(musicMasterVol(), now, 0.04);
    }
    const mVol = musicMasterVol();
    for (let i = 0; i < 2; i++) {
      try { decks[i].volume = Math.max(0, Math.min(1, dg[i] * mVol)); } catch (_) {}
    }
  }

  // Smooth 50ms crossfade + Faction-Specific Epic Musical Score Sequencer
  let scoreAccum = 0, scoreStep = 0;
  setInterval(() => {
    const mVol = musicMasterVol();
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

    if (!unlocked || !ctx || ctx.state !== 'running' || vol.music < 0.04 || vol.master < 0.04) return;
    const style = factionStyle(curFac);
    const theme = THEMES[style] || THEMES.axis;
    scoreAccum += 0.05;
    if (scoreAccum < theme.stepSec) return;
    scoreAccum -= theme.stepSec;

    const mp3Alive = isMp3MusicActivelyPlaying();
    // In battle: solemn war-drums + strings + Hijaz/NATO/East brass surge with combat heat;
    // if external MP3 isn't playing, faction score leads at full cinematic volume!
    const scorePresence = !mp3Alive ? 1.0 : (inBattle ? (0.34 + Math.min(0.66, battleHeat * 0.85)) : 0.22);
    const sIdx = scoreStep % 32;
    const dIdx = scoreStep % 16;

    // 1. Deep Lush String Ensemble Pad every 8 steps (1 bar)
    if (sIdx % 8 === 0) {
      const chIdx = Math.floor(sIdx / 8) % theme.chords.length;
      playStringChord(theme.chords[chIdx], theme.stepSec * 8.2, 0.38 * scorePresence);
    }
    // 2. Emotional Heroic Hijaz / Martial Brass-Ney Solo Melody (plays in battle or when leading)
    const melFreq = theme.melody[sIdx];
    if (melFreq > 0 && (inBattle || !mp3Alive)) {
      const leadGain = (!mp3Alive ? 0.34 : (0.14 + Math.min(0.24, battleHeat * 0.32))) * scorePresence;
      playLeadMotif(melFreq, theme.stepSec * 1.9, leadGain, style === 'axis');
    }
    // 3. Pounding War-Drum / Daf Cadence (strong during battle & combat heat!)
    if (inBattle || !mp3Alive) {
      const drumHit = theme.drums[dIdx];
      const drumPow = !mp3Alive ? 0.62 : (0.28 + Math.min(0.68, battleHeat * 0.85));
      if (drumHit > 0 && synths.wardrum) {
        const src = ctx.createBufferSource();
        src.buffer = synths.wardrum;
        src.playbackRate.value = drumHit > 0.8 ? 0.90 : 1.16;
        const g = ctx.createGain();
        g.gain.value = drumHit * drumPow * 0.56;
        src.connect(g); g.connect(scoreBus);
        try { src.start(ctx.currentTime); } catch (_) {}
      }
      const rimHit = theme.rims[dIdx];
      if (rimHit > 0 && synths.rim && (battleHeat > 0.18 || !mp3Alive)) {
        const src = ctx.createBufferSource();
        src.buffer = synths.rim;
        src.playbackRate.value = 0.95 + (dIdx % 3) * 0.06;
        const g = ctx.createGain();
        g.gain.value = rimHit * drumPow * 0.40;
        src.connect(g); g.connect(scoreBus);
        try { src.start(ctx.currentTime); } catch (_) {}
      }
    }
    scoreStep++;
  }, 50);

  function stopWaMusic(fadeSec) {
    if (waMusSrc && waMusGain && ctx) {
      try {
        const now = ctx.currentTime;
        waMusGain.gain.cancelScheduledValues(now);
        waMusGain.gain.setValueAtTime(Math.max(0.0001, waMusGain.gain.value), now);
        waMusGain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, fadeSec || 0.6));
        const s = waMusSrc;
        setTimeout(() => { try { s.stop(); } catch (_) {} }, Math.floor(Math.max(0.08, fadeSec || 0.6) * 1000) + 60);
      } catch (_) {}
    }
    waMusSrc = null; waMusGain = null; waMusRel = ''; waMusDur = 0;
  }

  function playMusicViaWebAudio(rel, fade) {
    if (!unlocked || !ctx) return;
    loadBuf(rel).then(buf => {
      if (!(buf instanceof AudioBuffer)) return;
      if (curDeck >= 0 && deckRel[curDeck] === rel && !decks[curDeck].paused && decks[curDeck].currentTime > 0.15) return;
      stopWaMusic(fade);
      for (let i = 0; i < 2; i++) {
        dto[i] = 0; dg[i] = 0;
        try { decks[i].pause(); } catch (_) {}
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = false;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(1.0, now + Math.max(0.15, fade || 1.5));
      src.connect(g);
      g.connect(musicGain);
      try {
        src.start(now);
        waMusSrc = src; waMusGain = g; waMusRel = rel;
        waMusStart = now; waMusDur = buf.duration;
      } catch (e) {
        lastErr = 'waMus:' + (e && e.message ? e.message : String(e));
      }
    });
  }

  function startDeckWithFallback(deckIdx, rel, fade, bases, bIdx) {
    if (bIdx >= bases.length) {
      playMusicViaWebAudio(rel, fade);
      return;
    }
    const a = decks[deckIdx];
    const url = bases[bIdx] + rel;
    deckRel[deckIdx] = rel;
    a.onerror = () => {
      if (deckIdx === curDeck) {
        if (bIdx + 1 < bases.length) startDeckWithFallback(deckIdx, rel, fade, bases, bIdx + 1);
        else playMusicViaWebAudio(rel, fade);
      }
    };
    a.oncanplay = () => {
      if (!baseOk) baseOk = bases[bIdx];
    };
    a.src = url;
    a.currentTime = 0;
    a.volume = Math.max(0.01, Math.min(1, dg[deckIdx] * musicMasterVol()));
    const p = a.play();
    if (p && p.catch) {
      p.catch(err => {
        lastErr = 'deckPlay:' + (err && err.name ? err.name : String(err));
        if (ctx && ctx.state === 'running' && deckIdx === curDeck) {
          playMusicViaWebAudio(rel, fade);
        }
      });
    }
  }

  function notifyBadge() {
    try {
      const b = document.getElementById('ww3-snd-badge');
      if (b && unlocked && ctx && ctx.state === 'running') {
        b.style.opacity = '0';
        b.style.pointerEvents = 'none';
        setTimeout(() => { if (b && b.parentNode) b.style.display = 'none'; }, 400);
      }
    } catch (_) {}
  }

  function unlockGesture() {
    initCtx();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(notifyBadge).catch(() => {});
      }
      try {
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (_) {}
    }
    if (!unlocked) {
      unlocked = true;
      if (!prewarmedSfx) {
        prewarmedSfx = true;
        loadBuf('sfx/sfx.mp3');
      }
      if (wantTrack) {
        const w = wantTrack;
        wantTrack = null;
        api.playMusic(w.rel, w.fade);
      }
      notifyBadge();
    } else {
      if (curDeck >= 0 && dto[curDeck] > 0 && decks[curDeck].paused && !waMusSrc) {
        const p = decks[curDeck].play();
        if (p && p.catch) p.catch(() => {
          if (deckRel[curDeck]) playMusicViaWebAudio(deckRel[curDeck], 1.0);
        });
      }
      notifyBadge();
    }
  }

  ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'touchend', 'click'].forEach(ev => {
    window.addEventListener(ev, unlockGesture, { capture: true, passive: true });
  });

  function loadBuf(rel) {
    const cur = bufs[rel];
    if (cur instanceof AudioBuffer) return Promise.resolve(cur);
    if (cur === 'loading') return Promise.resolve(null);
    if (cur === 'fail' && (performance.now() - (failAt[rel] || 0)) < 20000) return Promise.resolve(null);
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
    else if (busName === 'Music') dest = musicGain;

    if (typeof pan === 'number' && Math.abs(pan) > 0.01 && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-0.95, Math.min(0.95, pan));
      src.connect(g); g.connect(pn); pn.connect(dest);
    } else {
      src.connect(g); g.connect(dest);
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
    else if (busName === 'Music') dest = scoreBus || musicGain;
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
    inBattle = false;
    battleHeat = 0.0;
  }

  const api = {
    isUnlocked: () => unlocked,
    unlockNow: () => { unlockGesture(); return unlocked; },
    preload: rel => { loadBuf(rel); },
    has: rel => bufs[rel] instanceof AudioBuffer,
    playSlice,
    playSynth,
    setLoop,
    stopLoops,
    setFaction: fac => {
      if (fac) curFac = String(fac);
      scoreStep = 0;
    },
    setBattleState: (active, heatVal) => {
      inBattle = Boolean(active);
      battleHeat = Math.max(0, Math.min(1, Number(heatVal) || 0));
    },
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
      if (curDeck >= 0 && deckRel[curDeck] === rel && dto[curDeck] > 0 && !decks[curDeck].paused) {
        return;
      }
      stopWaMusic(fade);
      const old = curDeck;
      curDeck = curDeck === 0 ? 1 : 0;
      dg[curDeck] = 0.05; dto[curDeck] = 1; drt[curDeck] = 1 / Math.max(0.05, fade || 2.0);
      startDeckWithFallback(curDeck, rel, fade, bases, 0);
      if (old >= 0) {
        dto[old] = 0;
        drt[old] = Math.max(0.01, dg[old]) / Math.max(0.05, fade || 2.0);
      }
    },
    stopMusic: fade => {
      if (!unlocked) return;
      wantTrack = null;
      stopWaMusic(fade);
      const f = Math.max(0.05, fade || 0.5);
      for (let i = 0; i < 2; i++) {
        dto[i] = 0;
        drt[i] = Math.max(0.01, dg[i]) / f;
      }
    },
    musicLeft: () => {
      if (waMusSrc && ctx && waMusDur > 0) {
        return Math.max(0, waMusDur - (ctx.currentTime - waMusStart));
      }
      if (curDeck < 0) return -1;
      const a = decks[curDeck];
      if (a.ended) return 0;
      if (!isFinite(a.duration) || !(a.duration > 0)) return 999;
      return a.duration - a.currentTime;
    },
    status: () => ({
      unlocked,
      ctxState: ctx ? ctx.state : 'none',
      faction: curFac,
      style: factionStyle(curFac),
      base: baseOk,
      bases: getBases(),
      loaded: Object.values(bufs).filter(v => v instanceof AudioBuffer).length,
      sfxActive,
      music: waMusRel || (curDeck >= 0 ? decks[curDeck].src : ''),
      musicPlaying: isMp3MusicActivelyPlaying(),
      musicTime: curDeck >= 0 ? Number((decks[curDeck].currentTime || 0).toFixed(2)) : 0,
      wantTrack: wantTrack ? wantTrack.rel : null,
      lastErr
    })
  };

  window.WW3Audio = api;
})();
