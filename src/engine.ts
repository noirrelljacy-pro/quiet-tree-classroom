import { RULES, type Settings } from './config';
export type Phase = 'idle' | 'growing' | 'warning' | 'wilting' | 'recovering' | 'fruit';
export interface TreeState {
  phase: Phase;
  progress: number;
  health: number;
  noisy: boolean;
  noiseSeconds: number;
  quietSeconds: number;
  elapsed: number;
}
export function initialState(): TreeState {
  return {
    phase: 'idle',
    progress: 0,
    health: 1,
    noisy: false,
    noiseSeconds: 0,
    quietSeconds: 0,
    elapsed: 0,
  };
}
// Pure transition: input and rendering have no ownership of the rules.
export function advance(
  state: TreeState,
  level: number,
  seconds: number,
  settings: Settings,
  running = true,
): TreeState {
  if (
    !running ||
    state.phase === 'fruit' ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(level)
  )
    return state;
  const dt = Math.min(seconds, RULES.maxFrameSeconds);
  const s = { ...state, elapsed: state.elapsed + dt };
  s.noisy = s.noisy ? level > settings.threshold - RULES.hysteresis : level > settings.threshold;
  if (s.noisy) {
    s.noiseSeconds += dt;
    s.quietSeconds = 0;
    if (s.noiseSeconds >= settings.tolerance) {
      s.phase = 'wilting';
      s.health = Math.max(0.25, s.health - dt / RULES.wiltSeconds);
    } else if (s.noiseSeconds >= RULES.warningSeconds) s.phase = 'warning';
    else if (s.phase === 'idle') s.phase = 'growing';
  } else {
    s.quietSeconds += dt;
    if (s.quietSeconds >= RULES.quietBuffer) {
      s.noiseSeconds = 0;
      if (s.health < 1) {
        s.phase = 'recovering';
        s.health = Math.min(1, s.health + dt / RULES.recoverySeconds);
      } else {
        s.phase = 'growing';
        s.progress = Math.min(1, s.progress + dt / settings.growthSeconds);
      }
      if (s.progress >= 1) s.phase = 'fruit';
    } else if (s.phase === 'idle') s.phase = 'growing';
  }
  return s;
}
export function smooth(previous: number, next: number, seconds: number): number {
  return (
    previous + (next - previous) * (1 - Math.exp(-Math.max(0, seconds) / RULES.smoothingSeconds))
  );
}
export function relativeVolume(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  // Log-scaled digital RMS, NOT calibrated sound pressure / dB SPL.
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(100, Math.max(0, 100 + (20 * Math.log10(Math.max(rms, 0.00001)) * 100) / 60));
}
