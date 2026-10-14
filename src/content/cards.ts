import type { InfrastructureCard, InfrastructureId } from './types.ts';

const draft = { status: 'draft' as const, notes: 'Draft wording for grades 3–6; awaiting educator review (PRD §14).' };

/** Infrastructure cards (PC-02). Default copy is short enough to read aloud from the back of the room. */
export const CARDS: InfrastructureCard[] = [
  {
    id: 'generation',
    title: 'Generation',
    contentVersion: 1,
    review: draft,
    sources: ['eia-delivery', 'eia-generation'],
    role: 'A power plant makes electricity. Operators can turn its output up or down.',
    observe: 'Find the plant at the start of the route. Everything else depends on a source like this.',
    transformer: 'Next to the plant, a step-up transformer raises the voltage so electricity can travel far.',
    accessibleDescription: 'A power plant building with a tall stack, beside a step-up transformer, at the far left of the neighborhood map.',
    narrationId: 'PAC-02',
  },
  {
    id: 'transmission',
    title: 'Transmission',
    contentVersion: 1,
    review: draft,
    sources: ['eia-delivery'],
    role: 'Tall towers carry high-voltage lines over long distances, from power plants toward towns.',
    observe: 'Follow the tall towers. They are much taller than the poles on your street.',
    accessibleDescription: 'Two tall lattice towers holding high-voltage lines across open ground.',
    narrationId: 'PAC-03',
  },
  {
    id: 'substation',
    title: 'Substation',
    contentVersion: 1,
    review: draft,
    sources: ['eia-delivery'],
    role: 'A substation lowers the voltage so electricity can move onto local lines.',
    observe: 'Look for the fenced yard where the tall lines end and the smaller lines begin.',
    transformer: 'Its step-down transformers lower the voltage for local delivery.',
    accessibleDescription: 'A fenced yard with transformer boxes where the transmission line meets the local lines.',
    narrationId: 'PAC-04',
  },
  {
    id: 'distribution',
    title: 'Distribution',
    contentVersion: 1,
    review: draft,
    sources: ['eia-delivery'],
    role: 'Local lines on shorter poles carry electricity along streets to each building.',
    observe: 'Spot the shorter poles along the street. Some hold small transformers that lower the voltage again.',
    transformer: 'Small transformers on poles lower the voltage once more for homes and shops.',
    accessibleDescription: 'A row of short wooden poles with lines running along the neighborhood street.',
    narrationId: 'PAC-05',
  },
  {
    id: 'buildings',
    title: 'Buildings',
    contentVersion: 1,
    review: draft,
    sources: ['eia-delivery'],
    role: 'Homes, the school, shops and streetlights use electricity for light, heat, cooling and machines.',
    observe: 'Which buildings use more electricity in the evening, when people are home and lights are on?',
    accessibleDescription: 'Three homes, a school, a shop and streetlights along one street.',
    narrationId: 'PAC-05',
  },
  {
    id: 'solar',
    title: 'Solar panels',
    contentVersion: 1,
    review: draft,
    sources: ['eia-generation'],
    role: 'Solar panels make electricity from sunlight — but only while the sun is up.',
    observe: 'Compare the panels in daytime and evening. What changes?',
    accessibleDescription: 'A small field of tilted solar panels beside the substation.',
    narrationId: 'PAC-11',
  },
  {
    id: 'battery',
    title: 'Battery',
    contentVersion: 1,
    review: draft,
    sources: ['eia-storage', 'eia-generation'],
    role: 'A battery stores energy when there is extra and gives it back later. It must be charged first.',
    observe: 'Watch the stored-energy meter. A battery cannot keep supplying energy forever.',
    accessibleDescription: 'A battery storage container next to the solar panels, with a stored-energy meter.',
    narrationId: 'PAC-12',
  },
];

export function card(id: InfrastructureId): InfrastructureCard {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}
