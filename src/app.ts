/**
 * ExperienceShell + LessonController for the milestone 2 vertical slice.
 * Holds app state, renders panels, and tells the active view what to show.
 * All numbers come from the pure GridModel; the views only display them.
 */
import { CARDS } from './content/cards.ts';
import { SLICE_STEPS } from './content/lesson.ts';
import type { InfrastructureId } from './content/types.ts';
import {
  BATTERY_CAPACITY,
  GENERATOR_MAX,
  GENERATOR_MIN,
  initialScenario,
  runInterval,
  validateSettings,
  type BatteryMode,
  type IntervalResult,
  type Period,
  type Scenario,
  type Settings,
} from './model/grid.ts';
import {
  ROUTE_ORDER,
  connectedPrefix,
  connectedRoute,
  initialRoute,
  placeInSlot,
  selectCard,
  submitRoute,
  trayCards,
  type CheckResult,
  type RouteState,
  type StageId,
} from './model/route.ts';
import { CityScene, webglAvailable } from './scene/CityScene.ts';
import { FlatScene } from './scene/FlatScene.ts';
import { BOOKMARK_FOR, SELECTABLE, type CityView, type ViewState } from './scene/view.ts';
import { clearAll, defaultPreferences, loadPreferences, savePreferences, type Preferences } from './store.ts';
import { cardView, connectView, entryView, experimentExtras, modelPanel, narrationDetails, routeStepView, settingsView, stepHeader, unitsIntro } from './ui/panels.ts';

type Screen = 'entry' | 'learn' | 'explore';

