/**
 * Panel templates. Pure functions from state to HTML strings; the app wires
 * actions through `data-action` attributes. Copy comes from content records.
 */
import { card } from '../content/cards.ts';
import { MODEL_LIMITS, intervalFeedback, routeFeedback } from '../content/feedback.ts';
import { CHALLENGE } from '../content/challenge.ts';
import { coach, type Mission } from '../content/coach.ts';
import { MEDIA, OBJECTIVE, SLICE_STEPS } from '../content/lesson.ts';
import { SOURCES } from '../content/sources.ts';
import { UNITS } from '../content/units.ts';
import type { InfrastructureId } from '../content/types.ts';
import {
  BATTERY_CAPACITY,
  BATTERY_RATE,
  GENERATOR_MAX,
  GENERATOR_MIN,
  challengeStatus,
  preview,
  type IntervalResult,
  type Scenario,
  type Settings,
} from '../model/grid.ts';
import { ROUTE_ORDER, trayCards, type CheckResult, type RouteState } from '../model/route.ts';
import type { Preferences } from '../store.ts';
import { btn, esc } from './html.ts';

export function entryView(): string {
  return `<div class="entry-box">
  <p class="eyebrow">Immersive learning · Lesson 1</p>
  <h1 id="entry-title">Power a City</h1>
  <p class="entry-sub">From Source to Streetlight</p>
  <p class="lead">${esc(OBJECTIVE)}</p>
  <div class="row entry-actions">
    ${btn('Start lesson', 'start-learn', { cls: 'primary big', key: 'start-learn' })}
    ${btn('Explore', 'start-explore', { cls: 'big', key: 'start-explore' })}
    ${btn('Accessibility settings', 'open-settings', { cls: 'secondary', key: 'entry-settings' })}
  </div>
  <p class="small muted">A fictional neighborhood and a simplified teaching model — not a real utility or city network. Numbers are fictional teaching units.</p>
</div>`;
}

export function cardView(id: InfrastructureId, inLesson: boolean): string {
  const c = card(id);
  const sources = c.sources.map((sid) => SOURCES.find((s) => s.id === sid)).filter((s) => !!s);
  return `<div class="card-head">
  <h2 id="card-title" tabindex="-1" data-key="card-title">${esc(c.title)}</h2>
  ${btn('Close', 'close-card', { cls: 'icon-btn ghost', icon: '✕', aria: `Close ${c.title} card`, key: 'close-card' })}
</div>
<p class="lead">${esc(c.role)}</p>
${c.transformer ? `<p class="transformer"><span class="tag">Transformer</span> ${esc(c.transformer)}</p>` : ''}
<p class="observe"><span class="tag">Look for</span> ${esc(c.observe)}</p>
<p class="small muted">Sources: ${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)} — ${esc(s.title)}</a>`).join('; ')} · Draft, awaiting review</p>
${btn(inLesson ? 'Back to lesson' : 'Back to exploring', 'close-card', { cls: 'secondary', key: 'close-card-2' })}`;
}

export function stepHeader(step: number): string {
  const s = SLICE_STEPS[step];
  const dots = SLICE_STEPS.map(
    (x, i) => `<li class="${i === step ? 'is-current' : i < step ? 'is-done' : ''}" ${i === step ? 'aria-current="step"' : ''}>${esc(x.label)}</li>`,
  ).join('');
  return `<div class="step-row"><ol class="steps" aria-label="Lesson steps">${dots}</ol><span class="step-meta">Step ${step + 1} of ${SLICE_STEPS.length} · target ${esc(s.time)}</span></div>
<h2 class="instruction" tabindex="-1" data-key="instruction">${esc(s.instruction)}</h2>`;
}

/** Teacher-facing draft narration, kept folded away at the foot of the panel. */
export function narrationDetails(step: number, override?: string): string {
  const id = override ?? SLICE_STEPS[step].narrationId;
  const n = id ? MEDIA.find((m) => m.id === id) : undefined;
  return n ? `<details class="pop"><summary>Script</summary><div class="pop-body"><p class="eyebrow">Narration ${esc(n.id)}</p><p class="script-text">${esc(n.transcript)}</p><p class="small muted">Draft narration — not recorded yet.</p></div></details>` : '';
}

export function routeStepView(visited: InfrastructureId[]): string {
  const items = ROUTE_ORDER.map((id) => {
    const seen = visited.includes(id);
    return `<li>${btn(card(id).title, 'select', { arg: id, cls: seen ? 'is-done' : '', icon: seen ? '✓' : '○', key: `list:${id}`, aria: `${card(id).title}${seen ? ', inspected' : ''}` })}</li>`;
  }).join('');
  const count = ROUTE_ORDER.filter((id) => visited.includes(id)).length;
  return `<p>Select a label in the neighborhood, or use this list. Each card says what that part does.</p>
