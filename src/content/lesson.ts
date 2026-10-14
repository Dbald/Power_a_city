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
    narrationId: 'PAC-01',
  },
  {
    id: 'connect',
    label: 'Connect',
    time: '2:15–3:30',
    instruction: 'Put the delivery stages in order, from the source to the buildings.',
    narrationId: 'PAC-10',
  },
  {
    id: 'experiment',
    label: 'Experiment',
    time: '4:15–7:00',
    instruction: 'Keep the lights on after sunset.',
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
    definition: 'Power is how much electricity is flowing right now, like water from a tap (PU, power units). Energy is how much has been stored or used over time, like water in a bucket (EU, energy units).',
  },
];

const notReviewed = { status: 'draft' as const };

function slot(id: string, segment: string, purpose: string, proposedLength: string, lessonStep: string, transcript: string): MediaAsset {
  return { id, segment, purpose, proposedLength, lessonStep, scriptVersion: 1, review: notReviewed, transcript, recording: 'not-recorded' };
}

/** PRD §9 narration slots (plus PAC-10). Recorded clips are listed in recordings.ts; transcripts are the captions. */
export const MEDIA: MediaAsset[] = [
  slot('PAC-01', 'Welcome', 'Ask how electricity reaches a home', '15–20 s', 'entry', 'Flip a switch and the light comes on. But where does that electricity come from, and how does it reach your home? Let’s follow the route. Select each part of the neighborhood to find out what it does.'),
  slot('PAC-02', 'Generation', 'Introduce the source of electrical supply', '15–20 s', 'route', 'Every route starts at a source. Here, a power plant makes electricity, and its output can be turned up or down.'),
  slot('PAC-03', 'Transmission', 'Explain long-distance delivery', '15–20 s', 'route', 'Tall towers carry high-voltage lines over long distances, from the plant toward town.'),
  slot('PAC-04', 'Substation', 'Explain the change in voltage for delivery stages', '15–20 s', 'route', 'At the substation, transformers lower the voltage so electricity can move onto local lines.'),
  slot('PAC-05', 'Distribution and buildings', 'Link local lines to everyday uses', '15–20 s', 'route', 'Local lines run along the street to homes, the school, shops and streetlights.'),
  slot('PAC-06', 'Prediction', 'Ask what changes at evening', '10–15 s', 'predict', 'The sun is setting. What do you think will change in the neighborhood?'),
  slot('PAC-07', 'Storage', 'Distinguish stored energy from generation', '20–25 s', 'experiment', 'Two kinds of numbers. Power units tell how much electricity is flowing right now, like water from a tap. Energy units tell how much is saved in the battery, like water in a bucket. A battery does not make electricity — it saves energy when there is extra and gives it back later, until it runs out.'),
  slot('PAC-08', 'Experiment directions', 'Explain settings, preview, and one interval', '20–30 s', 'experiment', 'Choose your settings and look at the preview. When you are ready, press Run one interval to see one model hour happen.'),
  // PAC-10 is an addition to the PRD's nine slots, so the Connect step has spoken directions too.
  slot('PAC-10', 'Connect directions', 'Explain the drag-to-order activity', '10–15 s', 'connect', 'Electricity travels along a route. Drag each card into its step, from the source all the way to the buildings. Then press Check route.'),
  slot('PAC-09', 'Reflection', 'Ask for a claim supported by an observation', '15–20 s', 'explain', 'What did you change to keep the lights on, and what did you see that shows it worked?'),
];
