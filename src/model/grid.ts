/**
 * GridModel — the deterministic teaching model from PRD §6.
 *
 * Pure functions only: no rendering, timers, randomness or I/O. Every number
 * the learner sees comes from here, so the 3D scene, the 2D presentation and
 * the tests all agree. Values are fictional teaching units, not measured data:
 *   PU — power units (a rate), EU — stored-energy units.
 * One Run advances exactly one model hour (dt = 1). Storage is idealized: no
 * modeled losses, ramp limits or network constraints.
 */

export type Period = 'day' | 'evening';
export type BatteryMode = 'idle' | 'charge' | 'discharge';

/** Scenario configuration is versioned separately from media (PRD §11). */
export const SCENARIO_VERSION = 1;

export const GENERATOR_MIN = 0;
export const GENERATOR_MAX = 8;
export const SOLAR: Record<Period, number> = { day: 6, evening: 0 };
export const DEMAND: Record<Period, number> = { day: 8, evening: 10 };
export const BATTERY_CAPACITY = 6;
export const BATTERY_RATE = 2;
export const INITIAL_STORED = 0;
/** Fixed simulated interval: one model hour. */
export const DT = 1;

export interface Settings {
  period: Period;
  /** Dispatchable generator output G, integer PU. */
  generator: number;
  battery: BatteryMode;
}

/** Why the interval came out the way it did (PC-07). */
export type Cause =
  | 'met-by-generation'
  | 'met-with-storage'
  | 'stored-surplus'
  | 'short-generation'
  | 'short-no-solar'
  | 'short-battery-empty'
  | 'short-battery-limit'
  | 'short-battery-idle';

export interface IntervalResult {
  settings: Settings;
  generator: number;
  solar: number;
  /** A = G + S */
  available: number;
  demand: number;
  /** C — power sent into the battery. */
  charge: number;
  /** B — power taken from the battery. */
  discharge: number;
  served: number;
  unmet: number;
  /** Available output that was reduced / not used in this model. */
  unused: number;
  storedBefore: number;
  storedAfter: number;
  cause: Cause;
  /** Charge mode was chosen but the battery was already full. */
  batteryFull: boolean;
}

export interface Attempt {
  /** 1-based interval number within this scenario. */
  index: number;
  result: IntervalResult;
}

export interface Scenario {
  version: number;
  stored: number;
  attempts: Attempt[];
}

export type Validation = { ok: true } | { ok: false; reason: string };

export function initialScenario(): Scenario {
  return { version: SCENARIO_VERSION, stored: INITIAL_STORED, attempts: [] };
}

/** Rejects unsupported states rather than clamping them silently (PC-06). */
export function validateSettings(s: Settings): Validation {
  if (s.period !== 'day' && s.period !== 'evening') return { ok: false, reason: 'Choose daytime or evening.' };
  if (!Number.isInteger(s.generator) || s.generator < GENERATOR_MIN || s.generator > GENERATOR_MAX) {
    return { ok: false, reason: `Generator output must be a whole number from ${GENERATOR_MIN} to ${GENERATOR_MAX} PU.` };
  }
  if (s.battery !== 'idle' && s.battery !== 'charge' && s.battery !== 'discharge') {
    return { ok: false, reason: 'The battery can be idle, charging or discharging — one at a time.' };
  }
  return { ok: true };
}

export function validateStored(stored: number): Validation {
  if (!Number.isFinite(stored) || stored < 0 || stored > BATTERY_CAPACITY) {
    return { ok: false, reason: `Stored energy must be between 0 and ${BATTERY_CAPACITY} EU.` };
  }
  return { ok: true };
}

