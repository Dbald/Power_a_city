/**
 * Local preferences. Stores only non-identifying display settings on this
 * device — no names, accounts, recordings or analytics. Lesson progress is
 * deliberately not stored: a refresh returns to the opening screen with a
 * clean scenario (PC-12). Every access is guarded because storage can be
 * unavailable (private windows, blocked site data).
 */
const PREFS_KEY = 'power-a-city:prefs:v1';

export interface Preferences {
  textScale: number;
  presentation: '3d' | '2d';
  reducedMotion: boolean;
  flow: boolean;
}

export function defaultPreferences(reducedMotion: boolean): Preferences {
  return { textScale: 1, presentation: '3d', reducedMotion, flow: true };
}

export function loadPreferences(reducedMotion: boolean): Preferences {
  const base = defaultPreferences(reducedMotion);
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<Preferences>) : null;
    if (!stored || typeof stored !== 'object') return base;
    return {
      textScale: Math.min(1.5, Math.max(0.75, Number(stored.textScale) || 1)),
      presentation: stored.presentation === '2d' ? '2d' : '3d',
      reducedMotion: typeof stored.reducedMotion === 'boolean' ? stored.reducedMotion : base.reducedMotion,
      flow: typeof stored.flow === 'boolean' ? stored.flow : base.flow,
    };
  } catch {
    return base;
  }
}

export function savePreferences(prefs: Preferences) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable — preferences simply won't survive a refresh.
  }
}

/** Clear session: removes everything this app stored on the device. */
export function clearAll() {
  try {
    window.localStorage.removeItem(PREFS_KEY);
  } catch {
    // Nothing stored or storage unavailable.
  }
}
