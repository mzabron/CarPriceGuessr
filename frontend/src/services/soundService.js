import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Lightweight SFX manager.
// - Supports file-based playback via HTMLAudioElement pools
// - Also supports built-in synthesized tones via WebAudio using keys like 'synth:click'
// To override with files, place audio under public/sfx and change DEFAULT_SOUNDS.

const DEFAULT_SOUNDS = {
  // Synthesized defaults (free, in-code). Replace with file paths when you add assets.
  click: 'synth:click',
  confirm: 'synth:confirm',
  voting_start: 'synth:voting_start',
  round_start: 'synth:round_start',
  round_end: 'synth:round_end',
  game_end: 'synth:game_end',
  turn_start: 'synth:turn_start',
  guess_ping: 'synth:guess_ping',
  steal: 'synth:steal',
  toggle: 'synth:toggle',
};

const SoundContext = createContext({
  play: (/* key, opts */) => {},
  enabled: true,
  setEnabled: () => {},
  volume: 1,
  setVolume: () => {},
});

export function SoundProvider({ children, sounds = {} , poolSize = 4 }) {
  const soundMap = useMemo(() => ({ ...DEFAULT_SOUNDS, ...sounds }), [sounds]);
  const poolsRef = useRef({}); // key -> { nodes: Audio[], idx: number }
  const audioCtxRef = useRef(null);
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('sfx.enabled');
    return saved == null ? true : saved === 'true';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('sfx.volume');
    const v = saved == null ? 0.8 : parseFloat(saved);
    return isNaN(v) ? 0.8 : Math.max(0, Math.min(1, v));
  });
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const onFirstInteraction = () => {
      userInteractedRef.current = true;
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
    };
    window.addEventListener('pointerdown', onFirstInteraction, true);
    window.addEventListener('keydown', onFirstInteraction, true);
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sfx.enabled', String(enabled));
  }, [enabled]);
  useEffect(() => {
    localStorage.setItem('sfx.volume', String(volume));
  }, [volume]);

  const ensureCtx = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  }, []);

  const synth = useCallback((key, opts = {}) => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const v = Math.max(0, Math.min(1, (opts.volume ?? 1) * volume));

    const now = ctx.currentTime;
    const dur = (d) => Math.max(0.02, d);

    const tone = (freq = 880, length = 0.08, type = 'sine', gainLevel = 0.15) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainLevel * v, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur(length));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur(length));
    };

    const noise = (length = 0.2, gainLevel = 0.08, lowpass = 1200) => {
      const bufferSize = Math.floor((ctx.sampleRate || 44100) * length);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate || 44100);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainLevel * v, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur(length));
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now);
      src.stop(now + dur(length));
    };

    switch (key) {
      case 'synth:click':
        return tone(1500, 0.03, 'square', 0.12);
      case 'synth:confirm':
        tone(660, 0.06, 'sine', 0.12);
        setTimeout(() => tone(880, 0.08, 'sine', 0.12), 60);
        return;
      case 'synth:voting_start':
        tone(523, 0.06); setTimeout(() => tone(659, 0.06), 70); setTimeout(() => tone(784, 0.08), 140);
        return;
      case 'synth:round_start':
        tone(392, 0.06); setTimeout(() => tone(523, 0.06), 70); setTimeout(() => tone(659, 0.1), 140);
        return;
      case 'synth:round_end':
        tone(659, 0.06); setTimeout(() => tone(523, 0.06), 70); setTimeout(() => tone(392, 0.1), 140);
        return;
      case 'synth:game_end':
        tone(523, 0.12); setTimeout(() => tone(659, 0.12), 120); setTimeout(() => tone(784, 0.18), 240);
        return;
      case 'synth:turn_start':
        return tone(988, 0.08, 'triangle', 0.14);
      case 'synth:guess_ping':
        // Use the exact same sound profile as 'turn_start' per requirement
        return tone(988, 0.08, 'triangle', 0.14);
      case 'synth:steal':
        return noise(0.25, 0.09, 1400);
      case 'synth:toggle':
        return tone(440, 0.05, 'sine', 0.1);
      default:
        // generic tiny beep
        return tone(880, 0.05, 'square', 0.08);
    }
  }, [ensureCtx, volume]);

  // Build audio pools lazily when a sound is first requested
  const getPool = useCallback((key) => {
    if (!poolsRef.current[key]) {
      const src = soundMap[key];
      if (!src || String(src).startsWith('synth:')) return null;
      const nodes = Array.from({ length: poolSize }).map(() => {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        a.crossOrigin = 'anonymous';
        return a;
      });
      poolsRef.current[key] = { nodes, idx: 0 };
    }
    return poolsRef.current[key];
  }, [soundMap, poolSize]);

  const play = useCallback((key, opts = {}) => {
    if (!enabled) return;
    // Most browsers require a user gesture before audio playback
    if (!userInteractedRef.current) return;
    // Synth path
    const src = soundMap[key];
    if (!src || String(src).startsWith('synth:')) {
      synth(String(src || 'synth:beep'), opts);
      return;
    }

    const pool = getPool(key);
    if (!pool) { synth('synth:beep', opts); return; }
    const node = pool.nodes[pool.idx];
    pool.idx = (pool.idx + 1) % pool.nodes.length;

    try {
      node.currentTime = 0;
      node.volume = Math.max(0, Math.min(1, (opts.volume ?? 1) * volume));
      if (opts.playbackRate && node.playbackRate !== undefined) {
        node.playbackRate = opts.playbackRate;
      }
      const p = node.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch (e) {
      synth('synth:beep', opts);
    }
  }, [enabled, volume, getPool, soundMap, synth]);

  const value = useMemo(() => ({
    play,
    enabled,
    setEnabled,
    volume,
    setVolume,
  }), [play, enabled, volume]);

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSfx() {
  return useContext(SoundContext);
}
