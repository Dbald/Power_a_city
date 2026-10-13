# Power a City
## Product requirements document · V1.0 · October 12, 2026

**Owner:** Devin Baldwin / Devinci Global LLC  
**Product track:** Immersive learning platforms  
**Status:** Build-ready product proposal; repository inspection, content review, and classroom validation remain implementation gates.  
**Working title:** Power a City, following the selected project name; “Power over City” can be adopted as a later naming change.

## 1. Product vision

Let learners step inside the electrical infrastructure behind everyday life. In a small interactive neighborhood, learners follow the delivery path, connect its stages, predict changing demand, and experiment with generation and storage to keep the lights on.

The core experience is discovery and explanation. This is an educational world in the same portfolio as Atlas and Ocean Explorer. It is not workplace electrical training, a utility operations simulator, or a construction tool.

**Guiding question:** How does electricity get from its source to your home—and what keeps it available?

**First lesson:** From Source to Streetlight. One guided 8–10-minute lesson, one neighborhood, one supply-and-demand challenge, and a free Explore mode.

## 2. Decisions and assumptions

### Established direction

- Power a City is the next immersive learning project; Sound Lab is deferred.
- Use an explorable environment, guided instruction, experiments, and learning checks.
- Include Devin’s own recorded narration/presenter media and classroom delivery.
- Keep V1 bounded; city economics, traffic, water systems, and other infrastructure are outside the first release.

### Proposed implementation defaults

- Teacher-led desktop/classroom display first; self-paced browser use also works.
- Initial language and numerical reasoning target grades 3–6. This is an assumption to validate, not a confirmed audience or standards claim.
- No student login, backend, subscription system, or live utility feed.
- Use React, TypeScript, and React Three Fiber if repository inspection confirms a suitable reuse path from Atlas. Match existing supported dependencies rather than introducing a new stack unnecessarily.
- Production VR is a later extension. Keep content independent of input and rendering so it can support future devices.
- Choose a fictional neighborhood. No real utility, city network, or surveyed infrastructure is represented.

## 3. Learning outcomes

After the lesson, a learner should be able to:

1. Put the major delivery stages in order: generation, transmission, substation, distribution, and buildings.
2. Explain that electricity demand can change during the day.
3. Describe how available generation and stored energy can help meet demand.
4. Explain that a battery must be charged and cannot supply energy indefinitely.
5. Use an observation from the model to explain one successful decision.

Introduce generation, transmission, substation, distribution, demand, and storage when each becomes relevant. An optional detail panel distinguishes power from energy; the first lesson does not require unit conversion.

## 4. V1 scope

| Include | Defer |
|---|---|
| One compact neighborhood with homes, school, shops, and streetlights | Large city builder, zoning, land purchase, roads, and traffic simulation |
| One dispatchable generation source, one solar source, one battery | Large generator catalog, fuel markets, emissions optimization |
| Simplified delivery route with transformer context | AC load flow, voltage/frequency dynamics, protective relays |
| Guided Learn, Explore, and one Exercise | Multiple curricula, multiplayer, student accounts |
| Daytime and evening scenario states | Live weather, real grid telemetry, procedural disasters |
| Narration, captions, transcripts, optional presenter video | AI tutor, multilingual dubbing, elaborate cutscenes |
| Three exit questions and printable teacher guide | LMS integration, certification, persistent student analytics |
| Equivalent accessible 2D presentation | Production headset support and hand interactions |

The neighborhood is authored in advance. Learners connect conceptual stages rather than constructing unrestricted electrical wiring.

## 5. Experience and lesson flow

| Target time | Stage | Interaction | Teaching evidence |
|---|---|---|---|
| 0:00–0:45 | Invitation | View the neighborhood and consider how a home gets electricity | Teacher gathers an initial explanation |
| 0:45–2:15 | Explore the route | Select five delivery stages; camera frames each location | Learner describes each stage’s role |
| 2:15–3:30 | Connect | Arrange delivery-stage cards; illuminate the completed route | Correct order with explanation and retry |
| 3:30–4:15 | Predict | Predict what changes as the neighborhood enters evening | Prediction recorded before reveal |
| 4:15–7:00 | Experiment | Charge during daytime; adjust generation and discharge at evening | Compare two intervals and observe storage changes |
| 7:00–8:30 | Explain | Answer three exit questions | Feedback and teacher rubric |
| 8:30–10:00 | Recap / discussion | Revisit a choice or enter Explore | Completion summary distinguishes skipped work |

Timing is a target, never a forced countdown. Back, Next, replay, skip media, pause, and restart remain available. A teacher can extend discussion.

### Opening screen

