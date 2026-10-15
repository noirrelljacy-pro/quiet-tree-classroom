import { RULES } from './config';
export class Calibration {
  elapsed = 0;
  private samples: number[] = [];
  add(level: number, dt: number): boolean {
    if (
      Number.isFinite(level) &&
      Number.isFinite(dt) &&
      dt > 0 &&
      this.elapsed < RULES.calibrationSeconds
    ) {
      this.elapsed = Math.min(
        RULES.calibrationSeconds,
        this.elapsed + Math.min(dt, RULES.maxFrameSeconds),
      );
      this.samples.push(Math.min(100, Math.max(0, level)));
    }
    return this.elapsed >= RULES.calibrationSeconds;
  }
  result(): number | null {
    if (this.elapsed < RULES.calibrationSeconds || !this.samples.length) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return Math.round(
      Math.min(90, Math.max(10, sorted[Math.floor((sorted.length - 1) * 0.8)] + 10)),
    );
  }
}
