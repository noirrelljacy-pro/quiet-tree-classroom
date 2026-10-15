import { RULES } from './config';
/** Anchor to the first delivered frame, never to a different clock sample. */
export class FrameClock {
  private previous: number | null = null;
  reset(): void {
    this.previous = null;
  }
  step(timestamp: number): { seconds: number; interrupted: boolean } {
    if (!Number.isFinite(timestamp)) return { seconds: 0, interrupted: true };
    if (this.previous === null) {
      this.previous = timestamp;
      return { seconds: 0, interrupted: false };
    }
    const delta = (timestamp - this.previous) / 1000;
    this.previous = timestamp;
    if (delta < 0 || delta > RULES.interruptionSeconds) return { seconds: 0, interrupted: true };
    return { seconds: Math.min(delta, RULES.maxFrameSeconds), interrupted: false };
  }
}
