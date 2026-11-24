// World War 3 — AAA Cinematic WebAudio + Orchestral Soundtrack Engine (godot/web/ww3audio.js)
// Delivers pure blockbuster military audio with zero clashing synth overlays:
//  - Synchronous DOM user-gesture unlock (pointerdown/touchstart/touchend/mousedown/click/keydown) + iOS silent-buffer prime
//  - Pre-queues real recorded orchestral MP3 soundtrack (mus/st/*.mp3) before first gesture so audio starts immediately
//  - Automatic WebAudio fetch+decodeAudioData fallback if HTML5 <audio> ever fails or stalls
//  - Clean, pure cinematic orchestral fallback (strings, Hans Zimmer low brass, concert timpani/snare) ONLY if offline MP3s cannot stream
//  - Hollywood layered weapon, 120mm cannon, sub-bass explosion, orbital beam, nuke & SCUD SFX with canyon reverb
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
  let musicGain, musicLowShelf, musicMidPeak, musicHighShelf, musicComp, musicRevSend, scoreBus, scoreRev, scoreRevSend;
  let uiGain;

  // Volumes (0..1) + ducking + battle state
  const vol = { master: 1.0, music: 0.84, voices: 1.0, effects: 1.0, announcer: 0.85 };
  let musDuck = 1.0, sfxDuck = 1.0;
  let battleHeat = 0.0;
  let inBattle = false;
  let lastFanfareAt = -999;
  let curFac = 'IR';

  // Buffers: rel -> AudioBuffer | 'loading' | 'fail'
  const bufs = Object.create(null);
  const failAt = Object.create(null);
  const loops = Object.create(null);
  const activeVoice = { vox: null, ann: null, shout: null };
  let sfxActive = 0;
  const SFX_CAP = 44;

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
  let waMusSrc = null, waMusGain = null, waMusRel = '', waMusStart = 0, waMusDur = 0, musicReqId = 0;
  let wantTrack = { rel: 'mus/st/menu-02.mp3', fade: 1.6 };
  let prewarmedSfx = false;

  // Cinematic offline fallback themes (modern epic orchestral minor — ONLY used when MP3 soundtrack cannot stream)
  const WEST_FACS = new Set(['US', 'GB', 'FR', 'DE', 'IL', 'UA']);
  const EAST_FACS = new Set(['RU', 'CN', 'KP']);
  function factionStyle(fac) {
    if (WEST_FACS.has(fac)) return 'tactical';
    if (EAST_FACS.has(fac)) return 'armored';
    return 'epic';
  }

  // Pure Hollywood orchestral war themes (D minor / C minor / E minor — zero latmiya, zero daf, zero Hijaz)
  const THEMES = {
    // D Minor — Modern blockbuster orchestral war score (Hans Zimmer / Generals style strings + low brass + timpani)
    epic: {
      stepSec: 0.23,
      chords: [
        [73.42, 110.00, 146.83, 174.61], // Dm (D2, A2, D3, F3)
        [58.27, 87.31, 116.54, 146.83],  // Bb (Bb1, F2, Bb2, D3)
        [65.41, 98.00, 130.81, 164.81],  // C  (C2, G2, C3, E3)
        [73.42, 110.00, 146.83, 164.81], // Dsus2
      ],
      melody: [
        293.66, 0, 349.23, 440.00, 0, 392.00, 349.23, 329.63,
        293.66, 0, 0, 220.00, 293.66, 0, 0, 0,
        440.00, 0, 523.25, 440.00, 392.00, 0, 349.23, 329.63,
        293.66, 0, 329.63, 293.66, 0, 0, 0, 0
      ],
      drums: [1.0, 0, 0.35, 0, 0.90, 0, 0.45, 0.25, 1.0, 0, 0.40, 0.25, 0.95, 0.35, 0.65, 0]
    },
    // C Minor / Dorian — Heroic tactical brass & driving strings
    tactical: {
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
      drums: [1.0, 0, 0.4, 0, 0.85, 0, 0.45, 0.3, 1.0, 0, 0.4, 0.3, 0.9, 0.4, 0.6, 0]
    },
    // E Minor — Heavy armored-column martial low brass & industrial percussion
    armored: {
      stepSec: 0.24,
      chords: [
        [82.41, 123.47, 164.81, 196.00], // Em
        [65.41, 98.00, 130.81, 164.81],  // C
        [73.42, 110.00, 146.83, 174.61], // Dm
        [61.74, 92.50, 123.47, 146.83],  // Bm
      ],
      melody: [
        329.63, 0, 329.63, 392.00, 493.88, 0, 440.00, 392.00,
        369.99, 0, 329.63, 0, 293.66, 0, 0, 0,
        329.63, 392.00, 493.88, 0, 523.25, 493.88, 440.00, 0,
        392.00, 369.99, 329.63, 0, 0, 0, 0, 0
      ],
      drums: [1.0, 0, 0, 0, 0.95, 0, 0.4, 0, 1.0, 0, 0.5, 0, 0.95, 0.5, 0.7, 0.4]
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
    return Math.max(0, Math.min(1.0, 0.76 * (vol.music / 0.75) * musDuck * vol.master));
  }

  function initCtx() {
    if (ctx || !AC) return;
    try {
      // 'playback' latencyHint gives WebAudio a jitter-free audio buffer under heavy WebGL2 load (zero crackling/chopping!)
      ctx = new AC({ latencyHint: 'playback' });
    } catch (_) {
      try {
        ctx = new AC();
      } catch (e) {
        lastErr = 'AC:' + (e && e.message ? e.message : String(e));
        return;
      }
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

    // Cinematic Music Mastering Chain (sub-bass rumble + brass mid-punch + orchestral air + glue compression + concert hall width!)
    musicGain = ctx.createGain();
    musicLowShelf = ctx.createBiquadFilter();
    musicLowShelf.type = 'lowshelf';
    musicLowShelf.frequency.value = 86;
    musicLowShelf.gain.value = 5.6;
    musicMidPeak = ctx.createBiquadFilter();
    musicMidPeak.type = 'peaking';
    musicMidPeak.frequency.value = 1350;
    musicMidPeak.Q.value = 0.85;
    musicMidPeak.gain.value = 2.2;
    musicHighShelf = ctx.createBiquadFilter();
    musicHighShelf.type = 'highshelf';
    musicHighShelf.frequency.value = 7000;
    musicHighShelf.gain.value = 3.2;
    musicComp = ctx.createDynamicsCompressor();
    musicComp.threshold.value = -13.5;
    musicComp.knee.value = 8.0;
    musicComp.ratio.value = 3.2;
    musicComp.attack.value = 0.012;
    musicComp.release.value = 0.22;
    musicGain.connect(musicLowShelf);
    musicLowShelf.connect(musicMidPeak);
    musicMidPeak.connect(musicHighShelf);
    musicHighShelf.connect(musicComp);
    musicComp.connect(masterGain);

    // Faction Score Bus + Lush 2.8s Concert Hall / Cathedral Reverb (makes strings, brass, choir & war drums sound MASSIVE!)
    scoreBus = ctx.createGain();
    scoreBus.gain.value = 0.86;
    scoreBus.connect(musicGain);
    try {
      const rLen = Math.floor(ctx.sampleRate * 2.8);
      const rIr = ctx.createBuffer(2, rLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = rIr.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < rLen; i++) {
          const t = i / rLen;
          const pre = i < ctx.sampleRate * 0.022 ? 0.15 : 1.0;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.95) * pre;
          lp += 0.13 * (n - lp);
          d[i] = lp * 0.58;
        }
      }
      scoreRev = ctx.createConvolver();
      scoreRev.buffer = rIr;
      scoreRevSend = ctx.createGain();
      scoreRevSend.gain.value = 0.52;
      scoreBus.connect(scoreRevSend);
      scoreRevSend.connect(scoreRev);
      scoreRev.connect(musicComp);
      // Subtle stereo concert-hall width on recorded MP3 soundtrack tracks (zero feedback: exits into musicComp!)
      musicRevSend = ctx.createGain();
      musicRevSend.gain.value = 0.16;
      musicHighShelf.connect(musicRevSend);
      musicRevSend.connect(scoreRev);
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
      const len = Math.floor(ctx.sampleRate * 1.45);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.3);
          lp += 0.19 * (n - lp);
          d[i] = lp * 0.54;
        }
      }
      sfxRevNode = ctx.createConvolver();
      sfxRevNode.buffer = ir;
      sfxRevSend = ctx.createGain();
      sfxRevSend.gain.value = 0.24;
      sfxGain.connect(sfxRevSend);
      sfxRevSend.connect(sfxRevNode);
      sfxRevNode.connect(battleGain);
    } catch (_) {}

    // Voice bus (clean high-pass + vocal presence + gentle broadcast compression — crisp, zero muddiness)
    voiceGain = ctx.createGain();
    const voiceHPF = ctx.createBiquadFilter();
    voiceHPF.type = 'highpass';
    voiceHPF.frequency.value = 125;
    voiceHPF.Q.value = 0.7;
    voiceEQ = ctx.createBiquadFilter();
    voiceEQ.type = 'peaking';
    voiceEQ.frequency.value = 2500;
    voiceEQ.Q.value = 1.0;
    voiceEQ.gain.value = 2.6;
    voiceComp = ctx.createDynamicsCompressor();
    voiceComp.threshold.value = -14.0;
    voiceComp.ratio.value = 3.2;
    voiceComp.attack.value = 0.004;
    voiceComp.release.value = 0.14;
    voiceGain.connect(voiceHPF);
    voiceHPF.connect(voiceEQ);
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
    // Seismic sub-bass shockwave + supersonic crack (heavy tanks / artillery / building blasts)
    synths.sub = makeBuf(1.25, (d, n, sr) => {
      let ph = 0, lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = 22 + 48 * Math.exp(-t * 5.8);
        ph += Math.PI * 2 * f / sr;
        const atk = Math.min(1, t / 0.003);
        const tail = Math.min(1, (1.25 - t) / 0.06);
        const body = Math.sin(ph) * Math.exp(-t * 2.8) * 0.96;
        const ns = Math.random() * 2 - 1;
        lp += 0.14 * (ns - lp);
        lp2 += 0.022 * (lp - lp2);
        const crack = ns * Math.exp(-t * 42.0) * 0.55;
        const shock = lp * Math.exp(-t * 11.0) * 0.98;
        const rumble = lp2 * Math.exp(-t * 1.95) * 0.72;
        d[i] = Math.tanh((body + crack + shock + rumble) * 1.65) * 0.94 * atk * tail;
      }
    });
    // Heavy 120mm tank / artillery cannon breech thump + metallic resonance
    synths.cannon = makeBuf(0.58, (d, n, sr) => {
      let ph = 0, phM = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (34 + 62 * Math.exp(-t * 16.0)) / sr;
        phM += Math.PI * 2 * 410 / sr;
        const ns = Math.random() * 2 - 1;
        lp += 0.24 * (ns - lp);
        const atk = Math.min(1, t / 0.002);
        const rel = Math.min(1, (0.58 - t) / 0.04);
        const punch = Math.sin(ph) * Math.exp(-t * 7.8) * 0.92;
        const blast = lp * Math.exp(-t * 15.0) * 0.95;
        const snap = ns * Math.exp(-t * 68.0) * 0.65;
        const ring = Math.sin(phM) * Math.exp(-t * 22.0) * 0.14;
        d[i] = Math.tanh((punch + blast + snap + ring) * 1.55) * 0.90 * atk * rel;
      }
    });
    // Colossal 2.35s Thermonuclear Detonation Shockwave + Rolling Fallout Thunder
    synths.nuke = makeBuf(2.35, (d, n, sr) => {
      let ph = 0, lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (20 + 62 * Math.exp(-t * 2.2)) / sr;
        const ns = Math.random() * 2 - 1;
        lp += (0.18 * Math.exp(-t * 1.4) + 0.018) * (ns - lp);
        lp2 += 0.015 * (lp - lp2);
        const atk = Math.min(1, t / 0.004);
        const rel = Math.min(1, (2.35 - t) / 0.18);
        const flash = ns * Math.exp(-t * 18.0) * 0.72;
        const sub = Math.sin(ph) * Math.exp(-t * 1.15) * 1.05;
        const thunder = (lp * 1.25 + lp2 * 1.1) * Math.exp(-t * 0.92);
        d[i] = Math.tanh((flash + sub + thunder) * 1.7) * 0.96 * atk * rel;
      }
    });
    // Orbital Particle Cannon: surging harmonic ion charge + searing plasma hum + electric arcs
    synths.beam = makeBuf(2.20, (d, n, sr) => {
      let ph1 = 0, ph2 = 0, prev = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const charge = Math.min(1, t / 0.55);
        const f1 = 110 + 260 * charge * charge + 18 * Math.sin(t * 24);
        ph1 += Math.PI * 2 * f1 / sr;
        ph2 += Math.PI * 2 * (f1 * 2.01) / sr;
        const env = Math.min(1, t / 0.08) * Math.min(1, (2.20 - t) / 0.25);
        const ns = Math.random() * 2 - 1;
        const hp = ns - prev; prev = ns;
        const hum = (Math.sin(ph1) * 0.65 + Math.sin(ph2) * 0.35 + Math.sin(ph1 * 0.5) * 0.45);
        const arc = hp * (0.14 + (Math.random() < 0.08 ? 0.55 : 0)) * (0.4 + 0.6 * charge);
        d[i] = Math.tanh((hum * 0.72 + arc) * 1.5) * 0.88 * env;
      }
    });
    // SCUD Storm: roaring multi-rocket booster ignition whoosh + ballistic thunder
    synths.scud = makeBuf(1.60, (d, n, sr) => {
      let ph = 0, lp = 0, bp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const k = i / n;
        ph += Math.PI * 2 * (85 + 95 * Math.sin(Math.PI * k)) / sr;
        const ns = Math.random() * 2 - 1;
        lp += (0.28 - 0.16 * k) * (ns - lp);
        bp += 0.06 * (lp - bp);
        const env = Math.min(1, t / 0.06) * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.72)), 0.85);
        const roar = (lp - bp * 0.5) * 1.15 + Math.sin(ph) * 0.32;
        d[i] = Math.tanh(roar * 1.5) * 0.86 * env;
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
    // Epic Battle-Start Cinematic Brass & Timpani Fanfare (2.8s: bold D-minor orchestral brass chord + double timpani boom)
    synths.fanfare = makeBuf(2.8, (d, n, sr) => {
      const freqs = [73.42, 110.0, 146.83, 174.61, 220.0, 293.66];
      const amps = [0.42, 0.34, 0.28, 0.20, 0.18, 0.12];
      const phs = [0, 0, 0, 0, 0, 0];
      let dph1 = 0, dph2 = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let horn = 0;
        const hEnv = Math.min(1, Math.max(0, (t - 0.05) / 0.55)) * Math.exp(-Math.max(0, t - 0.85) * 1.05) * Math.min(1, (2.8 - t) / 0.28);
        for (let j = 0; j < freqs.length; j++) {
          const vib = 1 + 0.0025 * Math.sin(t * 4.5 + j);
          phs[j] += Math.PI * 2 * freqs[j] * vib / sr;
          const p = phs[j];
          horn += (Math.sin(p) * 0.54 + Math.sin(p * 2) * 0.27 + Math.sin(p * 3) * 0.13 + Math.sin(p * 4) * 0.06) * amps[j];
        }
        let drum = 0;
        const ns = Math.random() * 2 - 1;
        lp += 0.08 * (ns - lp);
        if (t < 0.70) {
          dph1 += Math.PI * 2 * (44 + 46 * Math.exp(-t * 14)) / sr;
          drum += (Math.sin(dph1) * 0.88 + lp * 0.58) * Math.exp(-t * 6.0) * Math.min(1, t / 0.004);
        }
        if (t >= 0.42 && t < 1.35) {
          const lt = t - 0.42;
          dph2 += Math.PI * 2 * (38 + 50 * Math.exp(-lt * 13)) / sr;
          drum += (Math.sin(dph2) * 1.0 + lp * 0.68) * Math.exp(-lt * 4.8) * Math.min(1, lt / 0.004);
        }
        d[i] = Math.tanh((horn * hEnv * 0.88 + drum * 0.82) * 1.25) * 0.82;
      }
    });
    // Deep concert timpani / taiko war drum
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
    // Crisp tactical military snare drum (drives combat urgency)
    synths.snare = makeBuf(0.20, (d, n, sr) => {
      let ph = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += Math.PI * 2 * (195 + 120 * Math.exp(-t * 45)) / sr;
        const ns = Math.random() * 2 - 1;
        lp += 0.48 * (ns - lp);
        const env = Math.min(1, t / 0.002) * Math.exp(-t * 19);
        d[i] = Math.tanh((Math.sin(ph) * 0.55 + lp * 0.92) * 1.35) * 0.52 * env;
      }
    });
    // Heavy metallic industrial anvil strike (Hans Zimmer / Red Alert climax percussion)
    synths.anvil = makeBuf(0.34, (d, n, sr) => {
      const fqs = [1180, 1735, 2410, 3890];
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.min(1, t / 0.0015) * Math.exp(-t * 15);
        let acc = (Math.random() * 2 - 1) * Math.exp(-t * 55) * 0.55;
        for (let k = 0; k < fqs.length; k++) acc += Math.sin(Math.PI * 2 * fqs[k] * t) * 0.24;
        d[i] = Math.tanh(acc * 1.25) * 0.45 * env;
      }
    });
  }

  // ---- Lush Real-Time Orchestral Voice Helpers (Wide Stereo Strings + Choir + Cinema BRAAAM + Staccato Ostinato + Epic French Horn)
  function playBrassBraaam(rootFreq, durSec, gainVal) {
    if (!ctx || !scoreBus || !rootFreq || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(190, now);
    lpf.frequency.exponentialRampToValueAtTime(1850, now + Math.min(0.28, durSec * 0.20));
    lpf.frequency.exponentialRampToValueAtTime(320, now + durSec);
    lpf.Q.value = 1.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.055);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal * 0.58), now + durSec * 0.68);
    g.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.18);
    lpf.connect(g); g.connect(scoreBus);
    const layers = [
      [rootFreq * 0.5, 'sine', 0.58, 0, 0],
      [rootFreq, 'sawtooth', 0.30, -8, -0.35],
      [rootFreq, 'sawtooth', 0.30, 8, 0.35],
      [rootFreq * 1.5, 'sawtooth', 0.20, 4, -0.20],
      [rootFreq * 2.0, 'sawtooth', 0.14, -5, 0.25]
    ];
    for (const [f, tp, a, dt, pan] of layers) {
      const osc = ctx.createOscillator();
      osc.type = tp; osc.frequency.value = f; osc.detune.value = dt;
      const og = ctx.createGain(); og.gain.value = a;
      if (pan && ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner(); pn.pan.value = pan;
        osc.connect(og); og.connect(pn); pn.connect(lpf);
      } else {
        osc.connect(og); og.connect(lpf);
      }
      osc.start(now); osc.stop(now + durSec + 0.22);
    }
  }

  function playOstinato(freq, durSec, gainVal) {
    if (!ctx || !scoreBus || !freq || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(1950, now);
    lpf.frequency.exponentialRampToValueAtTime(520, now + durSec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
    lpf.connect(g); g.connect(scoreBus);
    for (const [dt, pan] of [[-6, -0.32], [6, 0.32]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = dt;
      const og = ctx.createGain(); og.gain.value = 0.44;
      if (ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner(); pn.pan.value = pan;
        osc.connect(og); og.connect(pn); pn.connect(lpf);
      } else {
        osc.connect(og); og.connect(lpf);
      }
      osc.start(now); osc.stop(now + durSec + 0.03);
    }
  }

  function playStringChord(freqs, durSec, gainVal) {
    if (!ctx || !scoreBus || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(640, now);
    lpf.frequency.linearRampToValueAtTime(1950, now + durSec * 0.48);
    lpf.frequency.linearRampToValueAtTime(760, now + durSec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + Math.min(0.65, durSec * 0.28));
    g.gain.setValueAtTime(gainVal * 0.94, now + durSec * 0.72);
    g.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.20);
    lpf.connect(g);
    g.connect(scoreBus);
    for (let idx = 0; idx < freqs.length; idx++) {
      const f = freqs[idx];
      const basePan = ((idx % 2) ? 0.45 : -0.45);
      for (const [det, panOff] of [[-7.5, -0.22], [7.5, 0.22]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 0.24 / freqs.length;
        if (ctx.createStereoPanner) {
          const pn = ctx.createStereoPanner();
          pn.pan.value = Math.max(-0.85, Math.min(0.85, basePan + panOff));
          osc.connect(og); og.connect(pn); pn.connect(lpf);
        } else {
          osc.connect(og); og.connect(lpf);
        }
        osc.start(now);
        osc.stop(now + durSec + 0.24);
      }
    }
    // Ethereal Epic Choir Formant Shimmer (octave above top chord voice)
    const topF = freqs[freqs.length - 1] * 2.0;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 920; bpf.Q.value = 2.4;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, now);
    cg.gain.linearRampToValueAtTime(gainVal * 0.22, now + Math.min(0.85, durSec * 0.35));
    cg.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.22);
    bpf.connect(cg); cg.connect(scoreBus);
    for (const det of [-9, 0, 9]) {
      const co = ctx.createOscillator();
      co.type = 'sawtooth'; co.frequency.value = topF; co.detune.value = det;
      co.connect(bpf); co.start(now); co.stop(now + durSec + 0.25);
    }
  }

  function playLeadMotif(freq, durSec, gainVal) {
    if (!ctx || !scoreBus || !freq || gainVal < 0.005) return;
    const now = ctx.currentTime;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(950, now);
    lpf.frequency.exponentialRampToValueAtTime(2850, now + Math.min(0.28, durSec * 0.32));
    lpf.frequency.exponentialRampToValueAtTime(1100, now + durSec);
    lpf.Q.value = 1.45;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.08);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal * 0.68), now + durSec * 0.76);
    g.gain.linearRampToValueAtTime(0.0001, now + durSec + 0.16);

    // Expressive orchestral French horn + soaring violin section vibrato
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 4.9;
    lfoG.gain.value = freq * 0.0075;
    lfo.connect(lfoG);

    const endT = now + durSec + 0.20;
    const voices = [
      [freq, 'sawtooth', 0.34, -5.5, -0.25],
      [freq, 'sawtooth', 0.34,  5.5,  0.25],
      [freq * 0.5, 'sawtooth', 0.44, 0, 0],
      [freq * 2.0, 'triangle', 0.16, 3.5, 0.15]
    ];
    for (const [vf, vtp, va, vdt, vpan] of voices) {
      const osc = ctx.createOscillator();
      osc.type = vtp; osc.frequency.setValueAtTime(vf, now); osc.detune.value = vdt;
      if (vf === freq) lfoG.connect(osc.frequency);
      const og = ctx.createGain(); og.gain.value = va;
      if (vpan && ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner(); pn.pan.value = vpan;
        osc.connect(og); og.connect(pn); pn.connect(lpf);
      } else {
        osc.connect(og); og.connect(lpf);
      }
      osc.start(now); osc.stop(endT);
    }
    lpf.connect(g); g.connect(scoreBus);
    lfo.start(now); lfo.stop(endT);
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

  // Smooth 50ms crossfade + Offline-Only Cinematic Orchestral Fallback (never clashes over live recorded MP3 tracks!)
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
    // When real recorded orchestral MP3 soundtrack is playing through the mastered WebAudio chain,
    // keep the melody pure and add ONLY subtle epic war-drum tension pulses during peak combat heat!
    if (isMp3MusicActivelyPlaying()) {
      if (inBattle && battleHeat > 0.45 && synths.wardrum) {
        scoreAccum += 0.05;
        if (scoreAccum >= 0.46) {
          scoreAccum -= 0.46;
          const pulse = scoreStep % 8;
          if (pulse === 0 || pulse === 3 || pulse === 6) {
            const src = ctx.createBufferSource();
            src.buffer = synths.wardrum;
            src.playbackRate.value = pulse === 0 ? 0.84 : 1.05;
            const g = ctx.createGain();
            g.gain.value = (pulse === 0 ? 0.24 : 0.15) * Math.min(1, (battleHeat - 0.35) * 1.4);
            src.connect(g); g.connect(scoreBus);
            try { src.start(ctx.currentTime); } catch (_) {}
          }
          scoreStep++;
        }
      } else {
        scoreAccum = 0;
      }
      return;
    }
    const style = factionStyle(curFac);
    const theme = THEMES[style] || THEMES.epic;
    scoreAccum += 0.05;
    if (scoreAccum < theme.stepSec) return;
    scoreAccum -= theme.stepSec;

    const sIdx = scoreStep % 32;
    const dIdx = scoreStep % 16;
    const chIdx = Math.floor(sIdx / 8) % theme.chords.length;
    const curChord = theme.chords[chIdx];

    // 1. Lush String Ensemble Pad every bar
    if (sIdx % 8 === 0) {
      playStringChord(curChord, theme.stepSec * 8.2, 0.42);
    }
    // 2. Cinema Low Brass Swells on bar 1 & bar 3
    if (sIdx === 0 || (sIdx === 16 && inBattle)) {
      playBrassBraaam(curChord[0], theme.stepSec * 6.5, inBattle ? (0.28 + battleHeat * 0.16) : 0.22);
    }
    // 3. Driving Staccato Cello/Viola Ostinato during battle
    if (inBattle) {
      const ostNote = (sIdx % 4 === 0) ? curChord[1] : ((sIdx % 4 === 2) ? curChord[2] : curChord[1]);
      playOstinato(ostNote, theme.stepSec * 0.82, 0.12 + Math.min(0.16, battleHeat * 0.20));
    }
    // 4. Heroic Orchestral Horn Lead Motif
    const melFreq = theme.melody[sIdx];
    if (melFreq > 0 && inBattle) {
      playLeadMotif(melFreq, theme.stepSec * 1.95, 0.26 + Math.min(0.14, battleHeat * 0.20));
    }
    // 5. Concert Timpani / Military Snare / Industrial Anvil Section
    if (inBattle) {
      const drumHit = theme.drums[dIdx];
      const drumPow = 0.50 + Math.min(0.45, battleHeat * 0.65);
      if (drumHit > 0 && synths.wardrum) {
        const src = ctx.createBufferSource();
        src.buffer = synths.wardrum;
        src.playbackRate.value = drumHit > 0.8 ? 0.88 : 1.15;
        const g = ctx.createGain();
        g.gain.value = drumHit * drumPow * 0.58;
        src.connect(g); g.connect(scoreBus);
        try { src.start(ctx.currentTime); } catch (_) {}
      }
      if ((dIdx === 4 || dIdx === 12) && synths.snare) {
        const src = ctx.createBufferSource();
        src.buffer = synths.snare;
        const g = ctx.createGain();
        g.gain.value = drumPow * 0.38;
        src.connect(g); g.connect(scoreBus);
        try { src.start(ctx.currentTime); } catch (_) {}
      }
      if ((dIdx === 0 || dIdx === 8) && synths.anvil && battleHeat > 0.35) {
        const src = ctx.createBufferSource();
        src.buffer = synths.anvil;
        const g = ctx.createGain();
        g.gain.value = drumPow * 0.30;
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

  function playSlice(rel, off, dur, gainLin, rate, pan, busName, slotName, delaySec) {
    if (!unlocked || !ctx) return false;
    const buf = bufs[rel];
    if (!(buf instanceof AudioBuffer)) {
      loadBuf(rel);
      return false;
    }
    const isSfx = busName.startsWith('Sfx');
    if (isSfx && sfxActive >= SFX_CAP) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const r = Math.max(0.15, rate || 1.0);
    src.playbackRate.value = r;

    const g = ctx.createGain();
    const delay = Math.max(0, Number(delaySec) || 0);
    const startAt = ctx.currentTime + delay;
    const isVoice = busName === 'Voice';
    // Voice sprite sheets have 120ms silence padding between lines: add a gentle 35ms tail safety margin so MP3 decoder priming never clips the final syllable!
    const safeOff = Math.max(0, off);
    const reqDur = isVoice ? (dur + 0.035) : dur;
    const availDur = Math.max(0.03, buf.duration - safeOff);
    const sliceDur = Math.max(0.03, Math.min(reqDur, availDur));
    const playDur = sliceDur / r;
    const lv = Math.max(0.0001, gainLin);

    // Sample-accurate anti-click attack & release envelope (zero popping or choppy edges!)
    const fadeIn = isVoice ? Math.min(0.014, playDur * 0.12) : Math.min(0.005, playDur * 0.10);
    const fadeOut = isVoice ? Math.min(0.055, playDur * 0.25) : Math.min(0.045, playDur * 0.28);
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.linearRampToValueAtTime(lv, startAt + fadeIn);
    if (playDur > fadeIn + fadeOut + 0.01) {
      g.gain.setValueAtTime(lv, startAt + playDur - fadeOut);
      g.gain.linearRampToValueAtTime(0.0001, startAt + playDur);
    } else {
      g.gain.linearRampToValueAtTime(0.0001, startAt + playDur);
    }

    let dest = sfxGain;
    if (busName === 'SfxMid') dest = sfxMidLPF;
    else if (busName === 'SfxFar') dest = sfxFarLPF;
    else if (busName === 'Voice') dest = voiceGain;
    else if (busName === 'UI') dest = uiGain;
    else if (busName === 'Music') dest = musicGain;

    if (typeof pan === 'number' && Math.abs(pan) > 0.01 && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-0.92, Math.min(0.92, pan));
      src.connect(g); g.connect(pn); pn.connect(dest);
    } else {
      src.connect(g); g.connect(dest);
    }

    // Smooth 35ms crossfade-out of previous voice in the same slot (never hard-cut mid-syllable with a pop!)
    if (slotName && activeVoice[slotName]) {
      const prev = activeVoice[slotName];
      try {
        const tCut = ctx.currentTime;
        if (prev.gain) {
          prev.gain.gain.cancelScheduledValues(tCut);
          prev.gain.gain.setTargetAtTime(0.0001, tCut, 0.012);
        }
        if (prev.src) prev.src.stop(tCut + 0.045);
      } catch (_) {}
      activeVoice[slotName] = null;
    }
    const entry = { src, gain: g };
    if (slotName) activeVoice[slotName] = entry;

    if (isSfx) {
      sfxActive++;
      src.onended = () => { sfxActive = Math.max(0, sfxActive - 1); };
    } else if (slotName) {
      src.onended = () => { if (activeVoice[slotName] === entry) activeVoice[slotName] = null; };
    }

    try {
      src.start(startAt, safeOff, sliceDur);
      return true;
    } catch (_) {
      if (isSfx) sfxActive = Math.max(0, sfxActive - 1);
      if (slotName && activeVoice[slotName] === entry) activeVoice[slotName] = null;
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
    const now = ctx.currentTime;
    let L = loops[key];
    if (!L) {
      if (gainLin < 0.008) return;
      const buf = bufs[rel];
      if (!(buf instanceof AudioBuffer)) { loadBuf(rel); return; }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.connect(sfxGain);
      L = { src: null, gain: g, gVal: 0, rel, silentSince: 0 };
      loops[key] = L;
    }
    L.gVal += (gainLin - L.gVal) * 0.22;
    if (L.gVal < 0.003) {
      if (L.src) {
        L.gain.gain.setTargetAtTime(0.0001, now, 0.10);
        if (!L.silentSince) L.silentSince = now;
        // Grace period so engines fade silently to zero instead of hard-stopping/clicking
        if (now - L.silentSince > 0.55) {
          try { L.src.stop(); } catch (_) {}
          L.src = null;
          L.silentSince = 0;
        }
      }
      return;
    }
    L.silentSince = 0;
    if (!L.src) {
      const buf = bufs[rel];
      if (!(buf instanceof AudioBuffer)) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(L.gain);
      L.gain.gain.setValueAtTime(0.0001, now);
      try { src.start(now, Math.random() * Math.min(2.0, buf.duration * 0.5)); } catch (_) {}
      L.src = src;
    }
    L.gain.gain.setTargetAtTime(Math.max(0.0001, L.gVal), now, 0.12);
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
      const wasBattle = inBattle;
      inBattle = Boolean(active);
      battleHeat = Math.max(0, Math.min(1, Number(heatVal) || 0));
      if (inBattle && !wasBattle && unlocked && ctx && ctx.currentTime - lastFanfareAt > 15) {
        lastFanfareAt = ctx.currentTime;
        playSynth('fanfare', 0.72, 1.0, 0, 'Music');
      }
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
      if ((waMusSrc && waMusRel === rel) || (curDeck >= 0 && deckRel[curDeck] === rel && dto[curDeck] > 0 && !decks[curDeck].paused)) {
        return;
      }
      const reqId = ++musicReqId;
      // Prefer WebAudio mastered playback FIRST so recorded MP3 soundtracks pass through the cinema EQ,
      // sub-bass warmth, concert-hall reverb & glue compressor! Fall back seamlessly to <audio> deck if needed.
      loadBuf(rel).then(buf => {
        if (reqId !== musicReqId) return;
        if (buf instanceof AudioBuffer) {
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
          g.gain.linearRampToValueAtTime(1.0, now + Math.max(0.20, fade || 1.5));
          src.connect(g);
          g.connect(musicGain);
          try {
            src.start(now);
            waMusSrc = src; waMusGain = g; waMusRel = rel;
            waMusStart = now; waMusDur = buf.duration;
          } catch (e) {
            lastErr = 'waMus:' + (e && e.message ? e.message : String(e));
            const old = curDeck;
            curDeck = curDeck === 0 ? 1 : 0;
            dg[curDeck] = 0.05; dto[curDeck] = 1; drt[curDeck] = 1 / Math.max(0.05, fade || 2.0);
            startDeckWithFallback(curDeck, rel, fade, bases, 0);
            if (old >= 0) { dto[old] = 0; drt[old] = Math.max(0.01, dg[old]) / Math.max(0.05, fade || 2.0); }
          }
        } else {
          stopWaMusic(fade);
          const old = curDeck;
          curDeck = curDeck === 0 ? 1 : 0;
          dg[curDeck] = 0.05; dto[curDeck] = 1; drt[curDeck] = 1 / Math.max(0.05, fade || 2.0);
          startDeckWithFallback(curDeck, rel, fade, bases, 0);
          if (old >= 0) { dto[old] = 0; drt[old] = Math.max(0.01, dg[old]) / Math.max(0.05, fade || 2.0); }
        }
      });
    },
    stopMusic: fade => {
      if (!unlocked) return;
      musicReqId++;
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
