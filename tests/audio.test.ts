import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Microphone, microphoneError } from '../src/audio';
let track: {
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  onmute: (() => void) | null;
};
let contexts: {
  close: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  state: string;
  onstatechange: (() => void) | null;
}[];
beforeEach(() => {
  track = { stop: vi.fn(), onended: null, onmute: null };
  contexts = [];
  class FakeAudioContext {
    state = 'running';
    onstatechange = null;
    close = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
    constructor() {
      contexts.push(this);
    }
    createAnalyser() {
      return { fftSize: 0, disconnect: vi.fn(), getFloatTimeDomainData: vi.fn() };
    }
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect: vi.fn() };
    }
  }
  vi.stubGlobal('window', { isSecureContext: true, AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
  });
});
afterEach(() => vi.unstubAllGlobals());
it('releases stream and context; stop is idempotent', async () => {
  const m = new Microphone();
  await m.start();
  m.stop();
  m.stop();
  expect(track.stop).toHaveBeenCalledOnce();
  expect(contexts[0].close).toHaveBeenCalledOnce();
  expect(track.onended).toBeNull();
});
it('releases late streams after permission cancellation', async () => {
  let resolve!: (stream: MediaStream) => void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const m = new Microphone();
  const pending = m.start();
  await Promise.resolve();
  m.stop();
  resolve({ getTracks: () => [track] } as unknown as MediaStream);
  expect(await pending).toBe(false);
  expect(track.stop).toHaveBeenCalledOnce();
  expect(contexts[0].close).toHaveBeenCalledOnce();
});
it('cleans up after permission denial', async () => {
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
    new DOMException('denied', 'NotAllowedError'),
  );
  const m = new Microphone();
  await expect(m.start()).rejects.toThrow();
  expect(contexts[0].close).toHaveBeenCalledOnce();
});
it('never requests a stream if cancelled while audio resume was pending', async () => {
  let resolve!: () => void;
  const pendingResume = new Promise<void>((r) => {
    resolve = r;
  });
  const Audio = window.AudioContext;
  class PendingContext extends Audio {
    resume = vi.fn().mockReturnValue(pendingResume);
  }
  vi.stubGlobal('AudioContext', PendingContext);
  const m = new Microphone();
  const pending = m.start();
  m.stop();
  resolve();
  expect(await pending).toBe(false);
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
});
it('notifies the controller on device loss and context interruption', async () => {
  const m = new Microphone();
  m.onLost = vi.fn();
  await m.start();
  track.onended?.();
  track.onmute?.();
  contexts[0].state = 'suspended';
  contexts[0].onstatechange?.();
  expect(m.onLost).toHaveBeenCalledTimes(3);
  m.stop();
});
it('a stale stream cannot replace a newer active input', async () => {
  let resolve!: (stream: MediaStream) => void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const m = new Microphone();
  const first = m.start();
  await Promise.resolve();
  expect(await m.start()).toBe(true);
  const oldTrack = { stop: vi.fn() };
  resolve({ getTracks: () => [oldTrack] } as unknown as MediaStream);
  expect(await first).toBe(false);
  expect(oldTrack.stop).toHaveBeenCalledOnce();
  expect(track.stop).not.toHaveBeenCalled();
  m.stop();
  expect(track.stop).toHaveBeenCalledOnce();
});
it('rejects insecure origins with next steps', async () => {
  vi.stubGlobal('window', { isSecureContext: false });
  await expect(new Microphone().start()).rejects.toThrow('HTTPS');
});
it('offers demo in unsupported environments', async () => {
  vi.stubGlobal('navigator', {});
  await expect(new Microphone().start()).rejects.toThrow('演示模式');
});
it('explains expected device failures', () => {
  for (const name of [
    'NotAllowedError',
    'NotFoundError',
    'NotReadableError',
    'AbortError',
    'SecurityError',
    'OverconstrainedError',
  ])
    expect(microphoneError(new DOMException('error', name))).toContain('演示模式');
});
