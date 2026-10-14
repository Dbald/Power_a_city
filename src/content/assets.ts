/**
 * Asset register (PRD §14: every shipped asset has a source/licence record).
 * Reference photos are added automatically from photos.ts, each with its own
 * credit and licence.
 */
import { referencePhotos } from './photos.ts';

export interface AssetRecord {
  id: string;
  description: string;
  creator: string;
  source: string;
  license: string;
  attribution: string;
}

const fixed: AssetRecord[] = [
  {
    id: 'scene-models',
    description: 'Neighborhood 3D models: power plant, lattice towers, substation, solar farm, battery containers, poles, houses, school, shop, trees, cars',
    creator: 'Built in code for this project (src/scene/models.ts)',
    source: 'Project-authored',
    license: 'Project-owned',
    attribution: 'None required',
  },
  {
    id: 'scene-textures',
    description: 'Surface textures (grass, asphalt, concrete, gravel, brick, siding, shingles, corrugated metal, solar cells, wood, sky, clouds, signs)',
    creator: 'Painted procedurally at load time (src/scene/textures.ts)',
    source: 'Project-authored',
    license: 'Project-owned',
    attribution: 'None required',
  },
  {
    id: 'map-2d',
    description: '2D neighborhood map (SVG)',
    creator: 'Built in code for this project (src/scene/FlatScene.ts)',
    source: 'Project-authored',
    license: 'Project-owned',
    attribution: 'None required',
  },
  {
    id: 'narration',
    description: 'Narration recordings (public/media/narration), when added',
    creator: 'Devin Baldwin',
    source: 'Recorded for this project',
    license: 'Project-owned',
    attribution: 'None required',
  },
  {
    id: 'threejs',
    description: 'three.js 3D library',
    creator: 'three.js authors',
    source: 'https://github.com/mrdoob/three.js',
    license: 'MIT',
    attribution: 'Copyright © 2010–present three.js authors (licence text ships in the bundle notice)',
  },
];

export const ASSETS: AssetRecord[] = [
  ...fixed,
  ...referencePhotos.map((p) => ({
    id: `photo-${p.subject}`,
    description: p.alt,
    creator: p.credit,
    source: p.sourceUrl,
    license: p.license,
    attribution: `${p.credit} · ${p.license}`,
  })),
];
