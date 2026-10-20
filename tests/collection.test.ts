import { describe, expect, it, vi } from 'vitest';
import { advance, initialState } from '../src/engine';
import { DEFAULTS } from '../src/config';
import { SPECIES, isSpecies } from '../src/species';
import { treeMarkup, speciesPreview } from '../src/tree';
import {
  ECONOMY,
  COLLECTION_KEY,
  emptyCollection,
  normalizeCollection,
  purchase,
  selectSpecies,
  RoundReward,
  CollectionStore,
  applyCollectionAction,
} from '../src/collection';

function grow(reward: RoundReward) {
  let state = initialState();
  const claims: string[] = [];
  for (let i = 0; i < 300; i++) {
    const previous = state;
    state = advance(state, 20, 0.25, { ...DEFAULTS, growthSeconds: 30 });
    const claim = reward.complete(previous, state);
    if (claim) claims.push(claim);
  }
  return { state, claims };
}
function memoryStorage(initial: unknown = emptyCollection()) {
  let value = JSON.stringify(initial);
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, v: string) => {
      value = v;
    }),
  };
}
function serialLock() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => T): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
}
describe('each complete tree earns exactly two coins', () => {
  it('claims once even after many terminal frames and repeated completion callbacks', () => {
    const gate = new RoundReward();
    const { state, claims } = grow(gate);
    expect(claims).toEqual(['classroom']);
    expect(state.phase).toBe('fruit');
    expect(gate.complete(initialState(), state)).toBeNull();
    expect(applyCollectionAction(emptyCollection(), { type: 'reward' }).collection.coins).toBe(2);
  });
  it('does not reward partial progress, pause, noise or reset', () => {
    const gate = new RoundReward();
    let state = { ...initialState(), progress: 0.99 };
    for (let i = 0; i < 80; i++) {
      const previous = state;
      state = advance(state, 75, 0.25, DEFAULTS);
      expect(gate.complete(previous, state)).toBeNull();
    }
    const paused = advance(state, 20, 0.25, DEFAULTS, false);
    expect(gate.complete(state, paused)).toBeNull();
    expect(gate.complete(state, initialState())).toBeNull();
    expect(state.health).toBeLessThan(1);
  });
  it('new round has its own claim, keeping the existing wallet', () => {
    let collection = emptyCollection();
    for (let n = 0; n < 60; n++) {
      expect(grow(new RoundReward()).claims).toEqual(['classroom']);
      collection = applyCollectionAction(collection, { type: 'reward' }).collection;
    }
    expect(collection.coins).toBe(120);
    expect(ECONOMY).toEqual({ reward: 2, price: 120 });
  });
  it('any simulated input permanently classifies that round as demo', () => {
    const gate = new RoundReward();
    gate.useDemo();
    expect(gate.isDemo).toBe(true);
    expect(grow(gate).claims).toEqual(['demo']);
    expect(new RoundReward().isDemo).toBe(false);
  });
});
describe('unlock and selection boundaries', () => {
  it('grants only the initial camphor for a new visitor', () => {
    expect(emptyCollection()).toEqual({ coins: 0, unlocked: ['camphor'], selected: 'camphor' });
    expect(purchase(emptyCollection(), 'camphor').result).toBe('owned');
  });
  it('119 cannot buy, 120 buys once, repeated buy cannot charge again', () => {
    const insufficient = { ...emptyCollection(), coins: 119 };
    expect(purchase(insufficient, 'maple')).toEqual({
      collection: insufficient,
      result: 'insufficient',
    });
    const first = purchase({ ...emptyCollection(), coins: 120 }, 'maple');
    expect(first.result).toBe('unlocked');
    expect(first.collection.coins).toBe(0);
    expect(first.collection.unlocked).toEqual(['camphor', 'maple']);
    expect(purchase(first.collection, 'maple')).toEqual({
      collection: first.collection,
      result: 'owned',
    });
  });
  it('all paid species cost exactly 120 and remain reusable', () => {
    let c = { ...emptyCollection(), coins: 480 };
    for (const s of SPECIES.slice(1)) {
      const result = purchase(c, s.id);
      expect(result.collection.coins).toBe(c.coins - 120);
      c = selectSpecies(result.collection, s.id);
      expect(c.selected).toBe(s.id);
    }
    expect(c.coins).toBe(0);
    expect(c.unlocked).toHaveLength(5);
    expect(selectSpecies(c, 'camphor').coins).toBe(0);
  });
  it('does not select locked or unknown species', () => {
    const c = emptyCollection();
    expect(selectSpecies(c, 'pine')).toBe(c);
    expect(purchase(c, 'unknown').result).toBe('invalid');
    expect(isSpecies('__proto__')).toBe(false);
  });
  it('rejects malformed coin balances and filters unknown unlocks', () => {
    for (const coins of [-1, 1.5, NaN, Infinity, '120', 1e15])
      expect(normalizeCollection({ coins }).coins).toBe(0);
    expect(
      normalizeCollection({ coins: 118, unlocked: ['pine', 'pine', 'bogus'], selected: 'maple' }),
    ).toEqual({ coins: 118, unlocked: ['camphor', 'pine'], selected: 'camphor' });
    expect(normalizeCollection(null)).toEqual(emptyCollection());
  });
});
describe('local collection persistence and cross-tab consistency', () => {
  it('reload preserves earned coins, ownership and chosen tree', async () => {
    const storage = memoryStorage({ ...emptyCollection(), coins: 118 });
    const lock = serialLock();
    const store = new CollectionStore(storage, lock);
    await store.dispatch({ type: 'reward' });
    await store.dispatch({ type: 'purchase', id: 'ginkgo' });
    await store.dispatch({ type: 'select', id: 'ginkgo' });
    const reloaded = new CollectionStore(storage, lock);
    expect(reloaded.value).toEqual({
      coins: 0,
      unlocked: ['camphor', 'ginkgo'],
      selected: 'ginkgo',
    });
    expect(storage.setItem).toHaveBeenLastCalledWith(
      COLLECTION_KEY,
      JSON.stringify(reloaded.value),
    );
  });
  it('serializes two tabs, keeping both rewards instead of stale overwrite', async () => {
    const storage = memoryStorage();
    const lock = serialLock();
    const a = new CollectionStore(storage, lock),
      b = new CollectionStore(storage, lock);
    await Promise.all([a.dispatch({ type: 'reward' }), b.dispatch({ type: 'reward' })]);
    expect(a.refresh().coins).toBe(4);
    expect(b.refresh().coins).toBe(4);
  });
  it('concurrent duplicate unlock charges once and two different purchases cannot overspend', async () => {
    const storage = memoryStorage({ ...emptyCollection(), coins: 120 });
    const lock = serialLock();
    const a = new CollectionStore(storage, lock),
      b = new CollectionStore(storage, lock);
    const results = await Promise.all([
      a.dispatch({ type: 'purchase', id: 'maple' }),
      b.dispatch({ type: 'purchase', id: 'maple' }),
      b.dispatch({ type: 'purchase', id: 'pine' }),
    ]);
    expect(results.map((r) => r.result)).toEqual(['unlocked', 'owned', 'insufficient']);
    expect(a.refresh().coins).toBe(0);
    expect(a.value.unlocked).toEqual(['camphor', 'maple']);
  });
  it('write failure keeps session rewards without repeatedly rereading stale data', async () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementation(() => {
      throw Error('quota');
    });
    const store = new CollectionStore(storage, serialLock());
    expect((await store.dispatch({ type: 'reward' })).saved).toBe(false);
    await store.dispatch({ type: 'reward' });
    expect(store.value.coins).toBe(4);
    expect(store.persistent).toBe(false);
  });
  it('malformed JSON, read failure and no locks fall back without overwriting storage', async () => {
    const bad = memoryStorage();
    bad.getItem.mockReturnValue('{broken');
    for (const store of [
      new CollectionStore(bad, serialLock()),
      new CollectionStore(memoryStorage(), null),
      new CollectionStore(null, serialLock()),
    ]) {
      expect((await store.dispatch({ type: 'reward' })).saved).toBe(false);
      expect(store.value.coins).toBe(2);
    }
    expect(bad.setItem).not.toHaveBeenCalled();
    const denied = memoryStorage();
    denied.getItem.mockImplementation(() => {
      throw Error('denied');
    });
    expect(new CollectionStore(denied, serialLock()).persistent).toBe(false);
  });
  it('lock refusal falls back to temporary storage with one reward, never doubles', async () => {
    const storage = memoryStorage();
    const store = new CollectionStore(storage, async () => {
      throw Error('denied');
    });
    const result = await store.dispatch({ type: 'reward' });
    expect(result.saved).toBe(false);
    expect(result.collection.coins).toBe(2);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('demo rewards and purchases never reach the classroom store', () => {
    const storage = memoryStorage({ ...emptyCollection(), coins: 120 });
    const store = new CollectionStore(storage, serialLock());
    let demo = emptyCollection();
    demo = applyCollectionAction(demo, { type: 'reward' }).collection;
    expect(demo.coins).toBe(2);
    expect(purchase(demo, 'maple').result).toBe('insufficient');
    expect(store.value.coins).toBe(120);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
describe('original species illustrations', () => {
  it('has five distinct silhouettes, each with all growth cohorts and a single accessible title', () => {
    const markup = SPECIES.map((s) => treeMarkup(s.id));
    expect(new Set(markup).size).toBe(5);
    for (const [i, html] of markup.entries()) {
      expect(html).toContain('data-species="' + SPECIES[i].id + '"');
      expect(html.match(/class="leaf-motion"/g)).toHaveLength(31);
      for (let cohort = 0; cohort < 4; cohort++)
        expect(html).toContain('data-cohort="' + cohort + '"');
      expect(html.match(/<title/g)).toHaveLength(1);
    }
  });
  it('shop previews have no IDs, external requests or interactive controls', () => {
    for (const species of SPECIES) {
      const html = speciesPreview(species.id);
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/id=|https?:|url\(|<image|<button/);
    }
  });
});
