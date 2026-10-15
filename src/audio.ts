import { relativeVolume } from './engine';

export function microphoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const messages: Record<string, string> = {
    NotAllowedError:
      '麦克风未获授权。请在地址栏的网站权限中允许麦克风，然后重试；也可以使用演示模式。',
    NotFoundError: '没有找到麦克风。请连接输入设备后重试，或使用演示模式。',
    NotReadableError:
      '麦克风暂不可用。请检查系统输入权限、关闭占用设备的应用后重试，或使用演示模式。',
    AbortError: '设备连接中断。请检查麦克风连接后重试，或使用演示模式。',
    SecurityError: '浏览器阻止了麦克风。请检查网站及系统权限，或使用演示模式。',
    OverconstrainedError: '当前设备不支持所需输入。请切换麦克风或使用演示模式。',
  };
  return (
    messages[name] ??
    (error instanceof Error ? error.message : '无法启动声音输入，请重试或使用演示模式。')
  );
}
export class Microphone {
  private stream?: MediaStream;
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaStreamAudioSourceNode;
  private data = new Float32Array(2048);
  private generation = 0;
  onLost: () => void = () => {};
  async start(): Promise<boolean> {
    this.stop();
    if (!window.isSecureContext)
      throw new Error('麦克风需要 HTTPS 或 localhost。请通过安全地址打开，或使用演示模式。');
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext)
      throw new Error(
        '当前浏览器不支持声音监测。请使用新版 Chrome、Edge、Firefox 或 Safari，或使用演示模式。',
      );
    const generation = this.generation;
    // No destination connection: input is never played, stored or uploaded.
    const context = new AudioContext();
    this.context = context;
    try {
      await context.resume();
      if (generation !== this.generation) return false;
      if (context.state !== 'running')
        throw new Error('浏览器暂停了音频输入。请点击继续重新启动，或使用演示模式。');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.stream = stream;
      if (context.state !== 'running')
        throw new Error('音频输入已被系统中断。请检查输入设备后点击继续，或使用演示模式。');
      for (const track of stream.getTracks()) {
        track.onended = () => this.onLost();
        track.onmute = () => this.onLost();
      }
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source = context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      context.onstatechange = () => {
        if (generation === this.generation && context.state !== 'running') this.onLost();
      };
      return true;
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        throw error;
      }
      return false;
    }
  }
  read(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.data);
    return relativeVolume(this.data);
  }
  stop(): void {
    this.generation++;
    if (this.stream)
      for (const track of this.stream.getTracks()) {
        track.onended = null;
        track.onmute = null;
        track.stop();
      }
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
    }
    this.stream = undefined;
    this.context = undefined;
    this.analyser = undefined;
    this.source = undefined;
  }
}
