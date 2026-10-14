import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/content/cards.ts';
import { PHOTO_SUBJECTS, photoSrc, referencePhotos, type ReferencePhoto } from '../../src/content/photos.ts';
import { refPhoto } from '../../src/ui/html.ts';

describe('reference photos', () => {
  it('every info card can take a photo', () => {
    expect(PHOTO_SUBJECTS.map((s) => s.id).sort()).toEqual(CARDS.map((c) => c.id).sort());
  });

  it('each photo has a known subject, its file, alt text, a credit, a licence and a source', () => {
    const subjects = new Set(PHOTO_SUBJECTS.map((s) => s.id));
    const seen = new Set<string>();
    for (const p of referencePhotos) {
      expect(subjects.has(p.subject), p.subject).toBe(true);
      expect(seen.has(p.subject), `${p.subject} listed twice`).toBe(false);
      seen.add(p.subject);
      expect(existsSync(`public/${photoSrc(p)}`), p.file).toBe(true);
      expect(p.alt.length, p.subject).toBeGreaterThan(5);
      expect(p.credit.length, p.subject).toBeGreaterThan(2);
      expect(p.license, p.subject).not.toMatch(/\bNC\b|\bND\b|non-?commercial|no-?deriv/i);
      expect(p.license.length, p.subject).toBeGreaterThan(2);
      expect(p.sourceUrl, p.subject).toMatch(/^https:\/\//);
    }
  });

  it('shows a labelled, credited photo when there is one, and nothing when there is not', () => {
    const sample: ReferencePhoto[] = [
      { subject: 'substation', file: 'substation.jpg', alt: 'A fenced substation yard', credit: 'Photo: Example', license: 'Public domain', sourceUrl: 'https://example.org/substation' },
    ];
    const html = refPhoto('substation', { list: sample });
    expect(html).toContain('media/photos/substation.jpg');
    expect(html).toContain('Real photo');
    expect(html).toContain('Photo: Example');
    expect(html).toContain('alt="A fenced substation yard"');
    expect(refPhoto('battery', { list: sample })).toBe('');
  });
});
