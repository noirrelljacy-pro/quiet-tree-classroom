import { DEFAULT_SPECIES, isSpecies, type SpeciesId } from './species';
import type { TreeState } from './engine';
export const ECONOMY = Object.freeze({ reward: 2, price: 120 });
export const COLLECTION_KEY = 'quiet-tree.collection.v1';
export interface Collection {
  coins: number;
  unlocked: SpeciesId[];
  selected: SpeciesId;
}
export function emptyCollection(): Collection {
  return { coins: 0, unlocked: [DEFAULT_SPECIES], selected: DEFAULT_SPECIES };
}
export function normalizeCollection(input: unknown): Collection {
  if (!input || typeof input !== 'object') return emptyCollection();
  const v = input as Partial<Collection>;
  const unlocked = [
    ...new Set([
      DEFAULT_SPECIES,
      ...(Array.isArray(v.unlocked) ? v.unlocked.filter(isSpecies) : []),
    ]),
  ];
  return {
    coins:
      Number.isSafeInteger(v.coins) && v.coins! >= 0 && v.coins! <= 1_000_000_000 ? v.coins! : 0,
    unlocked,
    selected: isSpecies(v.selected) && unlocked.includes(v.selected) ? v.selected : DEFAULT_SPECIES,
  };
}
export type PurchaseResult = 'unlocked' | 'owned' | 'insufficient' | 'invalid';
export function purchase(
  collection: Collection,
  id: unknown,
): { collection: Collection; result: PurchaseResult } {
  if (!isSpecies(id)) return { collection, result: 'invalid' };
  if (collection.unlocked.includes(id)) return { collection, result: 'owned' };
  if (collection.coins < ECONOMY.price) return { collection, result: 'insufficient' };
  return {
    collection: {
      ...collection,
      coins: collection.coins - ECONOMY.price,
      unlocked: [...collection.unlocked, id],
    },
    result: 'unlocked',
  };
}
export function selectSpecies(collection: Collection, id: SpeciesId): Collection {
  return collection.unlocked.includes(id) ? { ...collection, selected: id } : collection;
}
// Mark before asynchronous persistence. A round itself is never restored from storage.
export class RoundReward {
  private demo = false;
  private claimed = false;
  useDemo() {
    this.demo = true;
  }
  get isDemo() {
    return this.demo;
  }
  complete(previous: TreeState, next: TreeState): 'classroom' | 'demo' | null {
    if (this.claimed || previous.phase === 'fruit' || next.phase !== 'fruit' || next.progress !== 1)
      return null;
    this.claimed = true;
    return this.demo ? 'demo' : 'classroom';
  }
}
export type CollectionAction =
  { type: 'reward' } | { type: 'purchase'; id: SpeciesId } | { type: 'select'; id: SpeciesId };
export function applyCollectionAction(collection: Collection, action: CollectionAction) {
  if (action.type === 'purchase') return purchase(collection, action.id);
  if (action.type === 'select')
    return { collection: selectSpecies(collection, action.id), result: 'selected' as const };
  return {
    collection: {
      ...collection,
      coins: Math.min(1_000_000_000, collection.coins + ECONOMY.reward),
    },
    result: 'rewarded' as const,
  };
}
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
type WithLock = <T>(task: () => T) => Promise<T>;
// Without Web Locks or writable storage, explicitly use a temporary collection.
export class CollectionStore {
  value = emptyCollection();
  persistent: boolean;
  constructor(
    private storage: StorageLike | null,
    private withLock: WithLock | null,
  ) {
    this.persistent = !!storage && !!withLock;
    this.refresh();
  }
  refresh() {
    if (!this.persistent) return this.value;
    try {
      this.value = normalizeCollection(JSON.parse(this.storage!.getItem(COLLECTION_KEY) ?? 'null'));
    } catch {
      this.persistent = false;
    }
    return this.value;
  }
  async dispatch(action: CollectionAction) {
    const commit = () => {
      this.refresh();
      const outcome = applyCollectionAction(this.value, action);
      this.value = outcome.collection;
      if (this.persistent) {
        try {
          this.storage!.setItem(COLLECTION_KEY, JSON.stringify(this.value));
        } catch {
          this.persistent = false;
        }
      }
      return { ...outcome, saved: this.persistent };
    };
    if (!this.persistent) return commit();
    let entered = false;
    try {
      return await this.withLock!(() => {
        entered = true;
        return commit();
      });
    } catch (error) {
      if (entered) throw error;
      this.persistent = false;
      return commit();
    }
  }
}
export function browserCollectionStore() {
  let storage: StorageLike | null = null;
  try {
    storage = localStorage;
  } catch {
    /* browser policy */
  }
  const withLock: WithLock | null =
    typeof navigator !== 'undefined' && navigator.locks
      ? (task) => navigator.locks.request(COLLECTION_KEY, task)
      : null;
  return new CollectionStore(storage, withLock);
}
