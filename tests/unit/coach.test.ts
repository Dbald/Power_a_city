import { describe, expect, it } from 'vitest';
import { coach } from '../../src/content/coach.ts';
import { initialScenario, runInterval, type Settings } from '../../src/model/grid.ts';

const day = (generator: number, battery: Settings['battery'] = 'idle'): Settings => ({ period: 'day', generator, battery });
const evening = (generator: number, battery: Settings['battery'] = 'idle'): Settings => ({ period: 'evening', generator, battery });

describe('experiment coach', () => {
  it('starts by asking for charge mode in daytime, and says why', () => {
    const c = coach(initialScenario(), day(4), false, '');
    expect(c).toMatchObject({ mission: 'charge', target: 'battery:charge' });
    expect(c.hint).toContain('extra power');
  });

  it('sends learners who start in the evening to daytime first', () => {
    expect(coach(initialScenario(), evening(8), false, '')).toMatchObject({ target: 'period:day' });
  });

  it('points at the generator when there is nothing extra to store', () => {
    expect(coach(initialScenario(), day(2, 'charge'), false, '')).toMatchObject({ target: 'gen-inc' });
  });

  it('confirms a good daytime setup without changing the scenario', () => {
    const s = initialScenario();
    expect(coach(s, day(4, 'charge'), false, '')).toMatchObject({ target: 'run' });
    expect(coach(s, day(4, 'charge'), false, '').hint).toContain('saves 2 EU');
    expect(s).toEqual(initialScenario());
  });

  it('walks the evening half: switch to evening, discharge, raise the plant, run', () => {
    const s = runInterval(initialScenario(), day(4, 'charge'));
    expect(coach(s, day(4, 'charge'), false, '')).toMatchObject({ mission: 'evening', target: 'period:evening' });
    expect(coach(s, evening(4), false, '')).toMatchObject({ target: 'battery:discharge' });
    expect(coach(s, evening(4), false, '').hint).toContain('set it to Discharge');
    expect(coach(s, evening(6, 'discharge'), false, '')).toMatchObject({ target: 'gen-inc' });
    expect(coach(s, evening(8, 'discharge'), false, '')).toMatchObject({ target: 'run' });
  });

  it('following every nudge passes the challenge from any starting setting, never via a disabled control', () => {
    for (const period of ['day', 'evening'] as const) {
      for (let g0 = 0; g0 <= 8; g0++) {
        for (const b0 of ['idle', 'charge', 'discharge'] as const) {
          let s = initialScenario();
          let settings: Settings = { period, generator: g0, battery: b0 };
          let explanation = '';
          let submitted = false;
          for (let i = 0; i < 60; i++) {
            const c = coach(s, settings, submitted, explanation);
            if (c.mission === 'done') break;
            switch (c.target) {
              case 'period:day':
                settings = { ...settings, period: 'day' };
                break;
              case 'period:evening':
                settings = { ...settings, period: 'evening' };
                break;
              case 'battery:charge':
                settings = { ...settings, battery: 'charge' };
                break;
              case 'battery:discharge':
                settings = { ...settings, battery: 'discharge' };
                break;
              case 'gen-inc':
                expect(settings.generator).toBeLessThan(8); // the + button is disabled at 8
                settings = { ...settings, generator: settings.generator + 1 };
                break;
              case 'run':
                s = runInterval(s, settings);
                break;
              case 'explanation':
                explanation = 'Charged by day, discharged at night.';
                submitted = true;
                break;
            }
          }
          expect(coach(s, settings, submitted, explanation).mission, `start ${period} G=${g0} ${b0}`).toBe('done');
        }
      }
    }
  });

  it('never points at a maxed-out generator: an under-charged battery sends learners back to daytime', () => {
    const s = runInterval(initialScenario(), day(3, 'charge')); // stores only 1 EU
    expect(s.stored).toBe(1);
    expect(coach(s, evening(8, 'discharge'), false, '')).toMatchObject({ mission: 'charge', target: 'period:day' });
    // Back in daytime, it keeps charging instead of sending them straight back to an evening they can't win.
    expect(coach(s, day(3, 'discharge'), false, '')).toMatchObject({ target: 'battery:charge' });
    expect(coach(s, day(8, 'charge'), false, '').hint).toContain('evening needs 2');
  });

  it('asks for an explanation, then reports completion', () => {
    const s = runInterval(runInterval(initialScenario(), day(4, 'charge')), evening(8, 'discharge'));
    expect(coach(s, evening(8, 'discharge'), false, '')).toMatchObject({ mission: 'explain', target: 'explanation' });
    expect(coach(s, evening(8, 'discharge'), true, 'Stored energy helped.').mission).toBe('done');
  });
});
