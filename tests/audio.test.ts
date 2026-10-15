import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Microphone, microphoneError } from '../src/audio';
let track: {
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  onmute: (() => void) | null;
};
let contexts: { close: ReturnType<typeof vi.fn> }[];
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