<ul class="stage-list" aria-label="Delivery stages">${items}</ul>
<p class="status" role="status">${count} of 5 stages inspected${count === 5 ? ' — ready to connect the route.' : '.'}</p>`;
}

export function connectView(route: RouteState, last: CheckResult | null): string {
  const tray = trayCards(route);
  const trayHtml = tray.length
    ? tray
        .map((id) =>
          btn(card(id).title, 'route-card', {
            arg: id,
            cls: `route-card ${route.selected === id ? 'is-selected' : ''}`,
            pressed: route.selected === id,
            key: `route-card:${id}`,
            icon: '⠿',
            data: { 'drag-card': id },
          }),
        )
        .join('')
    : '<p class="small muted tray-empty">All cards placed. Drag a card back here to remove it.</p>';
  const slots = route.slots
    .map((id, i) => {
      const label = id ? card(id).title : 'Empty';
      const aria = `Step ${i + 1}: ${id ? card(id).title : 'empty'}${route.selected ? `. Place ${card(route.selected).title} here` : id ? '. Select to pick it up' : ''}`;
      return `<li>${btn(label, 'route-slot', {
        arg: String(i),
        cls: `route-slot ${id ? 'is-filled' : ''} ${route.connected ? 'is-correct' : ''}`,
        key: `route-slot:${i}`,
        aria,
        icon: String(i + 1),
        disabled: route.connected,
        data: id && !route.connected ? { drop: String(i), 'drag-card': id } : { drop: String(i) },
      })}</li>`;
    })
    .join('<li class="slot-arrow" aria-hidden="true">→</li>');

  let feedback = '';
  if (route.connected) {
    feedback = `<div class="feedback good" role="status" data-key="route-feedback" tabindex="-1"><strong>Connected!</strong> ${esc(routeFeedback({ correct: true })[0])}</div>`;
  } else if (last && !last.correct) {
    feedback = `<div class="feedback retry" role="status" data-key="route-feedback" tabindex="-1"><strong>Not yet.</strong><ul>${routeFeedback(last)
      .map((l) => `<li>${esc(l)}</li>`)
      .join('')}</ul></div>`;
  }
  const hint = route.connected
    ? ''
    : route.selected
      ? `<p class="small" role="status">${esc(card(route.selected).title)} selected — now choose a step.</p>`
      : '<p class="small muted" role="status">Drag each card into its step. You can also tap a card, then tap a step.</p>';
  return `<p class="eyebrow">Cards</p>
<div class="row tray" role="group" aria-label="Stage cards" data-drop="tray">${trayHtml}</div>
${hint}
<p class="eyebrow">Route — source to buildings</p>
<ol class="slots" aria-label="Route steps">${slots}</ol>
<div class="row">
  ${route.connected ? '' : btn('Check route', 'route-check', { cls: 'primary', key: 'route-check', disabled: route.slots.some((s) => s === null) })}
  ${route.connected ? '' : btn('Clear', 'route-clear', { cls: 'secondary', key: 'route-clear' })}
