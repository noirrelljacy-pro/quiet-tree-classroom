import { RULES, type Settings } from './config';
import type { TreeState } from './engine';
export const STAGES = ['幼苗', '小树', '成熟树', '果实'] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
function reveal(value: number, from: number, to: number): number {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}
export function treeVisual(state: TreeState) {
  const p = state.phase === 'fruit' ? 1 : clamp(state.progress);
  return {
    stage: p >= 1 ? 3 : p >= 0.65 ? 2 : p >= 0.25 ? 1 : 0,
    adultScale: 0.32 + 0.68 * Math.sqrt(p),
    adultOpacity: reveal(p, 0.12, 0.24),
    seedlingScale: 0.95 + 0.35 * reveal(p, 0, 0.22),
    seedlingOpacity: 1 - reveal(p, 0.15, 0.24),
    foliage: [
      reveal(p, 0.035, 0.19),
      reveal(p, 0.2, 0.56),
      reveal(p, 0.46, 0.86),
      reveal(p, 0.68, 1),
    ],
    droop: (1 - clamp(state.health)) * 64,
    fruit: state.phase === 'fruit',
  };
}
export function feedback(state: TreeState, settings: Settings) {
  if (state.phase === 'fruit')
    return { label: '果实已达成', detail: '这一轮的专注，结成了果实。', amount: 1, tone: 'quiet' };
  if (state.noisy) {
    const seconds = state.noiseSeconds.toFixed(1);
    if (state.noiseSeconds < RULES.warningSeconds)
      return {
        label: '先等等看',
        detail: `声音已持续 ${seconds} 秒，满 ${RULES.warningSeconds} 秒才提醒。`,
        amount: state.noiseSeconds / RULES.warningSeconds,
        tone: 'observe',
      };
    if (state.noiseSeconds < settings.tolerance)
      return {
        label: '轻一点就好',
        detail: `声音已持续 ${seconds} 秒，满 ${settings.tolerance} 秒才开始下垂。`,
        amount: state.noiseSeconds / settings.tolerance,
        tone: 'warm',
      };
    return {
      label: '等一会儿安静',
      detail: '叶片有点累了，已有成长一直保留。',
      amount: state.health,
      tone: 'warm',
    };
  }
  if (state.quietSeconds < RULES.quietBuffer)
    return {
      label: '正在安静下来',
      detail: `安静保持 ${Math.max(0, state.quietSeconds).toFixed(1)} / ${RULES.quietBuffer} 秒后继续。`,
      amount: state.quietSeconds / RULES.quietBuffer,
      tone: 'quiet',
    };
  if (state.health < 1)
    return {
      label: '叶片正在舒展',
      detail: '慢慢恢复健康后，小树会继续长大。',
      amount: state.health,
      tone: 'quiet',
    };
  return {
    label: '安静正在积累',
    detail: '每一点专注，都在滋养这棵小树。',
    amount: 1,
    tone: 'quiet',
  };
}
export function elapsedLabel(seconds: number): string {
  const total = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
