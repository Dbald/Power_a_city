# Platform decision

**Decision (October 13, 2026):** Build Power a City as a standalone browser app on the same stack as Ocean Explorer: Vite, TypeScript and three.js, with no UI framework.

## Reuse assessment (PRD §11, milestone 1)

- **Atlas:** no Atlas repository is available to this GitHub account, so nothing from it was inspected or reused. The PRD's suggested React Three Fiber stack depended on Atlas reuse, so it was not adopted.
- **Ocean Explorer** (`Dbald/Ocean-Explorer`): inspected. It uses Vite 8, TypeScript 7, three.js 0.186, Vitest and Playwright, with no React. The PRD says to match existing supported dependencies instead of adding a new stack, so Power a City uses the same dependency set and versions.

Reused from Ocean Explorer by copying patterns, with no changes to that project:

| Pattern | Where here |
|---|---|
| Build, test and CI config (legacy-browser targets for classroom boards, Playwright on swiftshader) | `vite.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml` |
| Content records with review status, sources, and a release gate | `src/content/types.ts`, `src/content/validate.ts` |
| Delegated `data-action` buttons and focus-preserving re-render | `src/ui/html.ts`, `src/app.ts` |
| Guarded local preferences with Clear session | `src/store.ts` |
| Boot-error fallback and classroom-first CSS (56px controls, text scaling) | `index.html`, `src/styles.css` |

New for this project:

- `src/model/` holds pure, deterministic GridModel and route functions with no rendering dependency.
- `src/scene/view.ts` defines a `CityView` contract that both `CityScene` (3D) and `FlatScene` (2D) implement. A future WebXR renderer can implement the same interface and leave the model and content unchanged.

## Revisit when

- Atlas becomes available: compare its lesson shell and media player with this one before milestone 5 (media).
- Ocean Explorer and Power a City are maintained together: extract the shared shell (content validation, store, narration) into a package. Keep the two apps independent until then.