Show title, one-sentence objective, Start lesson, Explore, and accessibility settings. Start on a calm elevated view of the neighborhood. Start audio only after an intentional gesture.

### Explore

Select infrastructure and buildings to reveal short cards. Learners can view day/evening presets, inspect demand, and experiment without a score. Starting Learn or Exercise creates a clean scenario; it never inherits an accidentally depleted battery.

### Visual payoff

Connected buildings illuminate, an optional flow overlay traces the route, and demand indicators change between scenarios. Overlays are explanatory graphics—not depictions of electron speed. A supply shortfall uses a clear “Demand not fully met” status and a simplified illustrative change, not an unsupported prediction of which real buildings would fail.

## 6. Simulation specification

Implement a deterministic teaching model separate from the renderer. This is a proposed game model, not measured utility data. All fixture values below are illustrative.

### Topology model

Use a conceptual sequence for the connection exercise. Explain that real grids have interconnected paths; the single route is an instructional simplification. Include step-up and step-down transformer context within cards and scene labels without adding more required ordering cards.

Completion requires all five stages in the correct order. Incorrect selections explain the mismatch and allow retry. Do not implement drag-only interactions; select-card/select-slot works with mouse, touch, and keyboard.

### Supply model

Use “power units” (PU) and “stored-energy units” (EU), with a fixed simulated interval of one model hour. Label them fictional teaching units; never imply actual neighborhood consumption.

State:

- Dispatchable generator output G: 0–8 PU, integer steps.
- Solar availability S: 6 PU in daytime, 0 PU in evening.
- Neighborhood demand D: 8 PU in daytime, 10 PU in evening.
- Battery energy E: 0–6 EU; initial value 0.
- Battery charge/discharge rate limit: 2 PU.
- Battery mode: idle, charge, or discharge; mutually exclusive.

Learners choose settings and press **Run one interval**. There is no real-time depletion while the teacher talks. Preview settings without modifying stored energy.

For a connected system, let available generation A = G + S and interval length dt = 1:

- Charge C = min(2, max(0, A − D), (6 − E)/dt) only in charge mode; otherwise zero.
- Discharge B = min(2, max(0, D − A), E/dt) only in discharge mode; otherwise zero.
- Served demand = min(D, A + B).
- Unmet demand = max(0, D − A − B).
- Unused available output = max(0, A − D − C).
- Next stored energy = E + (C − B) × dt.

Unused output is labeled as reduced/not used in this model. It is not silently stored or forced into buildings. Actual losses, ramp limits, and network constraints are omitted; explicitly label storage as idealized with no modeled losses. Real storage is not lossless.

The delivery activity must be completed before the guided experiment. If a disconnected topology is exposed in Explore, disable the neighborhood simulation and explain that the route must first be connected; do not silently charge or power disconnected assets.

### Solvable default challenge

1. Daytime: G=4, S=6, D=8, charge mode, E=0. One interval serves demand and stores 2 EU.
2. Evening: G=8, S=0, D=10, discharge mode, E=2. One interval serves demand and ends at E=0.
3. Extension prompt: repeat evening without recharging. The model now shows a 2-PU shortfall.

The challenge passes only when the learner serves demand in both the daytime preparation and evening interval and submits an explanation. Show “One evening interval completed,” never “City powered forever.” Permit valid alternative preparation strategies, including repeated daytime charging, rather than checking one exact click sequence.

### Required model checks

- Empty battery cannot discharge; full battery cannot overcharge.
- No simultaneous charging and discharging.
- Preview does not advance the scenario; one Run advances exactly one interval.
- Pause, frame rate, and narration duration cannot change numerical outcomes.
- Solar is zero at the evening preset.
- Reset restores the specified initial state and clears attempts.
- The default solution produces exactly the results above.
- For each interval: G + S + B = served demand + C + unused output.

## 7. Functional requirements

| ID | Requirement | Acceptance criterion |
|---|---|---|
| PC-01 | Launch and recovery | Learn and Explore launch; loading has meaningful status; failed assets offer retry or 2D fallback |
| PC-02 | Infrastructure inspection | All five stages open correct cards with accessible names, close controls, and return-to-lesson action |
| PC-03 | Connection exercise | Correct order passes; incorrect order explains why; keyboard and tap workflows work without dragging |
| PC-04 | Guided lesson state | Back/Next, step indicator, replay, and restart behave predictably; revisiting never awards duplicate completion |
| PC-05 | Predict before reveal | Prediction is captured locally before evening is revealed; teacher can skip with “not attempted” status |
| PC-06 | Simulation controls | Settings, preview, and Run are separate; displayed numbers match the model; unsupported states are rejected |
| PC-07 | Meaningful feedback | Every attempt explains the observed cause: generation, solar availability, demand, or battery depletion |
| PC-08 | Assessment | Three exit questions have feedback and a teacher rubric; no timer-based scoring |
| PC-09 | Media | User-triggered narration, pause/mute/replay, captions and transcript; missing presenter video never blocks progression |
| PC-10 | Teacher guide | Printable guide includes setup, objective, sequence, prompts, answer guidance, model limitations, and sources |
| PC-11 | Accessible alternative | Complete lesson and experiment work in semantic 2D controls if 3D is unavailable or unsuitable |
| PC-12 | Session management | Clear session resets progress and preferences as documented; refresh behavior is explicit and tested |

