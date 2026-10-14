/**
 * The experiment briefing: what the challenge is and why it is hard, shown
 * after the PU/EU card and before the controls. Numbers come from the model
 * so the story can never disagree with the simulation.
 */
import { DEMAND, GENERATOR_MAX, SOLAR } from '../model/grid.ts';
import type { ContentRecord } from './types.ts';

export interface ChallengeBriefing extends ContentRecord {
  story: { icon: string; heading: string; text: string }[];
  goal: string;
  controls: { name: string; does: string }[];
}

export const CHALLENGE: ChallengeBriefing = {
  id: 'challenge',
  title: 'Your challenge',
  contentVersion: 1,
  review: { status: 'draft', notes: 'Fictional scenario values (PRD §6); wording needs educator review.' },
  sources: ['eia-storage', 'eia-delivery'],
  story: [
    {
      icon: '☀',
      heading: 'Daytime',
      text: `The sun gives ${SOLAR.day} PU from the solar panels. With the power plant, there is more than the neighborhood needs (${DEMAND.day} PU).`,
    },
    {
      icon: '☾',
      heading: 'Evening',
      text: `The sun sets, so solar drops to ${SOLAR.evening} PU. People come home and switch on lights, so demand rises to ${DEMAND.evening} PU.`,
    },
    {
      icon: '🏭',
      heading: 'The problem',
      text: `The power plant can make at most ${GENERATOR_MAX} PU. On its own, it is ${DEMAND.evening - GENERATOR_MAX} PU short in the evening.`,
    },
    {
      icon: '🔋',
      heading: 'The helper',
      text: 'The battery can fill the gap — but only if you save energy in it during the day.',
    },
  ],
  goal: 'Save energy in the battery during the day, then use it to keep every light on in the evening.',
  controls: [
    { name: 'Time', does: 'switch between daytime and evening' },
    { name: 'Generator', does: `how much the power plant makes (0–${GENERATOR_MAX} PU)` },
    { name: 'Battery', does: 'Charge saves extra power · Discharge uses saved energy · Idle does nothing' },
    { name: 'If you run', does: 'a preview of what will happen — nothing changes until you press Run' },
  ],
};
