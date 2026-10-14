/**
 * What PU and EU mean (PRD §3, §6). The model uses two fictional teaching
 * units so the numbers stay small; learners must meet them before the
 * experiment, in plain language, with one analogy for each.
 */
import type { ContentRecord } from './types.ts';

export interface UnitExplainer extends ContentRecord {
  power: { abbr: string; name: string; icon: string; meaning: string; analogy: string };
  energy: { abbr: string; name: string; icon: string; meaning: string; analogy: string };
  /** How the two connect through one Run (one model hour). */
  link: string;
  /** Bridge to real units, for older learners and teachers. */
  realWorld: string;
  teacherTip: string;
}

export const UNITS: UnitExplainer = {
  id: 'units',
  title: 'Two kinds of numbers',
  contentVersion: 1,
  review: { status: 'draft', notes: 'Analogy and real-world link need educator review for grades 3–6.' },
  sources: ['eia-generation'],
  power: {
    abbr: 'PU',
    name: 'power units',
    icon: '⚡',
    meaning: 'How much electricity is flowing right now — from the power plant, from the sun, or into the neighborhood.',
    analogy: 'Like how fast water pours from a tap.',
  },
  energy: {
    abbr: 'EU',
    name: 'energy units',
    icon: '🔋',
    meaning: 'How much electricity is saved up in the battery to use later.',
    analogy: 'Like how much water has collected in a bucket.',
  },
  link: 'Each Run is one hour. Charging at 2 PU for one hour puts 2 EU in the battery. Using 2 PU from the battery for one hour takes 2 EU out.',
  realWorld:
    'These are made-up teaching units that keep the numbers small. Real power is measured in watts (W) and kilowatts (kW); real energy is measured in kilowatt-hours (kWh) — the number on a home electric bill.',
  teacherTip: 'Ask: “Which number is like the tap, and which is like the bucket?” Then: “What happens to the bucket if the tap is off all evening?”',
};