## 8. Assessment

1. **Delivery:** Put the delivery stages in order. Feedback explains the role of a misplaced stage.
2. **Storage:** Why could the battery help once but not keep doing so without recharging? Expected idea: finite stored energy.
3. **Reasoning:** What did you change to meet evening demand, and what evidence showed it worked?

Reasoning rubric: 0 = unrelated/no explanation; 1 = names a relevant action; 2 = connects the action to demand, available supply, or stored energy using an observed result.

Record class-level responses only on a shared screen. A completion badge is participation feedback, not evidence of individual mastery. No learning-improvement claim is made before a pilot.

## 9. Content and media plan

Prepare text and interaction timing first; record after terminology and model review.

| Asset ID | Segment | Draft teaching purpose | Proposed length |
|---|---|---|---|
| PAC-01 | Welcome | Ask how electricity reaches a home | 15–20 seconds |
| PAC-02 | Generation | Introduce the source of electrical supply | 15–20 seconds |
| PAC-03 | Transmission | Explain long-distance delivery | 15–20 seconds |
| PAC-04 | Substation | Explain the change in voltage for delivery stages | 15–20 seconds |
| PAC-05 | Distribution and buildings | Link local lines to everyday uses | 15–20 seconds |
| PAC-06 | Prediction | Ask what changes at evening | 10–15 seconds |
| PAC-07 | Storage | Distinguish stored energy from generation | 20–25 seconds |
| PAC-08 | Experiment directions | Explain settings, preview, and one interval | 20–30 seconds |
| PAC-09 | Reflection | Ask for a claim supported by an observation | 15–20 seconds |

All nine are proposed narration slots, not recorded assets. Optional filmed presenter takes: welcome, prediction, reflection. Use Devin’s recordings; a transcript-led development build is acceptable while filming.

Each asset record contains ID, lesson step, script version, review status, audio/video path, caption path, transcript, duration, and recording status. Playback stops when leaving the step; overlapping voices are prohibited. Presenter panels are dismissible and do not cover controls. Render takes unmirrored by default.

## 10. Interface, art, and accessibility

Create a warm, readable miniature neighborhood with recognizable infrastructure and restrained movement. The lesson UI should be more prominent than decorative effects.

- Guided camera bookmarks for source, transmission, substation, street, and neighborhood overview.
- Limited orbit/zoom in Explore, plus persistent Reset view.
- One main task and one information card at a time.
- Separate status labels for available supply, demand, battery energy, and interval result.
- Approximately 56-pixel classroom touch targets and adjustable text size; validate from the back of the actual room.
- Visible keyboard focus, semantic controls, labeled sliders with step buttons, and no color-only signals.
- Captions enabled by default in classroom mode; independent voice and ambience controls.
- Reduced-motion option; no forced camera sway, flashing blackout effects, or timed reaction tasks.
- The 2D view uses the same data and simulation results, not a separate approximation.

## 11. Architecture and reuse

Before scaffolding, inspect the available Atlas/Ocean Explorer projects. The user reports working lesson, media, and classroom patterns; shared code has not been verified. Reuse proven components where compatible without changing those projects as a prerequisite.

Proposed modules:

- ExperienceShell: entry, modes, loading, settings, errors.
- LessonController: step state, prerequisites, attempts, replay, recap.
- CityScene: authored neighborhood, selectable objects, camera bookmarks.
- GridModel: pure deterministic functions, independent of rendering.
- ContentRegistry: cards, scripts, source records, glossary, scenario fixtures.
- PresenterPlayer: narration/video/captions with fallback.
- TeacherGuide and Assessment: printable content and rubric.
- AccessiblePresentation: DOM-based equivalent lesson.

Persist only non-identifying preferences/progress locally, with Clear session. No student names, recordings, or behavioral tracking are needed.

Proposed content entities: LessonStep, InfrastructureCard, Scenario, Prediction, Attempt, MediaAsset, SourceRecord. Every claim-bearing card references a source and review status. Scenario configuration is versioned separately from media.