function explain(r: Omit<IntervalResult, 'cause'>): Cause {
  if (r.unmet === 0) {
    if (r.discharge > 0) return 'met-with-storage';
    if (r.charge > 0) return 'stored-surplus';
    return 'met-by-generation';
  }
  const mode = r.settings.battery;
  if (mode === 'discharge') {
    if (r.storedBefore === 0) return 'short-battery-empty';
    if (r.discharge === r.storedBefore) return 'short-battery-empty';
    return 'short-battery-limit';
  }
  if (r.storedBefore > 0) return 'short-battery-idle';
  if (r.solar === 0 && r.settings.period === 'evening') return 'short-no-solar';
  return 'short-generation';
}

/**
 * Computes one interval without changing anything. Used for both Preview and
 * Run, so the preview always matches what Run will do.
 */
export function computeInterval(settings: Settings, stored: number): IntervalResult {
  const v = validateSettings(settings);
  if (!v.ok) throw new RangeError(v.reason);
  const vs = validateStored(stored);
  if (!vs.ok) throw new RangeError(vs.reason);

  const G = settings.generator;
  const S = SOLAR[settings.period];
  const D = DEMAND[settings.period];
  const A = G + S;
  const E = stored;

  const C = settings.battery === 'charge' ? Math.min(BATTERY_RATE, Math.max(0, A - D), (BATTERY_CAPACITY - E) / DT) : 0;
  const B = settings.battery === 'discharge' ? Math.min(BATTERY_RATE, Math.max(0, D - A), E / DT) : 0;
  const served = Math.min(D, A + B);
  const unmet = Math.max(0, D - A - B);
  const unused = Math.max(0, A - D - C);
  const storedAfter = E + (C - B) * DT;

  const base = {
    settings: { ...settings },
    generator: G,
    solar: S,
    available: A,
    demand: D,
    charge: C,
    discharge: B,
    served,
    unmet,
    unused,
    storedBefore: E,
    storedAfter,
    batteryFull: settings.battery === 'charge' && E >= BATTERY_CAPACITY,
  };
  return { ...base, cause: explain(base) };
}

/** Preview: what one interval would do. Never modifies the scenario. */
export function preview(scenario: Scenario, settings: Settings): IntervalResult {
  return computeInterval(settings, scenario.stored);
}

/** Run: advances exactly one interval and records the attempt. */
export function runInterval(scenario: Scenario, settings: Settings): Scenario {
  const result = computeInterval(settings, scenario.stored);
  return {
    version: scenario.version,
    stored: result.storedAfter,
    attempts: [...scenario.attempts, { index: scenario.attempts.length + 1, result }],
  };
}

/** Reset restores the specified initial state and clears attempts. */
export function resetScenario(): Scenario {
  return initialScenario();
}

/** Supply side equals use side: G + S + B = served + C + unused. */
export function balances(r: IntervalResult): boolean {
  return r.generator + r.solar + r.discharge === r.served + r.charge + r.unused;
}

export interface ChallengeStatus {
  /** A daytime interval met demand before the evening interval. */
  dayPrepared: boolean;
  /** An evening interval met demand after daytime preparation. */
  eveningServed: boolean;
  explanationSubmitted: boolean;
  passed: boolean;
}

/**
 * The default challenge (PRD §6) passes when the learner served demand during
 * daytime preparation, then served evening demand, and submitted an
 * explanation. Any valid strategy counts — not one exact click sequence.
 * (Evening demand exceeds the generator's maximum, so meeting it always
 * depends on energy stored during an earlier daytime interval.)
 */
export function challengeStatus(scenario: Scenario, explanation: string): ChallengeStatus {
  let dayPrepared = false;
  let eveningServed = false;
  for (const { result } of scenario.attempts) {
    if (result.settings.period === 'day') {
      if (result.unmet === 0) dayPrepared = true;
    } else if (result.unmet === 0 && dayPrepared) {
      eveningServed = true;
      break;
    }
  }
  const explanationSubmitted = explanation.trim().length > 0;
  return {
    dayPrepared,
    eveningServed,
    explanationSubmitted,
    passed: eveningServed && explanationSubmitted,
  };
}
