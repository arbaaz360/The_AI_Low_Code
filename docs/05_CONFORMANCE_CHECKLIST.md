# Conformance Checklist (v0)

This file is the “truth ledger” for our non-negotiables.  
For each invariant, we record the evidence (tests and/or code locations).

---

## A. Non-negotiables (must always hold)

### A1. Metadata is the source of truth (no per-tenant compilation)
- Tenant apps are metadata (JSON) only.
- Runtime shell interprets metadata.

**Evidence**
- Schema + samples + AJV validation:
  - packages/schema/src/formdoc.schema.json
  - packages/schema/src/validate.ts
  - packages/schema/src/validate.test.ts
  - samples/form_basic.json, samples/form_rules.json, samples/form_big.json

---

### A2. Governance-first: no arbitrary tenant JS/CSS
- No JS strings for logic.
- Styling via tokens/variants only (no raw CSS injection from tenants by default).

**Evidence**
- JSON AST expression system:
  - packages/expr/src/ast.ts
  - packages/expr/src/eval.ts
  - packages/expr/src/deps.ts
  - packages/expr/src/integration_samples.test.ts
- Schema allows only allowlisted expression ops (no code strings):
  - packages/schema/src/formdoc.schema.json

---

### A3. Renderer parity: Studio canvas uses runtime renderer
- Canvas uses the same renderer; design mode adds overlays/attributes only.
- Overlays must not alter layout DOM.

**Evidence**
- ADR:
  - docs/03_ADR_001_RendererParity.md
- Renderer supports mode="design" and adds data attributes:
  - packages/renderer/src/PageRenderer.tsx (or index.ts)
  - packages/renderer/src/NodeRenderer.tsx

---

### A4. Renderer does not evaluate expressions
- Renderer must not call evalAst/collectDeps.
- Engine owns rule evaluation and produces visible/disabled state.

**Evidence**
- Engine eval plan outside Redux + incremental evaluation:
  - packages/engine/src/plan.ts
  - packages/engine/src/createFormEngine.ts
  - packages/engine/src/engine_incremental_eval.test.ts
- Renderer reads selectors only:
  - packages/renderer/src/NodeRenderer.tsx
- Renderer tests for visibility changes triggered via engine state:
  - packages/renderer/src/renderer_visibility.test.tsx

---

### A5. Redux state is serializable
- Evaluation plan/indices are not stored inside Redux state.
- Redux stores values/errors/ui booleans; plan is external (closure/middleware).

**Evidence**
- Engine plan and listener middleware:
  - packages/engine/src/plan.ts
  - packages/engine/src/createFormEngine.ts

---

### A6. Performance: no full-form rerender storms on field edits
- Field widgets should not rerender when unrelated fields change (best-effort).
- Rule evaluation should re-run only impacted expressions.

**Evidence**
- Incremental expression recompute test:
  - packages/engine/src/engine_incremental_eval.test.ts
- Rerender isolation test:
  - packages/renderer/src/renderer_rerender_budget.test.tsx

---

### A7. Runtime must not invent UI text
- Runtime mode must not humanize node IDs into labels.
- Design mode may show fallback labels for authoring convenience.

**Evidence**
- Label behavior tests:
  - packages/renderer/src/renderer_label_no_invention.test.tsx
- Label resolution logic:
  - packages/renderer/src/NodeRenderer.tsx

---

## B. Operational checks (run before merging)

Run:
- `npm test` (or `pnpm test`)
- Manual smoke:
  - `cd apps/shell && npm run dev`
  - Type in TextInput → value updates
  - Toggle field that affects visibility → UI updates

Optional (recommended):
- Render big form:
  - Ensure shell can load samples/form_big.json without lag spikes