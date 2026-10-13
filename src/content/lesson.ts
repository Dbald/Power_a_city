import type { GlossaryTerm, LessonStep, MediaAsset } from './types.ts';

/**
 * Milestone 2 vertical slice: explore the route → connect it → try the model.
 * Prediction, exit questions and recap arrive with the full lesson (milestone 4).
 */
export const SLICE_STEPS: LessonStep[] = [
  {
    id: 'route',
    label: 'Explore the route',
    time: '0:45–2:15',
    instruction: 'Select each of the five delivery stages. What does each one do?',
    narrationId: 'PAC-02',
  },
  {
    id: 'connect',
    label: 'Connect',
    time: '2:15–3:30',
    instruction: 'Put the delivery stages in order, from the source to the buildings.',
  },
  {
    id: 'experiment',
    label: 'Experiment',
    time: '4:15–7:00',
    instruction: 'Charge the battery in daytime, then keep the lights on in the evening.',
    narrationId: 'PAC-08',
  },
];

export const OBJECTIVE = 'Follow electricity from its source to a streetlight — and find out what keeps it available.';

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Generation', definition: 'Making electricity, for example at a power plant or with solar panels.' },
  { term: 'Transmission', definition: 'Carrying electricity long distances on high-voltage lines.' },
  { term: 'Substation', definition: 'A place where transformers lower the voltage for local lines.' },
  { term: 'Distribution', definition: 'Local lines that carry electricity to buildings.' },
  { term: 'Demand', definition: 'How much electricity buildings are using right now.' },
  { term: 'Storage', definition: 'Saving energy, for example in a battery, to use later.' },
  {
    term: 'Power and energy',
    definition: 'Power is how fast electricity is being supplied or used (PU). Energy is the amount stored or used over time (EU).',
  },
];

const notReviewed = { status: 'draft' as const };

function slot(id: string, segment: string, purpose: string, proposedLength: string, lessonStep: string, transcript: string): MediaAsset {
  return { id, segment, purpose, proposedLength, lessonStep, scriptVersion: 1, review: notReviewed, transcript, recording: 'not-recorded' };
}

/** PRD §9 narration slots. None are recorded; transcripts drive the text-led build. */
export const MEDIA: MediaAsset[] = [
  slot('PAC-01', 'Welcome', 'Ask how electricity reaches a home', '15–20 s', 'entry', 'Flip a switch and the light comes on. But where does that electricity come from, and how does it reach your home?'),
  slot('PAC-02', 'Generation', 'Introduce the source of electrical supply', '15–20 s', 'route', 'Every route starts at a source. Here, a power plant makes electricity, and its output can be turned up or down.'),
  slot('PAC-03', 'Transmission', 'Explain long-distance delivery', '15–20 s', 'route', 'Tall towers carry high-voltage lines over long distances, from the plant toward town.'),
  slot('PAC-04', 'Substation', 'Explain the change in voltage for delivery stages', '15–20 s', 'route', 'At the substation, transformers lower the voltage so electricity can move onto local lines.'),
  slot('PAC-05', 'Distribution and buildings', 'Link local lines to everyday uses', '15–20 s', 'route', 'Local lines run along the street to homes, the school, shops and streetlights.'),
  slot('PAC-06', 'Prediction', 'Ask what changes at evening', '10–15 s', 'predict', 'The sun is setting. What do you think will change in the neighborhood?'),
  slot('PAC-07', 'Storage', 'Distinguish stored energy from generation', '20–25 s', 'experiment', 'A battery does not make electricity. It stores energy when there is extra and gives it back later — until it runs out.'),
  slot('PAC-08', 'Experiment directions', 'Explain settings, preview, and one interval', '20–30 s', 'experiment', 'Choose your settings and look at the preview. When you are ready, press Run one interval to see one model hour happen.'),
  slot('PAC-09', 'Reflection', 'Ask for a claim supported by an observation', '15–20 s', 'explain', 'What did you change to keep the lights on, and what did you see that shows it worked?'),
];
