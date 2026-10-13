/**
 * Content model for Power a City.
 *
 * Lesson content is plain data, kept separate from rendering and input so the
 * same records drive the 3D scene, the 2D presentation, the teacher guide and
 * (later) a VR release. Pattern shared with Ocean Explorer.
 */
import type { StageId } from '../model/route.ts';

/**
 * `draft`    – written and sourced, not yet checked by a human reviewer.
 * `reviewed` – a named reviewer has checked the claim against its sources.
 * Release validation rejects anything that is not `reviewed`.
 */
export type ReviewStatus = 'draft' | 'reviewed';

export interface Review {
  status: ReviewStatus;
  reviewer?: string;
  /** ISO date of the review. Required when reviewed. */
  date?: string;
  notes?: string;
}

export interface ContentRecord {
  /** Stable identifier — never reuse or rename once published. */
  id: string;
  title: string;
  /** Bumped whenever the record's learner-facing meaning changes. */
  contentVersion: number;
  review: Review;
  /** IDs into the source register. Every claim-bearing card needs at least one. */
  sources: string[];
}

export type InfrastructureId = StageId | 'solar' | 'battery';

export interface InfrastructureCard extends ContentRecord {
  id: InfrastructureId;
  /** One short sentence on what this part does. */
  role: string;
  /** Something to notice in the neighborhood. */
  observe: string;
  /** Step-up / step-down transformer context, where relevant. */
  transformer?: string;
  /** Text alternative for the 3D view and the 2D presentation. */
  accessibleDescription: string;
  narrationId?: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** What this source supports — and what it does not. */
  supports: string;
  accessed: string;
}

export interface MediaAsset {
  id: string;
  segment: string;
  purpose: string;
  proposedLength: string;
  lessonStep: string;
  scriptVersion: number;
  review: Review;
  /** Draft script — also the caption and transcript in text-led builds. */
  transcript: string;
  audioPath?: string;
  videoPath?: string;
  captionPath?: string;
  durationSeconds?: number;
  recording: 'not-recorded' | 'recorded';
}

export interface LessonStep {
  id: string;
  label: string;
  /** Target time window. Never enforced by a timer. */
  time: string;
  /** The one main instruction on screen. */
  instruction: string;
  narrationId?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}
