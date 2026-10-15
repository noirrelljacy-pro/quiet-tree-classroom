export interface Settings {
  threshold: number;
  growthSeconds: number;
  tolerance: number;
}
export const DEFAULTS: Readonly<Settings> = Object.freeze({
  threshold: 35,
  growthSeconds: 180,
  tolerance: 8,
});
export const RULES = Object.freeze({
  warningSeconds: 3,
  quietBuffer: 2,
  hysteresis: 4,
  wiltSeconds: 16,
  recoverySeconds: 10,
  calibrationSeconds: 5,
  smoothingSeconds: 0.3,
  maxFrameSeconds: 0.25,
  interruptionSeconds: 2.5,
  demoPulseSeconds: 0.8,
});
export const LIMITS = {
  threshold: [10, 90],
  growthSeconds: [30, 600],
  tolerance: [4, 20],
} as const;
export function normalizeSettings(input: unknown): Settings {
  const value = input && typeof input === 'object' ? (input as Partial<Settings>) : {};
  const result = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const n = value[key];
    if (typeof n === 'number' && Number.isFinite(n))
      result[key] = Math.round(Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], n)));
  }
  return result;
}
