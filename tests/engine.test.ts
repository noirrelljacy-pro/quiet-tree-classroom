import { describe, expect, it } from 'vitest';
import { advance, initialState, relativeVolume, smooth, type TreeState } from '../src/engine';
import { DEFAULTS, normalizeSettings } from '../src/config';
import { Calibration } from '../src/calibration';
function run(state: TreeState, level: number, seconds: number, settings = DEFAULTS) {
  for (let i = 0; i < Math.round(seconds * 10); i++) state = advance(state, level, 0.1, settings);
  return state;
}
describe('classroom rules', () => {
  it('waits for quiet buffer then grows', () => {
    expect(run(initialState(), 20, 1.9).progress).toBe(0);
    expect(run(initialState(), 20, 4).progress).toBeGreaterThan(0);
  });
  it('does not punish a brief cough or remove growth', () => {
    const grown = run(initialState(), 20, 30);
    const cough = run(grown, 90, 1);
    expect(cough.phase).toBe('growing');
    expect(cough.health).toBe(1);
    expect(cough.progress).toBe(grown.progress);
  });
  it('warns after 3 seconds without wilting', () => {
    const s = run(initialState(), 80, 3.2);
    expect(s.phase).toBe('warning');
    expect(s.health).toBe(1);
  });
  it('wilts only after tolerance and preserves growth', () => {
    const grown = run(initialState(), 20, 30);
    const s = run(grown, 80, 9);
    expect(s.phase).toBe('wilting');
    expect(s.health).toBeLessThan(1);
    expect(s.progress).toBe(grown.progress);
  });
  it('has a health floor during prolonged noise', () => {
    expect(run(initialState(), 80, 100).health).toBe(0.25);
  });
  it('recovers before resuming growth', () => {
    const s = run(initialState(), 80, 13);
    expect(run(s, 20, 1).health).toBe(s.health);
    const recovery = run(s, 20, 3);
    expect(recovery.phase).toBe('recovering');
    expect(recovery.health).toBeGreaterThan(s.health);
    expect(recovery.progress).toBe(s.progress);
    const healed = run(recovery, 20, 15);
    expect(healed.health).toBe(1);
    expect(healed.progress).toBeGreaterThan(s.progress);
  });
  it('freezes all state while paused', () => {
    const s = run(initialState(), 80, 4);
    expect(advance(s, 80, 20, DEFAULTS, false)).toBe(s);
  });
  it('limits long frames', () => {
    expect(advance(initialState(), 20, 400, DEFAULTS).elapsed).toBe(0.25);
  });
  it('uses hysteresis near threshold', () => {
    let s = run(initialState(), 40, 1);
    s = run(s, 34, 1);
    expect(s.noisy).toBe(true);
    s = run(s, 30, 1);
    expect(s.noisy).toBe(false);
  });
  it('clears exposure after two quiet seconds', () => {
    const s = run(initialState(), 80, 2);
    expect(run(s, 20, 1).noiseSeconds).toBeCloseTo(2);
    expect(run(s, 20, 2.1).noiseSeconds).toBe(0);
  });
  it('does not let brief quiet gaps bypass warning', () => {
    let s = initialState();
    for (let i = 0; i < 6; i++) {
      s = run(s, 80, 1);
      s = run(s, 20, 1);
    }
    expect(s.phase).toBe('warning');
  });
  it('supports adjusted speed and terminal fruit', () => {
    const s = run(initialState(), 20, 33, { ...DEFAULTS, growthSeconds: 30 });
    expect(s.phase).toBe('fruit');
    expect(s.progress).toBe(1);
    expect(advance(s, 100, 0.1, DEFAULTS)).toBe(s);
  });
  it('resets without mutating old state', () => {
    const s = run(initialState(), 20, 30);
    expect(initialState().progress).toBe(0);
    expect(initialState().health).toBe(1);
    expect(s.progress).toBeGreaterThan(0);
  });
  it('ignores invalid time and input', () => {
    const s = initialState();
    for (const n of [NaN, Infinity, -1, 0]) expect(advance(s, 20, n, DEFAULTS)).toBe(s);
    expect(advance(s, NaN, 0.1, DEFAULTS)).toBe(s);
  });
});
describe('input and preferences', () => {
  it('maps silence and full scale to bounded relative volume', () => {
    expect(relativeVolume(new Float32Array(10))).toBe(0);
    expect(relativeVolume(new Float32Array())).toBe(0);
    expect(relativeVolume(new Float32Array([1, -1]))).toBe(100);
  });
  it('smooths independently of frame subdivision', () => {
    expect(smooth(0, 100, 0.3)).toBeCloseTo(smooth(smooth(0, 100, 0.15), 100, 0.15));
    expect(smooth(0, 100, 0.3)).toBeLessThan(100);
  });
  it('clamps stored settings and rejects invalid values', () => {
    expect(normalizeSettings({ threshold: 1000, growthSeconds: 0, tolerance: NaN })).toEqual({
      threshold: 90,
      growthSeconds: 30,
      tolerance: 8,
    });
    expect(normalizeSettings({ threshold: '80' })).toEqual(DEFAULTS);
    expect(normalizeSettings(null)).toEqual(DEFAULTS);
  });
});
describe('calibration', () => {
  it('requires five seconds', () => {
    const c = new Calibration();
    expect(c.result()).toBeNull();
    c.add(20, 0.1);
    expect(c.result()).toBeNull();
  });
  it('uses percentile plus margin and ignores isolated spikes', () => {
    const c = new Calibration();
    for (let i = 0; i < 51; i++) c.add(i === 15 ? 99 : 20, 0.1);
    expect(c.result()).toBe(30);
    expect(c.elapsed).toBe(5);
  });
  it('bounds extreme thresholds', () => {
    for (const [input, expected] of [
      [0, 10],
      [100, 90],
    ]) {
      const c = new Calibration();
      for (let i = 0; i < 21; i++) c.add(input, 0.25);
      expect(c.result()).toBe(expected);
    }
  });
  it('rejects invalid samples and caps long frames', () => {
    const c = new Calibration();
    c.add(NaN, 1);
    c.add(20, -1);
    expect(c.elapsed).toBe(0);
    c.add(20, 200);
    expect(c.elapsed).toBe(0.25);
  });
});
