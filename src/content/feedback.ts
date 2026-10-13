/**
 * Learner-facing explanations generated from model results. All numbers are
 * read from the model result, never restated by hand, so text and display agree.
 */
import type { Cause, IntervalResult } from '../model/grid.ts';
import type { CheckResult, StageId } from '../model/route.ts';
import { card } from './cards.ts';

/** Why each stage sits where it does — used when a card is misplaced. */
const PLACEMENT_HINT: Record<StageId, string> = {
  generation: 'Generation comes first: nothing can be delivered until a source makes electricity.',
  transmission: 'Transmission comes right after the plant: tall lines carry electricity the long distance toward town.',
  substation: 'The substation sits where the tall lines end, lowering the voltage before local delivery.',
  distribution: 'Distribution comes after the substation: local lines carry electricity along the street.',
  buildings: 'Buildings come last: they are where electricity is used.',
};

export function routeFeedback(result: CheckResult): string[] {
  if (result.correct) {
    return ['The route is connected: generation → transmission → substation → distribution → buildings. Real grids have many connected paths; this single route is a simplified picture.'];
  }
  const lines: string[] = [];
  if (result.incomplete) lines.push('Some spaces are still empty. Place all five stages, then check again.');
  const seen = new Set<StageId>();
  for (const m of result.mismatches) {
    if (m.placed && !seen.has(m.placed)) {
      seen.add(m.placed);
      lines.push(`${card(m.placed).title} is not in step ${m.slot + 1}. ${PLACEMENT_HINT[m.placed]}`);
    }
  }
  if (lines.length === 0) lines.push('Not quite yet — try again.');
  return lines;
}

export function stageTitle(id: StageId): string {
  return card(id).title;
}

const CAUSE_TEXT: Record<Cause, (r: IntervalResult) => string> = {
  'met-by-generation': (r) => `Demand met. Available supply (${r.available} PU) covered demand (${r.demand} PU).`,
  'stored-surplus': (r) =>
    `Demand met, and the extra ${r.charge} PU charged the battery. Stored energy went from ${r.storedBefore} to ${r.storedAfter} EU.`,
  'met-with-storage': (r) =>
    `Demand met. Generation and solar gave ${r.available} PU; the battery added ${r.discharge} PU. Stored energy went from ${r.storedBefore} to ${r.storedAfter} EU.`,
  'short-generation': (r) =>
    `Demand not fully met: ${r.unmet} PU short. Available supply (${r.available} PU) was less than demand (${r.demand} PU). Try more generation.`,
  'short-no-solar': (r) =>
    `Demand not fully met: ${r.unmet} PU short. In the evening the solar panels give 0 PU, and the generator alone (${r.generator} PU) cannot cover ${r.demand} PU.`,
  'short-battery-empty': (r) =>
    r.storedBefore === 0
      ? `Demand not fully met: ${r.unmet} PU short. The battery was empty, so it had nothing to give. It needs charging first.`
      : `Demand not fully met: ${r.unmet} PU short. The battery gave its last ${r.discharge} EU and is now empty.`,
  'short-battery-limit': (r) =>
    `Demand not fully met: ${r.unmet} PU short. The battery can give at most 2 PU per interval, and generation (${r.available} PU) was too low to cover the rest.`,
  'short-battery-idle': (r) =>
    `Demand not fully met: ${r.unmet} PU short. The battery holds ${r.storedBefore} EU but was set to idle, so it did not help.`,
};

export function intervalFeedback(r: IntervalResult): string {
  let text = CAUSE_TEXT[r.cause](r);
  if (r.batteryFull) text += ' The battery was already full, so it could not store more.';
  if (r.unused > 0) text += ` ${r.unused} PU of available output was reduced / not used in this model.`;
  return text;
}

export const MODEL_LIMITS =
  'PU and EU are fictional teaching units, not real neighborhood use. The battery is idealized with no losses — real storage loses some energy. One Run is one model hour.';
