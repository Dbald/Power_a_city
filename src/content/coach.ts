/**
 * The experiment coach: one short "next move" line for the guided challenge,
 * plus the control it is talking about, which the panel highlights so
 * learners know where to look. Each hint says why, not only what, and reads
 * the preview so it reacts to whatever the learner has set.
 */
import { BATTERY_RATE, DEMAND, GENERATOR_MAX, challengeStatus, preview, type Scenario, type Settings } from '../model/grid.ts';

/** Stored energy one evening interval needs with the power plant at full output. */
const EVENING_NEED = Math.min(BATTERY_RATE, DEMAND.evening - GENERATOR_MAX);

export type Mission = 'charge' | 'evening' | 'explain' | 'done';

/** data-key of the control the hint refers to. */
export type NudgeTarget = 'period:day' | 'period:evening' | 'battery:charge' | 'battery:discharge' | 'gen-inc' | 'run' | 'explanation';

export interface Coach {
  mission: Mission;
  hint: string;
  target?: NudgeTarget;
}

export function coach(scenario: Scenario, settings: Settings, explanationSubmitted: boolean, explanation: string): Coach {
  const st = challengeStatus(scenario, explanationSubmitted ? explanation : '');
  const p = preview(scenario, settings);

  if (st.passed) return { mission: 'done', hint: 'Try one more evening without charging first. What happens to the battery?', target: 'run' };
  if (st.eveningServed) return { mission: 'explain', hint: 'What did you change, and what showed it worked?', target: 'explanation' };

  // Daytime: until the day has been prepared, or while back in daytime topping up a battery that holds too little.
  const topUp = st.dayPrepared && settings.period === 'day' && scenario.stored < EVENING_NEED;
  if (!st.dayPrepared || topUp) {
    if (settings.period !== 'day') return { mission: 'charge', hint: 'Start in the daytime, while the sun is shining. Choose ☀ Daytime.', target: 'period:day' };
    if (settings.battery !== 'charge')
      return { mission: 'charge', hint: 'There’s extra power in the daytime. Set the battery to Charge to save it for later.', target: 'battery:charge' };
    if (p.unmet > 0) return { mission: 'charge', hint: `The preview is ${p.unmet} PU short — the homes need power first. Raise the generator.`, target: 'gen-inc' };
    if (p.charge === 0)
      return { mission: 'charge', hint: 'Supply only just covers demand, so there’s nothing extra to save. Raise the generator a little.', target: 'gen-inc' };
    return topUp
      ? { mission: 'charge', hint: `The battery holds ${scenario.stored} EU, and the evening needs ${EVENING_NEED}. Run again to save ${p.charge} more.`, target: 'run' }
      : { mission: 'charge', hint: `The preview saves ${p.charge} EU in the battery. Press Run one interval.`, target: 'run' };
  }

  if (settings.period !== 'evening') {
    return scenario.stored > 0
      ? { mission: 'evening', hint: `Battery charged: it holds ${scenario.stored} EU. Now choose ☾ Evening to see what happens after sunset.`, target: 'period:evening' }
      : { mission: 'charge', hint: 'The battery is empty. Charge it in the daytime first.', target: 'battery:charge' };
  }
  if (p.unmet === 0) return { mission: 'evening', hint: 'The preview keeps every light on. Press Run one interval.', target: 'run' };
  if (scenario.stored === 0) return { mission: 'charge', hint: 'The battery is empty, so it can’t help. Go back to ☀ Daytime and charge it.', target: 'period:day' };
  if (settings.battery !== 'discharge')
    return {
      mission: 'evening',
      hint: `The preview is ${p.unmet} PU short: no sun, and the homes need more. Your battery has saved energy — set it to Discharge.`,
      target: 'battery:discharge',
    };
  if (settings.generator < GENERATOR_MAX)
    return {
      mission: 'evening',
      hint: `Still ${p.unmet} PU short. The battery adds at most ${BATTERY_RATE} PU, so turn the power plant up too.`,
      target: 'gen-inc',
    };
  // Plant at full output and still short: the battery simply doesn't hold enough.
  return {
    mission: 'charge',
    hint: `The power plant is at its maximum, but the battery only holds ${scenario.stored} EU. Go back to ☀ Daytime and charge it more.`,
    target: 'period:day',
  };
}