## 12. Performance and compatibility

Proposed targets, to be measured rather than advertised as existing capabilities:

- First usable scene within 10 seconds on a documented 20-Mbps test connection.
- Initial essential transfer at most 15 MB compressed; optional videos load on demand.
- Sustained 30 FPS on the actual classroom computer; lower quality reduces effects without removing learning content.
- Essential local control feedback within roughly 200 ms.
- Complete a 15-minute rehearsal without unrecoverable state, crash, or overlapping narration.
- Mouse and keyboard cover all tasks; test touch where the classroom hardware supports it.
- Record the classroom browser/OS versions. If required graphics features fail, provide the usable 2D lesson immediately.

These budgets may be adjusted after the first measured slice. Full offline installation is deferred; failed network/media loads must have clear recovery and text fallbacks.

## 13. Build sequence

| Milestone | Work | Exit condition |
|---|---|---|
| 1. Inspect and scaffold | Assess reusable shell/media; create content and scenario records | Launchable app with one scene and one accessible card |
| 2. Playable slice | Source → route → one lit home; connection interaction; basic model panel | One coherent interaction works with mouse and keyboard |
| 3. Complete experiment | Day/evening states, battery, previews, Run, reset, explanations | Model fixtures and conservation checks pass |
| 4. Full lesson | Guided order, prediction, three questions, teacher guide, 2D presentation | Entire text-led lesson can be taught |
| 5. Media and review | Review claims/model framing; record and connect narration/presenter takes | Reviewed content, captions, transcripts, no media dead ends |
| 6. Classroom validation | Board rehearsal, class pilot, independent educator run | Blocking issues resolved; scope and evidence documented |

**First coding task:** Build milestone 2 as a small vertical slice: a home, a source, the five-stage connection interaction, and a UI panel driven by the pure model. Use placeholder geometry. Do not begin with a full city asset pack or elaborate skyline.

No delivery date or implementation effort is promised before repository and asset inspection.

## 14. Verification and release gates

Test the numerical edge cases from section 6; integration-test mode transitions, reset, media failure, and step revisits. Manually test classroom legibility, keyboard completion, touch, and 3D fallback. Screenshot review supports visual QA but cannot replace interaction checks.

V1 release requires:

- A complete lesson with no placeholder essential explanations.
- An educator or technically knowledgeable reviewer has checked content, units, model simplifications, and feedback; record reviewer, date, and content version.
- Every shipped asset has a source/license record.
- Required functional checks and deterministic model checks pass.
- A technical rehearsal on the actual classroom display passes.
- A classroom pilot records confusion points and exit-question responses without claiming proven efficacy.
- A second educator starts within two minutes using only the link and guide and can complete the lesson without Devin troubleshooting.

Pilot timing target is 8–10 minutes excluding optional discussion. Measure learning responses descriptively; establish any numerical mastery threshold after the first audience calibration.

## 15. Risks and boundaries

| Risk | Response |
|---|---|
| Learners assume this is a realistic operational grid | Label the conceptual model and show limitations in lesson and teacher guide |
| The battery appears to create energy | Require charging, show remaining energy, and include the empty-battery extension |
| Numerical sliders overshadow exploration | Reveal controls gradually and anchor each to an observable neighborhood change |
| Project grows into a city-management game | Hold V1 to one neighborhood and one lesson |
| Filming blocks engineering | Finish text-led flow, then record reviewed scripts |
| Reuse destabilizes existing platforms | Prefer isolated reuse; no Atlas/Ocean changes required for V1 |
| Content targets the wrong reading level | Pilot the proposed grades 3–6 language before a younger-learner extension |

## 16. Source foundation

Primary references checked October 12, 2026. They support factual teaching foundations, not the fictional scenario values or proof of learning effectiveness.

- [U.S. EIA — Delivery to consumers](https://www.eia.gov/energyexplained/electricity/delivery-to-consumers.php): generation-to-consumer infrastructure, transformer roles, and supply/demand balance.
- [U.S. EIA — Energy storage for electricity generation](https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php): storage roles and charging/discharging context.
- [U.S. EIA — Generation, capacity, and sales](https://www.eia.gov/energyexplained/electricity/electricity-in-the-us-generation-capacity-and-sales.php): distinction between generation and capacity; storage consumes energy to charge.

All numerical settings, interaction rules, UI budgets, and lesson timing in this PRD are proposed design choices. Final scripts and diagrams still need review; no utility affiliation, curriculum certification, or professional electrical qualification is implied.

**Definition of done:** Another educator can open Power a City, guide a complete lesson, run a consistent experiment, and use learner explanations to assess how electricity delivery, demand, and storage relate.
