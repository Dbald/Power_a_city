import { describe, expect, it } from 'vitest';
import {
  BATTERY_CAPACITY,
  balances,
  challengeStatus,
  computeInterval,
  initialScenario,
  preview,
  resetScenario,
  runInterval,
  type BatteryMode,
  type Period,
  type Settings,
} from '../../src/model/grid.ts';
import { intervalFeedback } from '../../src/content/feedback.ts';

const day = (generator: number, battery: BatteryMode = 'idle'): Settings => ({ period: 'day', generator, battery });
const evening = (generator: number, battery: BatteryMode = 'idle'): Settings => ({ period: 'evening', generator, battery });

describe('default challenge (PRD §6)', () => {
  it('daytime G=4 charge from E=0 serves demand and stores 2 EU', () => {
    const s1 = runInterval(initialScenario(), day(4, 'charge'));
    const r = s1.attempts[0].result;
    expect(r).toMatchObject({ available: 10, demand: 8, served: 8, unmet: 0, charge: 2, discharge: 0, unused: 0, storedAfter: 2 });
    expect(s1.stored).toBe(2);
  });

  it('evening G=8 discharge from E=2 serves demand and ends at E=0', () => {
    const s1 = runInterval(initialScenario(), day(4, 'charge'));
    const s2 = runInterval(s1, evening(8, 'discharge'));
    const r = s2.attempts[1].result;
    expect(r).toMatchObject({ solar: 0, available: 8, demand: 10, discharge: 2, served: 10, unmet: 0, storedAfter: 0 });
    expect(s2.stored).toBe(0);
  });

  it('repeating evening without recharging shows a 2-PU shortfall', () => {
    let s = runInterval(initialScenario(), day(4, 'charge'));
    s = runInterval(s, evening(8, 'discharge'));
    s = runInterval(s, evening(8, 'discharge'));
    const r = s.attempts[2].result;
    expect(r.unmet).toBe(2);
    expect(r.served).toBe(8);
    expect(r.cause).toBe('short-battery-empty');
    expect(intervalFeedback(r)).toContain('battery was empty');
  });
});

describe('required model checks', () => {
  it('an empty battery cannot discharge', () => {
    const r = computeInterval(evening(8, 'discharge'), 0);
    expect(r.discharge).toBe(0);
    expect(r.storedAfter).toBe(0);
  });

  it('a full battery cannot overcharge', () => {
    const r = computeInterval(day(8, 'charge'), BATTERY_CAPACITY);
    expect(r.charge).toBe(0);
    expect(r.storedAfter).toBe(BATTERY_CAPACITY);
    expect(r.batteryFull).toBe(true);
    expect(r.unused).toBe(6);
  });

  it('charging near capacity stops at capacity', () => {
    const r = computeInterval(day(8, 'charge'), 5);
    expect(r.charge).toBe(1);
    expect(r.storedAfter).toBe(BATTERY_CAPACITY);
  });

  it('never charges and discharges in the same interval', () => {
    for (const period of ['day', 'evening'] as Period[]) {
      for (let g = 0; g <= 8; g++) {
        for (let e = 0; e <= 6; e++) {
          for (const mode of ['idle', 'charge', 'discharge'] as BatteryMode[]) {
            const r = computeInterval({ period, generator: g, battery: mode }, e);
            expect(r.charge > 0 && r.discharge > 0).toBe(false);
            if (mode !== 'charge') expect(r.charge).toBe(0);
            if (mode !== 'discharge') expect(r.discharge).toBe(0);
          }
        }
      }
    }
  });

  it('preview does not advance the scenario; one Run advances exactly one interval', () => {
    const s0 = initialScenario();
    const p = preview(s0, day(4, 'charge'));
    expect(p.storedAfter).toBe(2);
    expect(s0.stored).toBe(0);
    expect(s0.attempts).toHaveLength(0);
    const s1 = runInterval(s0, day(4, 'charge'));
    expect(s1.attempts).toHaveLength(1);
    expect(s1.attempts[0].result).toEqual(p);
    expect(s0.attempts).toHaveLength(0);
  });

  it('is deterministic: the same inputs always give the same outputs', () => {
    const run = () => [day(4, 'charge'), day(6, 'charge'), evening(8, 'discharge'), evening(7, 'discharge')].reduce(runInterval, initialScenario());
    expect(run()).toEqual(run());
  });

  it('solar is zero at the evening preset', () => {
    expect(computeInterval(evening(0), 0).solar).toBe(0);
    expect(computeInterval(day(0), 0).solar).toBe(6);
  });

  it('reset restores the initial state and clears attempts', () => {
    const s = runInterval(runInterval(initialScenario(), day(4, 'charge')), evening(8, 'discharge'));
    expect(s.attempts).toHaveLength(2);
    expect(resetScenario()).toEqual(initialScenario());
    expect(resetScenario()).toEqual({ version: 1, stored: 0, attempts: [] });
  });

  it('balances every interval: G + S + B = served + C + unused', () => {
    for (const period of ['day', 'evening'] as Period[]) {
      for (let g = 0; g <= 8; g++) {
        for (let e = 0; e <= 6; e++) {
          for (const mode of ['idle', 'charge', 'discharge'] as BatteryMode[]) {
            const r = computeInterval({ period, generator: g, battery: mode }, e);
            expect(balances(r)).toBe(true);
            expect(r.served + r.unmet).toBe(r.demand);
            expect(r.storedAfter).toBeGreaterThanOrEqual(0);
            expect(r.storedAfter).toBeLessThanOrEqual(BATTERY_CAPACITY);
          }
        }
      }
    }
  });

  it('rejects unsupported states instead of clamping them', () => {
    expect(() => computeInterval(day(9), 0)).toThrow(RangeError);
    expect(() => computeInterval(day(-1), 0)).toThrow(RangeError);
    expect(() => computeInterval(day(2.5), 0)).toThrow(RangeError);
    expect(() => computeInterval({ period: 'night' as Period, generator: 4, battery: 'idle' }, 0)).toThrow(RangeError);
    expect(() => computeInterval({ period: 'day', generator: 4, battery: 'both' as BatteryMode }, 0)).toThrow(RangeError);
    expect(() => computeInterval(day(4), 7)).toThrow(RangeError);
  });
});

