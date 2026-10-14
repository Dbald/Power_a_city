# Power a City: From Source to Streetlight

A teacher-led browser lesson about how electricity gets from its source to a neighborhood, and what keeps it available. It is part of the Devinci Global immersive learning portfolio, alongside Ocean Explorer. The product spec is in [`docs/PRD.md`](docs/PRD.md).

> A fictional neighborhood with a simplified teaching model. It does not represent a real utility or city network. All numbers are fictional teaching units (PU = power units, EU = stored-energy units).

## Status: milestone 2 vertical slice

This is the PRD's first coding task (§13): placeholder geometry, the five-stage connection exercise, and a UI panel driven by the pure model.

| Area | State |
|---|---|
| GridModel (§6) | Complete and deterministic. Every required model check is a unit test. |
| Opening screen | Start lesson, Explore, and accessibility settings |
| Guided slice | Explore the route → Connect → Experiment, with Back/Next and restart |
| Infrastructure cards (PC-02) | 7 cards (5 stages plus solar and battery). Each has sources and is marked *draft*. |
| Connection exercise (PC-03) | Select a card, then select a slot; no dragging. Wrong orders get explanations and a retry. |
| Experiment (PC-06/07) | Opens with a "Two kinds of numbers" card that explains PU (power, like water from a tap) and EU (stored energy, like water in a bucket) before any number appears; the explainer stays one click away. Mission tracker (charge by day → light the evening → explain) with a next-move hint; separate settings, preview and Run; cause-based feedback. Fits the panel without scrolling down to 1366×768. |
| 3D scene | three.js placeholder neighborhood with camera bookmarks, picking, limited orbit in Explore, and Reset view |
| 2D presentation (PC-11) | SVG map driven by the same `ViewState` and model. Used automatically when WebGL is missing or fails. |
| Preferences (PC-12) | Text size, 2D/3D, reduced motion, and flow overlay. Saved locally. Clear session. |

Not built yet (milestones 3–6): the prediction step, the three exit questions and rubric, the printable teacher guide, recorded narration and presenter media (the draft scripts for PAC-01…09 appear as text), and classroom validation.

## Run it

```bash
npm install
npm run dev            # local dev server
npm test               # unit tests: model checks, route, content
npm run typecheck
npm run validate:content
npm run test:e2e       # Playwright; set CHROMIUM_PATH to use a preinstalled Chromium
npm run release-check  # fails until every card and script is reviewed (PRD §14)
```

## Layout

```
src/model/grid.ts      GridModel: pure interval maths, preview/run/reset, challenge status
src/model/route.ts     Five-stage connection exercise
src/content/           Cards, sources, feedback copy, lesson steps, narration slots, validation
src/scene/view.ts      CityView contract shared by both presentations
src/scene/CityScene.ts 3D neighborhood (three.js, placeholder geometry)
src/scene/FlatScene.ts 2D SVG presentation
src/ui/panels.ts       Panel templates
src/app.ts             Shell and lesson state
```

## Model rules (PRD §6)

With A = G + S and dt = 1 model hour:

- Charge C = min(2, max(0, A − D), 6 − E), in charge mode only
- Discharge B = min(2, max(0, D − A), E), in discharge mode only
- Served = min(D, A + B); unmet = max(0, D − A − B); unused = max(0, A − D − C)
- Next E = E + C − B

Every interval satisfies G + S + B = served + C + unused. Storage is idealized and lossless; the lesson tells learners that real storage is not. Unused output is labeled "reduced / not used". It is never silently stored.

**Challenge pass rule:** an evening interval meets demand after at least one daytime interval met demand, and the learner submits an explanation. Any strategy that does this passes, including several daytime charges. Evening demand (10 PU) is higher than the generator's maximum (8 PU), so passing always depends on stored energy.

## Session behavior

Only display preferences are stored, in `localStorage`. Lesson progress is not stored: a refresh returns to the opening screen with a fresh scenario. **Clear session** removes everything the app stored. No names, accounts, recordings or analytics are collected.

## Decisions

See [`docs/platform-decision.md`](docs/platform-decision.md) for the reuse assessment and why this uses Ocean Explorer's stack instead of React Three Fiber.
