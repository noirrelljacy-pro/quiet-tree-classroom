import { describe, it, expect, vi } from 'vitest';
import { initialState, advance, smooth } from '../src/engine';
import { DEFAULTS, RULES } from '../src/config';
import { feedback, treeVisual, elapsedLabel } from '../src/visual-model';
import { createVolumeView, setStyle, setText, setAttribute } from '../src/dom';
import { createTreeRenderer } from '../src/tree';

function fakeNode(dataset: Record<string, string> = {}) {
  const properties = new Map<string, string>();
  const attributes = new Map<string, string>();
  const writes = vi.fn();
  let text = '';
  return {
    dataset,
    writes,
    style: {
      getPropertyValue: (key: string) => properties.get(key) ?? '',
      setProperty: (key: string, value: string) => {
        writes();
        properties.set(key, value);
      },
    },
    get textContent() {
      return text;
    },
    set textContent(value: string) {
      writes();
      text = value;
    },
    getAttribute: (key: string) => attributes.get(key) ?? null,
    setAttribute: (key: string, value: string) => {
      writes();
      attributes.set(key, value);
    },
  };
}
describe('continuous tree presentation', () => {
  it('starts as a visible seedling and grows before the first stage boundary', () => {
    const a = treeVisual(initialState()),
      b = treeVisual({ ...initialState(), progress: 0.03 });
    expect(a.seedlingOpacity).toBe(1);
    expect(a.adultOpacity).toBe(0);
    expect(b.seedlingScale).toBeGreaterThan(a.seedlingScale);
  });
  it('does not jump in size at 25% or 65%', () => {
    for (const point of [0.25, 0.65]) {
      const a = treeVisual({ ...initialState(), progress: point - 0.0001 });
      const b = treeVisual({ ...initialState(), progress: point + 0.0001 });
      expect(Math.abs(a.adultScale - b.adultScale)).toBeLessThan(0.001);
      expect(Math.abs(a.adultOpacity - b.adultOpacity)).toBeLessThan(0.001);
      a.foliage.forEach((v, i) => expect(Math.abs(v - b.foliage[i])).toBeLessThan(0.002));
    }
  });
  it('unfurls every cohort monotonically with bounded transforms', () => {
    let previous = treeVisual(initialState());
    for (let i = 1; i <= 100; i++) {
      const current = treeVisual({ ...initialState(), progress: i / 100 });
      expect(current.adultScale).toBeGreaterThanOrEqual(previous.adultScale);
      current.foliage.forEach((v, j) => {
        expect(v).toBeGreaterThanOrEqual(previous.foliage[j]);
        expect(v).toBeLessThanOrEqual(1);
      });
      previous = current;
    }
    expect(previous.foliage).toEqual([1, 1, 1, 1]);
  });
  it('shows fruit only at the goal and reverses droop with health recovery', () => {
    expect(treeVisual({ ...initialState(), progress: 0.99 }).fruit).toBe(false);
    expect(treeVisual({ ...initialState(), progress: 1, phase: 'fruit' }).fruit).toBe(true);
    expect(treeVisual({ ...initialState(), health: 0.5 }).droop).toBeGreaterThan(
      treeVisual({ ...initialState(), health: 0.9 }).droop,
    );
  });
  it('bounds malformed visual inputs without affecting engine state', () => {
    const s = { ...initialState(), progress: Infinity, health: -10 };
    const v = treeVisual(s);
    expect(Number.isFinite(v.adultScale)).toBe(true);
    expect(v.droop).toBe(64);
    expect(s.health).toBe(-10);
  });
});
describe('explainable feedback', () => {
  it('distinguishes observing, warning, wilting and quiet recovery', () => {
    const noise = { ...initialState(), noisy: true, noiseSeconds: 1 };
    expect(feedback(noise, DEFAULTS).label).toBe('先等等看');
    expect(feedback({ ...noise, noiseSeconds: 4 }, DEFAULTS).label).toBe('轻一点就好');
    expect(feedback({ ...noise, noiseSeconds: 9, health: 0.7 }, DEFAULTS).label).toBe(
      '等一会儿安静',
    );
    expect(
      feedback({ ...noise, noisy: false, quietSeconds: 2.1, health: 0.7 }, DEFAULTS).label,
    ).toBe('叶片正在舒展');
  });
  it('reflects manual tolerance in its reason and progress', () => {
    const v = feedback(
      { ...initialState(), noisy: true, noiseSeconds: 5 },
      { ...DEFAULTS, tolerance: 12 },
    );
    expect(v.detail).toContain('12');
    expect(v.amount).toBeCloseTo(5 / 12);
  });
  it('counts only finite positive session time', () => {
    expect(elapsedLabel(65.9)).toBe('01:05');
    expect(elapsedLabel(-1)).toBe('00:00');
    expect(elapsedLabel(NaN)).toBe('00:00');
  });
  it('a smoothed 0.8-second demo pulse never reaches a penalty and quiet resumes growth', () => {
    let state = initialState(),
      level = 20,
      worstHealth = 1;
    const phases = new Set<string>();
    for (let i = 0; i < 900; i++) {
      level = smooth(level, i >= 180 && i < 180 + RULES.demoPulseSeconds * 60 ? 80 : 20, 1 / 60);
      state = advance(state, level, 1 / 60, DEFAULTS);
      worstHealth = Math.min(worstHealth, state.health);
      phases.add(state.phase);
    }
    expect(phases.has('warning')).toBe(false);
    expect(phases.has('wilting')).toBe(false);
    expect(worstHealth).toBe(1);
    expect(state.progress).toBeGreaterThan(0);
  });
});
describe('rendering work stays proportional to visual changes', () => {
  it('skips equal text, styles and attributes', () => {
    const n = fakeNode();
    const e = n as unknown as HTMLElement;
    for (let i = 0; i < 120; i++) {
      setText(e, '安静');
      setStyle(e, 'opacity', '1');
      setAttribute(e, 'role', 'meter');
    }
    expect(n.writes).toHaveBeenCalledTimes(3);
  });
  it('does no additional meter DOM writes across 120 stable frames', () => {
    const fill = fakeNode(),
      number = fakeNode(),
      meter = fakeNode();
    const draw = createVolumeView(
      fill as unknown as HTMLElement,
      number as unknown as HTMLElement,
      meter as unknown as HTMLElement,
    );
    draw(20);
    const baseline =
      fill.writes.mock.calls.length +
      number.writes.mock.calls.length +
      meter.writes.mock.calls.length;
    for (let i = 0; i < 120; i++) draw(20);
    expect(
      fill.writes.mock.calls.length +
        number.writes.mock.calls.length +
        meter.writes.mock.calls.length,
    ).toBe(baseline);
    expect(fill.style.getPropertyValue('width')).toBe('');
    expect(fill.style.getPropertyValue('transform')).toBe('scaleX(0.200)');
  });
  it('distinguishes a live zero from paused, and bounds out-of-range input', () => {
    const fill = fakeNode(),
      number = fakeNode(),
      meter = fakeNode();
    const draw = createVolumeView(
      fill as unknown as HTMLElement,
      number as unknown as HTMLElement,
      meter as unknown as HTMLElement,
    );
    draw(0);
    expect(number.textContent).toBe('0');
    draw(null);
    expect(number.textContent).toBe('—');
    draw(150);
    expect(meter.getAttribute('aria-valuenow')).toBe('100');
    draw(NaN);
    expect(meter.getAttribute('aria-valuenow')).toBe('0');
  });
  it('caches tree nodes, leaves stable frames untouched and updates fruit exactly when achieved', () => {
    const nodes = new Map(
      ['#adult-tree', '#seedling', '#tree-fruits', '#celebration', '#branches', 'title'].map(
        (key) => [key, fakeNode()],
      ),
    );
    const leaves = [
      fakeNode({ cohort: '0', direction: '-1' }),
      fakeNode({ cohort: '3', direction: '1' }),
    ];
    const root = Object.assign(fakeNode(), {
      querySelector: vi.fn((key: string) => nodes.get(key)),
      querySelectorAll: vi.fn((key: string) => (key === '.leaf-motion' ? leaves : [])),
    });
    const draw = createTreeRenderer(root as unknown as HTMLElement);
    const state = { ...initialState(), progress: 0.5 };
    draw(state);
    const count = () =>
      [root, ...nodes.values(), ...leaves].reduce((sum, n) => sum + n.writes.mock.calls.length, 0);
    const first = count();
    for (let i = 0; i < 120; i++) draw({ ...state, elapsed: i });
    expect(count()).toBe(first);
    expect(root.querySelector).toHaveBeenCalledTimes(6);
    draw({ ...state, progress: 1, phase: 'fruit' });
    expect(nodes.get('#tree-fruits')!.style.getPropertyValue('opacity')).toBe('1');
    expect(root.getAttribute('data-stage')).toBe('3');
    expect(nodes.get('title')!.textContent).toContain('果实');
  });
});

it('does not repeat writes after browser-normalized CSS serialization', () => {
  let actual = '';
  const write = vi.fn((_key: string, value: string) => {
    actual = String(Number(value));
  });
  const node = {
    style: { getPropertyValue: () => actual, setProperty: write },
  } as unknown as HTMLElement;
  for (let i = 0; i < 120; i++) setStyle(node, 'opacity', '1.000');
  expect(write).toHaveBeenCalledOnce();
});
it('restores owned styles if another writer changes the serialized value', () => {
  let actual = '';
  const write = vi.fn((_key: string, value: string) => {
    actual = String(Number(value));
  });
  const node = {
    style: { getPropertyValue: () => actual, setProperty: write },
  } as unknown as HTMLElement;
  setStyle(node, 'opacity', '1.000');
  actual = '0';
  setStyle(node, 'opacity', '1.000');
  expect(actual).toBe('1');
  expect(write).toHaveBeenCalledTimes(2);
});