describe('feedback names the observed cause (PC-07)', () => {
  it('evening shortfall with an idle empty battery points at missing solar', () => {
    expect(computeInterval(evening(8), 0).cause).toBe('short-no-solar');
  });
  it('daytime shortfall points at generation', () => {
    expect(computeInterval(day(1), 0).cause).toBe('short-generation');
  });
  it('idle battery with stored energy is called out', () => {
    expect(computeInterval(evening(8), 4).cause).toBe('short-battery-idle');
  });
  it('rate limit is called out when generation is too low', () => {
    expect(computeInterval(evening(4, 'discharge'), 6).cause).toBe('short-battery-limit');
  });
  it('unused output is labeled, not silently stored', () => {
    const r = computeInterval(day(8), 0);
    expect(r.unused).toBe(6);
    expect(intervalFeedback(r)).toContain('reduced / not used');
  });
});

describe('challenge status', () => {
  it('passes the default solution once an explanation is submitted', () => {
    const s = runInterval(runInterval(initialScenario(), day(4, 'charge')), evening(8, 'discharge'));
    expect(challengeStatus(s, '').passed).toBe(false);
    expect(challengeStatus(s, 'I charged the battery in the day and it gave 2 PU at night.')).toMatchObject({
      dayPrepared: true,
      eveningServed: true,
      passed: true,
    });
  });

  it('accepts alternative strategies such as repeated daytime charging', () => {
    let s = initialScenario();
    s = runInterval(s, day(2, 'idle'));
    s = runInterval(s, day(5, 'charge'));
    s = runInterval(s, day(8, 'charge'));
    s = runInterval(s, evening(8, 'discharge'));
    expect(challengeStatus(s, 'stored energy').passed).toBe(true);
  });

  it('does not pass without serving evening demand', () => {
    const s = runInterval(runInterval(initialScenario(), day(4, 'charge')), evening(7, 'discharge'));
    expect(challengeStatus(s, 'tried').passed).toBe(false);
  });

  it('does not count an evening success with no daytime preparation', () => {
    const s = runInterval(initialScenario(), evening(8, 'discharge'));
    expect(s.attempts[0].result.unmet).toBe(2);
    expect(challengeStatus(s, 'x').eveningServed).toBe(false);
  });
});
