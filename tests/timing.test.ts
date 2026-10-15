import { it, expect } from 'vitest';
import { FrameClock } from '../src/timing';
it('anchors a delayed first frame instead of counting loading time', () => {
  const c = new FrameClock();
  expect(c.step(5000)).toEqual({ seconds: 0, interrupted: false });
  expect(c.step(5016).seconds).toBeCloseTo(0.016);
});
it('tolerates one-second foreground scheduling without a false pause', () => {
  const c = new FrameClock();
  c.step(0);
  expect(c.step(1000.1)).toEqual({ seconds: 0.25, interrupted: false });
  expect(c.step(2000.2)).toEqual({ seconds: 0.25, interrupted: false });
});
it('does not catch up after a true interruption', () => {
  const c = new FrameClock();
  c.step(0);
  expect(c.step(6000)).toEqual({ seconds: 0, interrupted: true });
});
it('reset prevents paused wall time from entering the next round', () => {
  const c = new FrameClock();
  c.step(100);
  c.step(200);
  c.reset();
  expect(c.step(90000).seconds).toBe(0);
  expect(c.step(90016).seconds).toBeCloseTo(0.016);
});
it('rejects nonfinite and reversed timestamps', () => {
  const c = new FrameClock();
  expect(c.step(NaN).interrupted).toBe(true);
  c.step(100);
  expect(c.step(90).interrupted).toBe(true);
});
