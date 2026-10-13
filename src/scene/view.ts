/**
 * The contract both presentations implement — the 3D CityScene and the
 * semantic 2D FlatScene. Views know nothing about lesson rules: the app tells
 * them what to show, and every number comes from GridModel.
 */
import type { InfrastructureId } from '../content/types.ts';
import type { BatteryMode, Period } from '../model/grid.ts';

export type Bookmark = 'overview' | 'generation' | 'transmission' | 'substation' | 'street';

/** Which camera bookmark frames each selectable part. */
export const BOOKMARK_FOR: Record<InfrastructureId, Bookmark> = {
  generation: 'generation',
  transmission: 'transmission',
  substation: 'substation',
  solar: 'substation',
  battery: 'substation',
  distribution: 'street',
  buildings: 'street',
};

export const SELECTABLE: InfrastructureId[] = ['generation', 'transmission', 'substation', 'solar', 'battery', 'distribution', 'buildings'];

export interface ViewState {
  period: Period;
  /** Number of route segments lit, counted from the source (0–5). */
  routeLit: number;
  /**
   * Neighborhood supply in the last interval run:
   * `off`   — the route is not connected, nothing delivered;
   * `ready` — connected, no interval run yet in this period;
   * `full`  — demand met; `short` — demand not fully met.
   */
  supply: 'off' | 'ready' | 'full' | 'short';
  stored: number;
  capacity: number;
  battery: BatteryMode;
  /** Explanatory flow overlay along the route (not electron speed). */
  flow: boolean;
  /** Which parts are visible as hotspots (Learn hides solar and battery until the experiment). */
  visible: InfrastructureId[];
  /** Stages already inspected — shown with a check mark. */
  visited: InfrastructureId[];
}

export interface CityView {
  setState(state: ViewState): void;
  setSelected(id: InfrastructureId | null): void;
  frame(bookmark: Bookmark): void;
  resetView(): void;
  /** Explore allows limited orbit and zoom; guided steps keep the camera on bookmarks. */
  setFreeCamera(on: boolean): void;
  setReducedMotion(on: boolean): void;
  dispose(): void;
}

export interface ViewOptions {
  onSelect: (id: InfrastructureId) => void;
  reducedMotion: boolean;
  labels: Record<InfrastructureId, string>;
}
