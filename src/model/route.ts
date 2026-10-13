/**
 * The five-stage connection exercise (PRD §6 topology model, PC-03).
 *
 * The single route is an instructional simplification: real grids have many
 * interconnected paths. Interaction is select-card → select-slot, so it works
 * the same with mouse, touch and keyboard. No dragging is required.
 */

export type StageId = 'generation' | 'transmission' | 'substation' | 'distribution' | 'buildings';

export const ROUTE_ORDER: readonly StageId[] = ['generation', 'transmission', 'substation', 'distribution', 'buildings'];

/** Authored card order shown to learners — deliberately not the answer. */
export const CARD_ORDER: readonly StageId[] = ['substation', 'buildings', 'generation', 'distribution', 'transmission'];

export interface RouteState {
  slots: (StageId | null)[];
  selected: StageId | null;
  attempts: number;
  connected: boolean;
}

export interface Mismatch {
  slot: number;
  placed: StageId | null;
  expected: StageId;
}

export type CheckResult = { correct: true } | { correct: false; incomplete: boolean; mismatches: Mismatch[] };

export function initialRoute(): RouteState {
  return { slots: ROUTE_ORDER.map(() => null), selected: null, attempts: 0, connected: false };
}

/** A route that is already connected (used by Explore, where the neighborhood starts powered). */
export function connectedRoute(): RouteState {
  return { slots: [...ROUTE_ORDER], selected: null, attempts: 0, connected: true };
}

export function selectCard(state: RouteState, id: StageId | null): RouteState {
  if (state.connected) return state;
  return { ...state, selected: state.selected === id ? null : id };
}

/**
 * Places the selected card in a slot. A card already in another slot moves;
 * a card already in the target slot returns to the tray. Selecting a filled
 * slot with no card selected picks that card back up.
 */
export function placeInSlot(state: RouteState, slot: number): RouteState {
  if (state.connected || slot < 0 || slot >= state.slots.length) return state;
  const slots = [...state.slots];
  if (state.selected === null) {
    const picked = slots[slot];
    if (picked === null) return state;
    slots[slot] = null;
    return { ...state, slots, selected: picked };
  }
  const from = slots.indexOf(state.selected);
  if (from !== -1) slots[from] = null;
  slots[slot] = state.selected;
  return { ...state, slots, selected: null };
}

export function clearSlot(state: RouteState, slot: number): RouteState {
  if (state.connected) return state;
  const slots = [...state.slots];
  slots[slot] = null;
  return { ...state, slots };
}

export function trayCards(state: RouteState): StageId[] {
  return CARD_ORDER.filter((id) => !state.slots.includes(id));
}

export function checkRoute(slots: readonly (StageId | null)[]): CheckResult {
  const mismatches: Mismatch[] = [];
  ROUTE_ORDER.forEach((expected, slot) => {
    if (slots[slot] !== expected) mismatches.push({ slot, placed: slots[slot] ?? null, expected });
  });
  if (mismatches.length === 0) return { correct: true };
  return { correct: false, incomplete: slots.some((s) => s === null), mismatches };
}

export function submitRoute(state: RouteState): { state: RouteState; result: CheckResult } {
  const result = checkRoute(state.slots);
  return {
    state: { ...state, attempts: state.attempts + 1, connected: result.correct, selected: null },
    result,
  };
}

/** How many stages, counted from the source, are already in the right place — used to light the route progressively. */
export function connectedPrefix(slots: readonly (StageId | null)[]): number {
  let n = 0;
  while (n < ROUTE_ORDER.length && slots[n] === ROUTE_ORDER[n]) n++;
  return n;
}
