/**
 * Real reference photos, shown in each info card above the facts so learners
 * can connect the model to the real thing. Each photo is a file in
 * public/media/photos/ with its credit, licence and source. A part without a
 * photo simply shows none, so photos can be added one at a time.
 *
 * Use photos you may reuse: your own, public domain (for example many US
 * federal agency photos), CC0, CC BY or CC BY-SA. Avoid NC/ND licences and
 * photos with visible utility logos (the lesson represents no real utility).
 * See docs/photos.md.
 */
import type { InfrastructureId } from './types.ts';

export interface ReferencePhoto {
  subject: InfrastructureId;
  /** File name in public/media/photos/. */
  file: string;
  /** What the photo shows, for screen readers. */
  alt: string;
  /** e.g. "Photo: Devin Baldwin" or "Photo: U.S. Department of Energy". */
  credit: string;
  /** e.g. "Public domain", "CC BY 4.0", "CC BY-SA 4.0". */
  license: string;
  /** The page the photo came from (or the photographer's page). */
  sourceUrl: string;
}

/** Every subject that can have a photo, with what a good photo would show. */
export const PHOTO_SUBJECTS: { id: InfrastructureId; wanted: string }[] = [
  { id: 'generation', wanted: 'A natural-gas power plant with its stacks (no company logos)' },
  { id: 'transmission', wanted: 'Tall lattice transmission towers carrying high-voltage lines across open land' },
  { id: 'substation', wanted: 'A fenced substation yard with transformers and steel gantries' },
  { id: 'solar', wanted: 'Rows of ground-mounted solar panels in sunlight' },
  { id: 'battery', wanted: 'A grid battery storage site: container-style battery units' },
  { id: 'distribution', wanted: 'Wooden utility poles along a street, ideally with a pole-top transformer' },
  { id: 'buildings', wanted: 'A neighborhood street at dusk with house windows and streetlights lit' },
];

export const referencePhotos: ReferencePhoto[] = [];

export const photoSrc = (p: ReferencePhoto) => `media/photos/${p.file}`;

export function photoFor(subject: string, list: ReferencePhoto[] = referencePhotos): ReferencePhoto | undefined {
  return list.find((p) => p.subject === subject);
}