</div>
${feedback}
${route.connected ? '' : '<p class="small muted">Real grids have many connected paths. This single route is a simplified picture.</p>'}`;
}

function batteryChange(r: IntervalResult) {
  if (r.charge > 0) return `battery +${r.charge} → ${r.storedAfter} EU`;
  if (r.discharge > 0) return `battery −${r.discharge} → ${r.storedAfter} EU`;
  return `battery stays ${r.storedAfter} EU`;
}

export interface ModelPanelInput {
  connected: boolean;
  settings: Settings;
  scenario: Scenario;
  last: IntervalResult | null;
  guided: boolean;
  explanation: string;
  explanationSubmitted: boolean;
  error: string | null;
}

const MISSIONS: { id: Mission; label: string }[] = [
  { id: 'charge', label: '☀ Charge by day' },
  { id: 'evening', label: '☾ Light the evening' },
  { id: 'explain', label: '✎ Explain' },
];

function missionBar(m: ModelPanelInput): string {
  const c = coach(m.scenario, m.settings, m.explanationSubmitted, m.explanation);
  const order: Mission[] = ['charge', 'evening', 'explain', 'done'];
  const at = order.indexOf(c.mission);
  // Progress never moves backwards on screen once a mission has been met.
  const st = challengeStatus(m.scenario, m.explanationSubmitted ? m.explanation : '');
  const done = [st.dayPrepared, st.eveningServed, st.passed];
  const items = MISSIONS.map((x, i) => {
    const cls = done[i] ? 'is-done' : order.indexOf(x.id) === at ? 'is-current' : '';
    return `<li class="${cls}" ${cls === 'is-current' ? 'aria-current="step"' : ''}>${esc(x.label)}${done[i] ? '<span class="sr-only"> (done)</span>' : ''}</li>`;
  }).join('');
  const explain =
    st.eveningServed && !m.explanationSubmitted
      ? `<label for="explanation" class="coach"><span class="sr-only">Your explanation: </span><span aria-hidden="true">→ </span>${esc(c.hint)}</label>
<div class="explain-row">
  <textarea id="explanation" class="is-nudge" rows="2" placeholder="I changed… and I saw…" data-input="explanation" data-key="explanation">${esc(m.explanation)}</textarea>
  ${btn('Submit', 'submit-explanation', { cls: 'secondary', key: 'submit-explanation', aria: 'Submit explanation' })}
</div>`
      : '';
  const line = st.passed
    ? `<p class="coach is-done" role="status"><strong>One evening interval completed.</strong> ${esc(c.hint)}</p>`
    : explain
      ? ''
      : `<p class="coach" role="status"><span aria-hidden="true">→ </span>${esc(c.hint)}</p>`;
  return `<div class="mission">
  <ol class="missions" aria-label="Challenge">${items}</ol>
  ${line}
  ${explain}
</div>`;
}

export function modelPanel(m: ModelPanelInput): string {
  if (!m.connected) {
    return `<div class="notice" role="status">The neighborhood isn't connected yet. Complete the delivery route first — nothing is delivered or stored until it is.</div>`;
  }
  const s = m.settings;
  const p = preview(m.scenario, s);
  const evening = s.period === 'evening';
  // In the guided challenge, the control the hint talks about glows.
  const target = m.guided ? coach(m.scenario, s, m.explanationSubmitted, m.explanation).target : undefined;
  const nudge = (key: string) => (key === target ? ' is-nudge' : '');
  const seg = (label: string, action: string, arg: string, pressed: boolean) =>
    btn(label, action, { arg, pressed, cls: `${pressed ? 'is-selected' : ''}${nudge(`${action}:${arg}`)}`, key: `${action}:${arg}` });

  const controls = `<div class="controls">
  <span class="ctl-label" id="lbl-time">Time</span>
  <div class="row tight" role="group" aria-labelledby="lbl-time">${seg('☀ Daytime', 'period', 'day', !evening)}${seg('☾ Evening', 'period', 'evening', evening)}</div>
  <label class="ctl-label" for="generator">Generator</label>
  <div class="row tight slider-row">
    ${btn('Less', 'gen-dec', { cls: 'icon-btn', icon: '−', aria: 'Decrease generator output', key: 'gen-dec', disabled: s.generator <= GENERATOR_MIN })}
    <input id="generator" type="range" min="${GENERATOR_MIN}" max="${GENERATOR_MAX}" step="1" value="${s.generator}" data-input="generator" data-key="generator" aria-valuetext="${s.generator} power units">
    ${btn('More', 'gen-inc', { cls: `icon-btn${nudge('gen-inc')}`, icon: '+', aria: 'Increase generator output', key: 'gen-inc', disabled: s.generator >= GENERATOR_MAX })}
    <output for="generator" class="big-num">${s.generator} PU</output>
  </div>
  <span class="ctl-label" id="lbl-battery">Battery</span>
  <div class="row tight" role="group" aria-labelledby="lbl-battery">${seg('Idle', 'battery', 'idle', s.battery === 'idle')}${seg('Charge', 'battery', 'charge', s.battery === 'charge')}${seg('Discharge', 'battery', 'discharge', s.battery === 'discharge')}</div>
</div>`;

  const fill = Math.round((100 * m.scenario.stored) / BATTERY_CAPACITY);
  const readout = `<div class="readout">
  <div class="stats" aria-label="Neighborhood status">
    <div class="stat"><span class="stat-label">⚡ Power supply</span><span class="stat-value">${p.available} PU</span><span class="stat-note">plant ${p.generator} + sun ${p.solar}</span></div>
    <div class="stat"><span class="stat-label">⚡ Power demand</span><span class="stat-value">${p.demand} PU</span><span class="stat-note">${evening ? 'evening' : 'daytime'}</span></div>
    <div class="stat"><span class="stat-label">🔋 Stored energy</span><span class="stat-value">${m.scenario.stored} / ${BATTERY_CAPACITY} EU</span><span class="meter" aria-hidden="true"><span style="width:${fill}%"></span></span></div>
  </div>
  <p class="preview" aria-live="polite"><span class="preview-label">If you run:</span> ${p.unmet === 0 ? '<span class="badge good"><span aria-hidden="true">✓ </span>Demand met</span>' : `<span class="badge short"><span aria-hidden="true">! </span>${p.unmet} PU short</span>`} <span class="muted">· ${batteryChange(p)}${p.unused ? ` · ${p.unused} PU unused` : ''}</span></p>
</div>`;

  const lastHtml = m.last
    ? `<p class="result ${m.last.unmet === 0 ? 'good' : 'retry'}" role="status" tabindex="-1" data-key="run-result"><strong>Run ${m.scenario.attempts.length} (${m.last.settings.period === 'day' ? 'daytime' : 'evening'}):</strong> ${esc(intervalFeedback(m.last))}</p>`
    : '';



  return `${m.guided ? missionBar(m) : ''}
${controls}
${readout}
${m.error ? `<p class="result retry" role="alert">${esc(m.error)}</p>` : ''}
<div class="row run-row">
  ${btn('Run one interval', 'run', { cls: `primary big${nudge('run')}`, key: 'run' })}
  ${btn('Reset', 'reset-experiment', { cls: 'secondary', key: 'reset-experiment', aria: 'Reset experiment' })}
</div>
${lastHtml}`;
}

