import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/content/cards.ts';
import { MEDIA, SLICE_STEPS } from '../../src/content/lesson.ts';
import { recordedNarration } from '../../src/content/recordings.ts';
import { RECORDING_GROUPS } from '../../src/ui/recorder.ts';

const ids = new Set(MEDIA.map((m) => m.id));
const dir = new URL('../../public/media/narration/', import.meta.url);

describe('narration', () => {
  it('every step and card points at a real narration line', () => {
    for (const s of SLICE_STEPS) if (s.narrationId) expect(ids.has(s.narrationId)).toBe(true);
    for (const c of CARDS) if (c.narrationId) expect(ids.has(c.narrationId)).toBe(true);
  });

  it('the recording page lists every line exactly once', () => {
    const listed = RECORDING_GROUPS.flatMap((g) => g.ids.map((x) => x.id));
    expect([...listed].sort()).toEqual([...ids].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('every recorded line has an mp3, and every mp3 is a real, listed line', () => {
    for (const id of recordedNarration) {
      expect(ids.has(id)).toBe(true);
      expect(existsSync(new URL(`${id}.mp3`, dir))).toBe(true);
    }
    const files = readdirSync(dir).filter((f) => f.endsWith('.mp3'));
    for (const f of files) expect(recordedNarration).toContain(f.replace(/\.mp3$/, ''));
  });
});
