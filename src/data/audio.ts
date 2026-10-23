// Web Audio API Synthesizer for Guild Wars 2 Overlay Sounds
// No external audio files needed; crisp, instant acoustic feedback

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a sparkling fantasy chime when copying waypoint and time to clipboard
 */
export function playCopyChime(volume = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.min(1, Math.max(0, volume * 0.4)), now);
  masterGain.connect(ctx.destination);

  // Note 1 (E6 - 1318.5 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(1318.5, now);
  gain1.gain.setValueAtTime(0.7, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.35);

  // Note 2 (B6 - 1975.5 Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1975.5, now + 0.08);
  gain2.gain.setValueAtTime(0.8, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.45);
}

/**
 * Play a dramatic boss spawn horn/bell chime for countdown alarms
 */
export function playBossAlert(volume = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.min(1, Math.max(0, volume * 0.5)), now);
  masterGain.connect(ctx.destination);

  // Low horn note (D3 -> A3 chord)
  const freqs = [146.83, 220.0, 293.66];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.8);
  });
}