/** Secondary details for the panel's bottom bar: they open as pop-overs so the main task never scrolls. */
export function experimentExtras(m: { scenario: Scenario; connected: boolean }): string {
  if (!m.connected) return '';
  const history = m.scenario.attempts.length
    ? `<details class="pop"><summary>Runs (${m.scenario.attempts.length})</summary><div class="pop-body"><table><thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Plant</th><th scope="col">Battery</th><th scope="col">Served</th><th scope="col">Stored</th></tr></thead><tbody>${m.scenario.attempts
        .map(
          ({ index, result: r }) =>
            `<tr><td>${index}</td><td>${r.settings.period === 'day' ? 'Day' : 'Evening'}</td><td>${r.generator} PU</td><td>${r.settings.battery}</td><td>${r.served} / ${r.demand} PU</td><td>${r.storedAfter} EU</td></tr>`,
        )
        .join('')}</tbody></table></div></details>`
    : '';
  return `${history}<details class="pop"><summary>What are PU &amp; EU?</summary><div class="pop-body">${unitPairs()}<p class="small">${esc(UNITS.link)}</p><p class="small muted">${esc(MODEL_LIMITS)} The battery charges or discharges at most ${BATTERY_RATE} PU per run.</p></div></details>`;
}

function unitPairs(): string {
  const tile = (u: typeof UNITS.power) =>
    `<div class="unit-tile"><p class="unit-name"><span aria-hidden="true">${u.icon}</span> <strong>${esc(u.abbr)}</strong> = ${esc(u.name)}</p><p>${esc(u.meaning)}</p><p class="unit-analogy">${esc(u.analogy)}</p></div>`;
  return `<div class="unit-pair">${tile(UNITS.power)}${tile(UNITS.energy)}</div>`;
}

/** Shown once when the experiment opens: learners meet PU and EU before any number appears. */
export function unitsIntro(): string {
  return `<div class="units-intro">
  <h3 tabindex="-1" data-key="units-title">${esc(UNITS.title)}</h3>
  <p>The experiment uses two kinds of numbers. Read these first.</p>
  ${unitPairs()}
  <p class="unit-link"><strong>How they connect:</strong> ${esc(UNITS.link)}</p>
  <p class="small muted"><strong>Real world:</strong> ${esc(UNITS.realWorld)}</p>
  <p class="small teacher-tip"><span class="tag">Teacher</span> ${esc(UNITS.teacherTip)}</p>
  ${btn('Got it — start the experiment', 'units-done', { cls: 'primary big', key: 'units-done' })}
</div>`;
}

