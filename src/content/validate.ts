/**
 * Content checks. Development mode accepts drafts; release mode (PRD §14)
 * requires every claim-bearing record and narration script to be reviewed.
 */
import { CARDS } from './cards.ts';
import { MEDIA } from './lesson.ts';
import { SOURCES } from './sources.ts';
import type { Review } from './types.ts';

function reviewProblems(label: string, review: Review, release: boolean): string[] {
  const out: string[] = [];
  if (review.status === 'reviewed' && (!review.reviewer || !review.date)) out.push(`${label}: reviewed records need a reviewer and date.`);
  if (release && review.status !== 'reviewed') out.push(`${label}: not yet reviewed.`);
  return out;
}

export function validateContent(release = false): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const ids = new Set<string>();
  for (const c of CARDS) {
    if (ids.has(c.id)) problems.push(`Duplicate card id ${c.id}.`);
    ids.add(c.id);
    if (c.sources.length === 0) problems.push(`${c.id}: claim-bearing card has no source.`);
    for (const s of c.sources) if (!sourceIds.has(s)) problems.push(`${c.id}: unknown source ${s}.`);
    if (!c.accessibleDescription.trim()) problems.push(`${c.id}: missing accessible description.`);
    problems.push(...reviewProblems(`card ${c.id}`, c.review, release));
  }
  for (const m of MEDIA) {
    if (!m.transcript.trim()) problems.push(`${m.id}: missing transcript.`);
    problems.push(...reviewProblems(`media ${m.id}`, m.review, release));
  }
  return problems;
}
