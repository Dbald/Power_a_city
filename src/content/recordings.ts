/**
 * Narration clips recorded in Devin's own voice. Each id listed here must be
 * a narration slot id (PAC-01…) with a matching file at
 * public/media/narration/<id>.mp3. Slots not listed use the browser's voice;
 * captions are the same either way, so read the script word for word (or
 * update the transcript to match). See docs/narration.md.
 */
export const recordedNarration: string[] = [];

export const narrationAudioSrc = (id: string) => `media/narration/${id}.mp3`;

export function recordedAudioFor(id: string): string | null {
  return recordedNarration.includes(id) ? narrationAudioSrc(id) : null;
}
