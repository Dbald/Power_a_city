import { describe, expect, it } from 'vitest';
import { coach } from '../../src/content/coach.ts';
import { initialScenario, runInterval, type Settings } from '../../src/model/grid.ts';

const day = (generator: number, battery: Settings['battery'] = 'idle'): Settings => ({ period: 'day', generator, battery });
const evening = (generator: number, battery: Settings['battery'] = 'idle'): Settings => ({ period: 'evening', generator, battery });

describe('experiment coach', () => {
  it('starts by asking for charge mode in daytime', () => {
    const c = coach(initialScenario(), day(4), false, '');
    expect(c.mission).toBe('charge');
    expect(c.hint).toContain('Charge');
  });

  it('sends learners who start in the evening to daytime first', () => {
    expect(coach(initialScenario(), evening(8), false, '').hint).toContain('Daytime');
  });

  it('confirms a good daytime setup without changing the scenario', () => {
    const s = initialScenario();
    expect(coach(s, day(4, 'charge'), false, '').hint).toContain('stores 2 EU');
    expect(s).toEqual(initialScenario());
  });

  it('moves to the evening mission once the battery holds energy', () => {
    const s = runInterval(initialScenario(), day(4, 'charge'));
    expect(coach(s, day(4, 'charge'), false, '')).toMatchObject({ mission: 'evening' });
    expect(coach(s, evening(8), false, '').hint).toContain('Can the battery help?');
    expect(coach(s, evening(6, 'discharge'), false, '').hint).toContain('what else can you change');
    expect(coach(s, evening(8, 'discharge'), false, '').hint).toContain('meets evening demand');
  });

  it('asks for an explanation, then reports completion', () => {
    const s = runInterval(runInterval(initialScenario(), day(4, 'charge')), evening(8, 'discharge'));
    expect(coach(s, evening(8, 'discharge'), false, '').mission).toBe('explain');
    expect(coach(s, evening(8, 'discharge'), true, 'Stored energy helped.').mission).toBe('done');
  });
});