/** Shown after the units card: the story of the challenge, the goal, and what each control does. */
export function challengeBriefing(): string {
  return `<div class="units-intro briefing">
  <h3 tabindex="-1" data-key="briefing-title">${esc(CHALLENGE.title)}</h3>
  <div class="story">${CHALLENGE.story
    .map((x) => `<div class="story-tile"><p class="story-head"><span aria-hidden="true">${x.icon}</span> ${esc(x.heading)}</p><p>${esc(x.text)}</p></div>`)
    .join('')}</div>
  <p class="unit-link"><strong>Your goal:</strong> ${esc(CHALLENGE.goal)}</p>
  <dl class="control-guide">${CHALLENGE.controls.map((c) => `<div><dt>${esc(c.name)}</dt><dd>${esc(c.does)}</dd></div>`).join('')}</dl>
  ${btn('Start the challenge', 'challenge-start', { cls: 'primary big', key: 'challenge-start' })}
  <p class="small muted">Stuck? Follow the yellow hint — the control it means will glow.</p>
</div>`;
}

export function settingsView(p: Preferences, webgl: boolean): string {
  const opt = (label: string, action: string, arg: string, pressed: boolean, disabled = false) =>
    btn(label, action, { arg, pressed, cls: pressed ? 'is-selected' : '', key: `${action}:${arg}`, disabled });
  return `<div class="card-head"><h2 id="settings-title">Settings</h2>${btn('Close', 'close-settings', { cls: 'icon-btn ghost', icon: '✕', aria: 'Close settings', key: 'close-settings' })}</div>
<fieldset class="control"><legend>Text size</legend><div class="row tight">
  ${btn('Smaller text', 'text-size', { arg: '-1', cls: 'icon-btn', icon: 'A−', key: 'text-dec', disabled: p.textScale <= 0.75 })}
  <output class="big-num">${Math.round(p.textScale * 100)}%</output>
  ${btn('Larger text', 'text-size', { arg: '1', cls: 'icon-btn', icon: 'A+', key: 'text-inc', disabled: p.textScale >= 1.5 })}
</div></fieldset>
<fieldset class="control"><legend>Presentation</legend><div class="row tight">
  ${opt('3D neighborhood', 'presentation', '3d', p.presentation === '3d', !webgl)}${opt('2D map', 'presentation', '2d', p.presentation === '2d')}
</div>${webgl ? '' : '<p class="small muted">3D is not available in this browser, so the 2D map is used. The lesson is the same.</p>'}</fieldset>
<fieldset class="control"><legend>Motion</legend><div class="row tight">
  ${opt('Reduce motion', 'reduced-motion', 'on', p.reducedMotion)}${opt('Full motion', 'reduced-motion', 'off', !p.reducedMotion)}
</div></fieldset>
<fieldset class="control"><legend>Flow overlay</legend><div class="row tight">
  ${opt('Show', 'flow', 'on', p.flow)}${opt('Hide', 'flow', 'off', !p.flow)}
</div><p class="small muted">An explanatory graphic along the route — not the speed of electricity.</p></fieldset>
<fieldset class="control"><legend>Narration</legend><div class="row tight">
  ${opt('Captions on', 'captions', 'on', p.captions)}${opt('Captions off', 'captions', 'off', !p.captions)}
</div><div class="row tight">
  ${opt('Auto-play voice', 'auto-narrate', 'on', p.autoNarrate)}${opt('Only when I press Listen', 'auto-narrate', 'off', !p.autoNarrate)}
</div>
<p class="small muted">For teachers: record the lesson's narration in your own voice.</p>
  ${btn('Record narration', 'open-recorder', { cls: 'secondary', key: 'open-recorder', icon: '●' })}
</fieldset>
<fieldset class="control"><legend>Session</legend>
  <p class="small">Preferences are saved on this device. Lesson progress is not saved: refreshing returns to the opening screen with a fresh neighborhood.</p>
  ${btn('Clear session', 'clear-session', { cls: 'danger', key: 'clear-session' })}
</fieldset>`;
}
