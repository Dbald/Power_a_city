/**
 * The experiment coach: one short "next move" line for the guided challenge.
 * Hints point at what the preview shows rather than giving the answer, so
 * learners still discover the battery's role themselves.
 */
import { challengeStatus, preview, type Scenario, type Settings } from '../model/grid.ts';

export type Mission = 'charge' | 'evening' | 'explain' | 'done';

export interface Coach {
  mission: Mission;
  hint: string;
}

export function coach(scenario: Scenario, settings: Settings, explanationSubmitted: boolean, explanation: string): Coach {
  const st = challengeStatus(scenario, explanationSubmitted ? explanation : '');
  const p = preview(scenario, settings);

  if (st.passed) return { mission: 'done', hint: 'Try one more evening without recharging. What happens to the battery?' };
  if (st.eveningServed) return { mission: 'explain', hint: 'What did you change, and what showed it worked?' };

  if (!st.dayPrepared) {
    if (settings.period !== 'day') return { mission: 'charge', hint: 'Start in daytime, while the sun is up. Choose ☀ Daytime.' };
    if (settings.battery !== 'charge') return { mission: 'charge', hint: 'Set the battery to Charge so extra energy can be saved.' };
    if (p.unmet > 0) return { mission: 'charge', hint: `The preview is ${p.unmet} PU short. Homes come first — raise the generator.` };
    if (p.charge === 0) return { mission: 'charge', hint: 'Nothing extra to store: supply only just covers demand. Raise the generator a little.' };
    return { mission: 'charge', hint: `The preview stores ${p.charge} EU. Press Run one interval.` };
  }

  if (settings.period !== 'evening') {
    return scenario.stored > 0
      ? { mission: 'evening', hint: `The battery holds ${scenario.stored} EU. Now choose ☾ Evening.` }
      : { mission: 'charge', hint: 'The battery is empty. Charge it in daytime first.' };
  }
  if (p.unmet === 0) return { mission: 'evening', hint: 'The preview meets evening demand. Press Run one interval.' };
  if (scenario.stored === 0) return { mission: 'charge', hint: 'The battery is empty. Go back to ☀ Daytime and charge it.' };
  if (settings.battery !== 'discharge') return { mission: 'evening', hint: `The preview is ${p.unmet} PU short, and there is no sun. Can the battery help?` };
  return { mission: 'evening', hint: `Still ${p.unmet} PU short. The battery adds at most 2 PU — what else can you change?` };
}