const DEFAULT_SETTINGS: Settings = { period: 'day', generator: 4, battery: 'idle' };
const STAGES = ROUTE_ORDER as readonly InfrastructureId[];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class App {
  private screen: Screen = 'entry';
  private step = 0;
  private visited: InfrastructureId[] = [];
  private route: RouteState = initialRoute();
  private lastCheck: CheckResult | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private scenario: Scenario = initialScenario();
  private lastResult: IntervalResult | null = null;
  private explanation = '';
  private explanationSubmitted = false;
  /** Learners meet PU and EU once per lesson, before the experiment controls appear. */
  private unitsIntroDone = false;
  private runError: string | null = null;
  private selected: InfrastructureId | null = null;
  private prefs: Preferences;
  private systemReducedMotion: boolean;
  private webgl = webglAvailable();
  private view: CityView | null = null;
  private notice = '';

  constructor() {
    this.systemReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.prefs = loadPreferences(this.systemReducedMotion);
  }

  init() {
    this.applyPrefs();
    this.mountView();
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('input', (e) => this.onInput(e));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.selected && !$<HTMLDialogElement>('settings').open) this.closeCard();
    });
    $<HTMLDialogElement>('settings').addEventListener('close', () => this.render());
    this.render();
    document.documentElement.setAttribute('data-booted', '1');
  }

  // ── View lifecycle ───────────────────────────────────────────────────────

  private mountView() {
    this.view?.dispose();
    const stage = $('stage');
    const loading = $('loading');
    loading.hidden = false;
    const labels = Object.fromEntries(CARDS.map((c) => [c.id, c.title])) as Record<InfrastructureId, string>;
    const opts = { onSelect: (id: InfrastructureId) => this.select(id), reducedMotion: this.prefs.reducedMotion, labels };
    const want3d = this.prefs.presentation === '3d' && this.webgl;
    try {
      this.view = want3d ? new CityScene(stage, opts) : new FlatScene(stage, opts);
    } catch (err) {
      // PC-01: a failed 3D start falls back to the same lesson in 2D.
      console.error(err);
      this.webgl = false;
      this.notice = '3D could not start in this browser, so the 2D map is shown. The lesson is the same.';
      this.view = new FlatScene(stage, opts);
    }
    if (want3d && this.view instanceof CityScene) {
      stage.querySelector('canvas')?.addEventListener('webglcontextlost', () => {
        this.webgl = false;
        this.notice = 'The 3D view stopped responding, so the 2D map is shown. Your progress is unchanged.';
        this.mountView();
        this.render();
      });
    }
    stage.dataset.presentation = this.view instanceof CityScene ? '3d' : '2d';
    loading.hidden = true;
    this.view.setReducedMotion(this.prefs.reducedMotion);
    this.view.setFreeCamera(this.screen === 'explore');
    this.view.setSelected(this.selected);
    this.syncView();
  }

  private connected() {
    return this.route.connected;
  }

  private viewState(): ViewState {
    const learnBeforeExperiment = this.screen === 'learn' && this.step < 2;
    let supply: ViewState['supply'] = 'off';
    if (this.connected()) {
      supply = this.lastResult && this.lastResult.settings.period === this.settings.period ? (this.lastResult.unmet === 0 ? 'full' : 'short') : 'ready';
    }
    const visible: InfrastructureId[] = this.screen === 'entry' ? [] : learnBeforeExperiment ? [...STAGES] : [...SELECTABLE];
    return {
      period: this.settings.period,
      routeLit: this.connected() ? 5 : this.lastCheck ? connectedPrefix(this.route.slots) : 0,
      supply,
      stored: this.scenario.stored,
      capacity: BATTERY_CAPACITY,
      battery: this.settings.battery,
      flow: this.prefs.flow,
      visible,
      visited: this.screen === 'learn' ? this.visited : [],
    };
  }

  private syncView() {
    this.view?.setState(this.viewState());
  }

  // ── State changes ────────────────────────────────────────────────────────

  /** Starting Learn or Explore always creates a clean scenario (PRD §5). */
  private start(screen: 'learn' | 'explore') {
    this.screen = screen;
    this.step = 0;
    this.unitsIntroDone = false;
    this.visited = [];
    this.route = screen === 'explore' ? connectedRoute() : initialRoute();
    this.lastCheck = null;
    this.resetExperiment();
    this.selected = null;
    this.view?.setSelected(null);
    this.view?.setFreeCamera(screen === 'explore');
    this.view?.frame('overview');
  }

  private resetExperiment() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.scenario = initialScenario();
    this.lastResult = null;
    this.explanation = '';
    this.explanationSubmitted = false;
    this.runError = null;
  }

  private select(id: InfrastructureId) {
    if (this.screen === 'entry') return;
    this.selected = id;
    // Revisiting a card never counts twice.
    if (this.screen === 'learn' && STAGES.includes(id) && !this.visited.includes(id)) this.visited = [...this.visited, id];
    this.view?.setSelected(id);
    this.view?.frame(BOOKMARK_FOR[id]);
    this.render();
    this.focusKey('card-title');
  }

  private closeCard() {
    const id = this.selected;
    this.selected = null;
    this.view?.setSelected(null);
    this.render();
    // Return focus to whatever opened the card.
    if (id && !this.focusKey(`list:${id}`)) this.focusKey(`hotspot:${id}`);
  }

  private setSettings(next: Settings) {
    const v = validateSettings(next);
    if (!v.ok) {
      this.runError = v.reason;
      return;
    }
    this.runError = null;
    this.settings = next;
  }

  private run() {
    if (!this.connected()) return;
    try {
      this.scenario = runInterval(this.scenario, this.settings);
      this.lastResult = this.scenario.attempts[this.scenario.attempts.length - 1].result;
      this.runError = null;
    } catch (err) {
      this.runError = err instanceof Error ? err.message : 'That setting is not supported.';
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private onInput(e: Event) {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement;
    const key = t.dataset?.input;
    if (key === 'generator') {
      this.setSettings({ ...this.settings, generator: Number(t.value) });
      this.render();
    } else if (key === 'explanation') {
      this.explanation = t.value;
    }
  }

  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const action = el.dataset.action!;
    const arg = el.dataset.arg ?? '';
    let focus: string | null = null;

    switch (action) {
      case 'start-learn':
        this.start('learn');
        focus = 'instruction';
        break;
      case 'start-explore':
        this.start('explore');
        focus = 'instruction';
        break;
      case 'home':
        this.screen = 'entry';
        this.selected = null;
        this.view?.setSelected(null);
        this.view?.setFreeCamera(false);
        this.view?.frame('overview');
        focus = 'start-learn';
        break;
      case 'step-next':
        if (this.step === 1 && !this.connected()) return;
        this.step = Math.min(SLICE_STEPS.length - 1, this.step + 1);
        this.selected = null;
        this.view?.setSelected(null);
        this.view?.frame(this.step === 2 ? 'experiment' : 'overview');
        focus = 'instruction';
        break;
      case 'step-back':
        this.step = Math.max(0, this.step - 1);
        this.selected = null;
        this.view?.setSelected(null);
        this.view?.frame('overview');
        focus = 'instruction';
        break;
      case 'units-done':
        this.unitsIntroDone = true;
        focus = 'instruction';
        break;
      case 'restart':
        this.start('learn');
        focus = 'instruction';
        break;
      case 'select':
        return this.select(arg as InfrastructureId);
      case 'close-card':
        return this.closeCard();
      case 'reset-view':
        this.view?.resetView();
        return;
      case 'route-card': {
        this.route = selectCard(this.route, arg as StageId);
        const empty = this.route.slots.findIndex((x) => x === null);
        focus = this.route.selected ? `route-slot:${Math.max(0, empty)}` : `route-card:${arg}`;
        break;
      }
      case 'route-slot': {
        const i = Number(arg);
        const placing = this.route.selected !== null;
        this.route = placeInSlot(this.route, i);
        this.lastCheck = null;
        // After placing, move on to the next card; after picking a card up, stay on the slot.
        focus = !placing ? `route-slot:${i}` : trayCards(this.route).length ? 'tray' : 'route-check';
        break;
      }
      case 'route-clear':
        this.route = initialRoute();
        this.lastCheck = null;
        break;
      case 'route-check': {
        const { state, result } = submitRoute(this.route);
        this.route = state;
        this.lastCheck = result;
        if (result.correct) this.view?.frame('overview');
        focus = 'route-feedback';
        break;
      }
      case 'period':
        this.setSettings({ ...this.settings, period: arg as Period });
        break;
      case 'gen-dec':
      case 'gen-inc': {
        const g = this.settings.generator + (action === 'gen-inc' ? 1 : -1);
        this.setSettings({ ...this.settings, generator: Math.min(GENERATOR_MAX, Math.max(GENERATOR_MIN, g)) });
        break;
      }
      case 'battery':
        this.setSettings({ ...this.settings, battery: arg as BatteryMode });
        break;
      case 'run':
        this.run();
        focus = 'run-result';
        break;
      case 'reset-experiment':
        this.resetExperiment();
        focus = 'run';
        break;
      case 'submit-explanation':
        if (!this.explanation.trim()) return void this.focusKey('explanation');
        this.explanationSubmitted = true;
        break;
      case 'open-settings':
        this.renderSettings();
        $<HTMLDialogElement>('settings').showModal();
        return;
      case 'close-settings':
        $<HTMLDialogElement>('settings').close();
        return;
      case 'text-size':
        this.updatePrefs({ textScale: Math.round(Math.min(1.5, Math.max(0.75, this.prefs.textScale + Number(arg) * 0.125)) * 1000) / 1000 });
        return;
      case 'presentation':
        this.updatePrefs({ presentation: arg as Preferences['presentation'] });
        this.mountView();
        return this.render();
      case 'reduced-motion':
        this.updatePrefs({ reducedMotion: arg === 'on' });
        this.view?.setReducedMotion(this.prefs.reducedMotion);
        return;
      case 'flow':
        this.updatePrefs({ flow: arg === 'on' });
        return;
      case 'clear-session':
        if (!window.confirm('Clear this session? Progress and saved preferences on this device will be removed.')) return;
        clearAll();
        this.prefs = defaultPreferences(this.systemReducedMotion);
        this.applyPrefs();
        $<HTMLDialogElement>('settings').close();
        this.start('learn');
        this.screen = 'entry';
        this.view?.setFreeCamera(false);
        this.mountView();
        this.notice = 'Session cleared.';
        focus = 'start-learn';
        break;
      case 'dismiss-notice':
        this.notice = '';
        break;
      default:
        return;
    }
    this.render();
    if (focus === 'tray') document.querySelector<HTMLElement>('.tray .btn')?.focus();
    else if (focus) this.focusKey(focus);
  }

  private updatePrefs(patch: Partial<Preferences>) {
    this.prefs = { ...this.prefs, ...patch };
    savePreferences(this.prefs);
    this.applyPrefs();
    this.renderSettings();
    this.syncView();
  }

  private applyPrefs() {
    document.documentElement.style.setProperty('--text-scale', String(this.prefs.textScale));
    document.documentElement.classList.toggle('reduced-motion', this.prefs.reducedMotion);
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private focusKey(key: string): boolean {
    const el = document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    el?.focus();
    return !!el;
  }

  /** Re-renders a region while keeping keyboard focus on the same logical control. */
  private patch(el: HTMLElement, html: string) {
    const active = document.activeElement as HTMLElement | null;
    const key = active && el.contains(active) ? active.dataset.key : undefined;
    if (el.innerHTML !== html) el.innerHTML = html;
    if (key) el.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }

  private renderSettings() {
    this.patch($('settings'), settingsView(this.prefs, this.webgl));
  }

  private render() {
    const inLesson = this.screen !== 'entry';
    $('entry').hidden = inLesson;
    if (!inLesson) this.patch($('entry'), entryView());

    const notice = $('notice');
    notice.hidden = !this.notice;
    notice.innerHTML = this.notice ? `<span>${this.notice}</span> <button type="button" class="btn small-btn ghost" data-action="dismiss-notice">Dismiss</button>` : '';

    const top = $('top-actions');
    this.patch(
      top,
      [
        inLesson ? `<button type="button" class="btn small-btn ghost" data-action="home" data-key="home">Home</button>` : '',
        inLesson && this.view instanceof CityScene ? `<button type="button" class="btn small-btn ghost" data-action="reset-view" data-key="reset-view">Reset view</button>` : '',
        `<button type="button" class="btn small-btn ghost" data-action="open-settings" data-key="open-settings">Settings</button>`,
      ].join(''),
    );

    const cardEl = $('card');
    cardEl.hidden = !this.selected;
    if (this.selected) this.patch(cardEl, cardView(this.selected, this.screen === 'learn'));

    const dock = $('dock');
    dock.hidden = !inLesson;
    if (inLesson) this.patch(dock, this.screen === 'learn' ? this.learnDock() : this.exploreDock());
    $('app').classList.toggle('has-dock', inLesson);
    this.syncView();
  }

  private experimentInput(guided: boolean) {
    return {
      connected: this.connected(),
      settings: this.settings,
      scenario: this.scenario,
      last: this.lastResult,
      guided,
      explanation: this.explanation,
      explanationSubmitted: this.explanationSubmitted,
      error: this.runError,
    };
  }

  private learnDock(): string {
    let body = '';
    let extras = narrationDetails(this.step);
    if (this.step === 0) body = routeStepView(this.visited);
    else if (this.step === 1) body = connectView(this.route, this.lastCheck);
    else if (!this.unitsIntroDone) {
      body = unitsIntro();
      extras = narrationDetails(this.step, 'PAC-07');
    } else {
      body = modelPanel(this.experimentInput(true));
      extras += experimentExtras(this.experimentInput(true));
    }
    const nextBlocked = this.step === 1 && !this.connected();
    const last = this.step === SLICE_STEPS.length - 1;
    return `<div class="dock-body">${stepHeader(this.step)}${body}</div>
<nav class="dock-nav" aria-label="Lesson navigation">
  <button type="button" class="btn secondary" data-action="step-back" data-key="step-back" ${this.step === 0 ? 'disabled' : ''}>← Back</button>
  ${nextBlocked ? '<span id="next-why" class="small muted">Connect the route to continue.</span>' : ''}
  <div class="nav-extras">${extras}</div>
  ${
    last
      ? `<button type="button" class="btn secondary" data-action="restart" data-key="restart">Restart</button>`
      : `<button type="button" class="btn primary" data-action="step-next" data-key="step-next" ${nextBlocked ? 'disabled aria-describedby="next-why"' : ''}>Next →</button>`
  }
</nav>`;
  }

  private exploreDock(): string {
    return `<div class="dock-body">
  <div class="step-row"><h2 class="instruction" tabindex="-1" data-key="instruction">Explore the neighborhood</h2><span class="step-meta">Explore · no score</span></div>
  <p class="small">Select any part to learn about it. Drag to look around. New to PU and EU? Open <strong>What are PU &amp; EU?</strong> below.</p>
  ${modelPanel(this.experimentInput(false))}
</div>
<nav class="dock-nav" aria-label="Explore navigation">
  <div class="nav-extras">${experimentExtras(this.experimentInput(false))}</div>
  <button type="button" class="btn primary" data-action="start-learn" data-key="explore-learn">Start lesson</button>
</nav>`;
  }
}
