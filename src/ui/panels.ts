/**
 * Panel templates. Pure functions from state to HTML strings; the app wires
 * actions through `data-action` attributes. Copy comes from content records.
 */
import { card } from '../content/cards.ts';
import { MODEL_LIMITS, intervalFeedback, routeFeedback } from '../content/feedback.ts';
import { GLOSSARY, MEDIA, OBJECTIVE, SLICE_STEPS } from '../content/lesson.ts';
import { SOURCES } from '../content/sources.ts';
import type { InfrastructureId } from '../content/types.ts';
import {
  BATTERY_CAPACITY,
  BATTERY_RATE,
  DEMAND,
  GENERATOR_MAX,
  GENERATOR_MIN,
  SOLAR,
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
  const narration = s.narrationId ? MEDIA.find((m) => m.id === s.narrationId) : undefined;
  return `<ol class="steps" aria-label="Lesson steps">${dots}</ol>
<p class="eyebrow">Step ${step + 1} of ${SLICE_STEPS.length} · target ${esc(s.time)}</p>
<h2 class="instruction" tabindex="-1" data-key="instruction">${esc(s.instruction)}</h2>
${narration ? `<p class="script small"><span class="tag">Narration script ${esc(narration.id)} · not recorded</span> ${esc(narration.transcript)}</p>` : ''}`;
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
          }),
        )
        .join('')
    : '<p class="small muted">All cards placed.</p>';
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
      : '<p class="small muted" role="status">Choose a card, then choose a step. Choose a filled step to pick its card back up.</p>';
  return `<p class="eyebrow">Cards</p>
<div class="row tray" role="group" aria-label="Stage cards">${trayHtml}</div>
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

function stat(label: string, value: string, note = '') {
  return `<div class="stat"><span class="stat-label">${esc(label)}</span><span class="stat-value">${value}</span>${note ? `<span class="stat-note">${esc(note)}</span>` : ''}</div>`;
}

function resultLine(r: IntervalResult) {
  return r.unmet === 0
    ? `<span class="badge good"><span aria-hidden="true">✓ </span>Demand met</span>`
    : `<span class="badge short"><span aria-hidden="true">! </span>Demand not fully met · ${r.unmet} PU short</span>`;
}

function batteryLine(r: IntervalResult) {
  if (r.charge > 0) return `+${r.charge} charging`;
  if (r.discharge > 0) return `−${r.discharge} supplying`;
  return 'no change';
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

export function modelPanel(m: ModelPanelInput): string {
  if (!m.connected) {
    return `<div class="notice" role="status">The neighborhood isn't connected yet. Complete the delivery route first — nothing is delivered or stored until it is.</div>`;
  }
  const s = m.settings;
  const p = preview(m.scenario, s);
  const evening = s.period === 'evening';
  const seg = (label: string, action: string, arg: string, pressed: boolean) => btn(label, action, { arg, pressed, cls: pressed ? 'is-selected' : '', key: `${action}:${arg}` });

  const controls = `<fieldset class="control">
  <legend>Time of day</legend>
  <div class="row tight">${seg('☀ Daytime', 'period', 'day', !evening)}${seg('☾ Evening', 'period', 'evening', evening)}</div>
</fieldset>
<fieldset class="control">
  <legend><label for="generator">Generator output (power plant)</label></legend>
  <div class="row tight slider-row">
    ${btn('Less', 'gen-dec', { cls: 'icon-btn', icon: '−', aria: 'Decrease generator output', key: 'gen-dec', disabled: s.generator <= GENERATOR_MIN })}
    <input id="generator" type="range" min="${GENERATOR_MIN}" max="${GENERATOR_MAX}" step="1" value="${s.generator}" data-input="generator" data-key="generator" aria-valuetext="${s.generator} power units">
    ${btn('More', 'gen-inc', { cls: 'icon-btn', icon: '+', aria: 'Increase generator output', key: 'gen-inc', disabled: s.generator >= GENERATOR_MAX })}
    <output for="generator" class="big-num">${s.generator} PU</output>
  </div>
</fieldset>
<fieldset class="control">
  <legend>Battery</legend>
  <div class="row tight">${seg('Idle', 'battery', 'idle', s.battery === 'idle')}${seg('Charge', 'battery', 'charge', s.battery === 'charge')}${seg('Discharge', 'battery', 'discharge', s.battery === 'discharge')}</div>
  <p class="small muted">Charges or discharges up to ${BATTERY_RATE} PU per interval. Holds up to ${BATTERY_CAPACITY} EU.</p>
</fieldset>`;

  const stats = `<div class="stats" aria-label="Neighborhood status">
  ${stat('Available supply', `${p.available} PU`, `generator ${p.generator} + solar ${p.solar}${evening ? ' (no sun)' : ''}`)}
  ${stat('Demand', `${p.demand} PU`, evening ? 'evening' : 'daytime')}
  ${stat('Battery energy', `${m.scenario.stored} / ${BATTERY_CAPACITY} EU`, m.scenario.stored === 0 ? 'empty' : m.scenario.stored === BATTERY_CAPACITY ? 'full' : 'stored')}
</div>`;

  const previewBox = `<div class="preview" aria-live="polite">
  <p class="eyebrow">Preview of the next interval — nothing has happened yet</p>
  <p>${resultLine(p)} · battery ${batteryLine(p)} · stored energy would be <strong>${p.storedAfter} EU</strong>${p.unused ? ` · ${p.unused} PU not used` : ''}</p>
</div>`;

  const lastHtml = m.last
    ? `<div class="feedback ${m.last.unmet === 0 ? 'good' : 'retry'}" role="status" tabindex="-1" data-key="run-result">
  <p class="eyebrow">Interval ${m.scenario.attempts.length} result · ${m.last.settings.period === 'day' ? 'daytime' : 'evening'}</p>
  <p>${resultLine(m.last)}</p>
  <p>${esc(intervalFeedback(m.last))}</p>
</div>`
    : '';

  const history = m.scenario.attempts.length
    ? `<details class="history"><summary>Intervals run (${m.scenario.attempts.length})</summary><table><thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Generator</th><th scope="col">Battery</th><th scope="col">Served / demand</th><th scope="col">Stored after</th></tr></thead><tbody>${m.scenario.attempts
        .map(
          ({ index, result: r }) =>
            `<tr><td>${index}</td><td>${r.settings.period === 'day' ? 'Day' : 'Evening'}</td><td>${r.generator} PU</td><td>${r.settings.battery}</td><td>${r.served} / ${r.demand} PU</td><td>${r.storedAfter} EU</td></tr>`,
        )
        .join('')}</tbody></table></details>`
    : '';

  let challenge = '';
  if (m.guided) {
    const st = challengeStatus(m.scenario, m.explanationSubmitted ? m.explanation : '');
    const item = (done: boolean, text: string) => `<li class="${done ? 'is-done' : ''}"><span aria-hidden="true">${done ? '✓' : '○'}</span> ${esc(text)}${done ? '<span class="sr-only"> (done)</span>' : ''}</li>`;
    challenge = `<div class="challenge">
  <p class="eyebrow">Challenge</p>
  <ul class="checklist">
    ${item(st.dayPrepared, `Daytime: meet demand (${DEMAND.day} PU) and store energy`)}
    ${item(st.eveningServed, `Evening: meet demand (${DEMAND.evening} PU) with solar at ${SOLAR.evening} PU`)}
    ${item(st.explanationSubmitted, 'Explain what you changed and what showed it worked')}
  </ul>
  ${
    st.eveningServed
      ? `<label for="explanation" class="eyebrow">Your explanation</label>
  <textarea id="explanation" rows="3" data-input="explanation" data-key="explanation" ${m.explanationSubmitted ? 'readonly' : ''}>${esc(m.explanation)}</textarea>
  ${m.explanationSubmitted ? '' : btn('Submit explanation', 'submit-explanation', { cls: 'secondary', key: 'submit-explanation' })}`
      : ''
  }
  ${st.passed ? `<div class="feedback good" role="status"><strong>One evening interval completed.</strong> Try one more evening without recharging — what happens to the battery?</div>` : ''}
</div>`;
  }

  return `${controls}
${stats}
${previewBox}
${m.error ? `<p class="feedback retry" role="alert">${esc(m.error)}</p>` : ''}
<div class="row">
  ${btn('Run one interval', 'run', { cls: 'primary big', key: 'run' })}
  ${btn('Reset experiment', 'reset-experiment', { cls: 'secondary', key: 'reset-experiment' })}
</div>
${lastHtml}
${challenge}
${history}
<details class="limits"><summary>About this model</summary><p class="small">${esc(MODEL_LIMITS)}</p><p class="small"><strong>${esc(GLOSSARY[6].term)}:</strong> ${esc(GLOSSARY[6].definition)}</p></details>`;
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
<fieldset class="control"><legend>Session</legend>
  <p class="small">Preferences are saved on this device. Lesson progress is not saved: refreshing returns to the opening screen with a fresh neighborhood.</p>
  ${btn('Clear session', 'clear-session', { cls: 'danger', key: 'clear-session' })}
</fieldset>`;
}
