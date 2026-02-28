# Requirements Traceability (v0)

This matrix maps the SRS requirements to concrete evidence: samples + tests + modules.

Legend:
- SRS = docs/01_SRS.md
- Evidence = tests/samples/code paths

---

## FR Traceability (Phase 1)

### FR-02 Canvas Rendering Parity (Studio uses runtime renderer)
- Evidence:
  - docs/03_ADR_001_RendererParity.md
  - packages/renderer supports mode="design" with data-nodeid/data-nodetype

Status: PARTIAL (renderer supports design mode; Studio app not built yet)

---

### FR-14 JSON AST Expressions Only (no JS strings)
- Evidence:
  - packages/schema Expression AST allowlist
  - packages/expr evaluator + deps extraction + integration test walking samples

Status: DONE

---

### FR-15 Dependency Tracking for incremental evaluation
- Evidence:
  - packages/expr/src/deps.ts
  - packages/engine/src/plan.ts
  - engine_incremental_eval.test.ts proves only impacted expressions re-run

Status: DONE

---

### FR-19 Rules (visibility/disabled/requiredIf/computed/defaultValue)
- Evidence:
  - samples/form_rules.json exercises visibility + requiredIf + includeIf mapping
  - renderer_visibility.test.tsx
  - engine_validation.test.ts

Status: DONE for visibility + requiredIf (computed/defaultValue later)

---

### FR-21 Submission Mapping (persisted/writeOnly/transient + includeIf)
- Evidence:
  - packages/engine buildSubmitRequest()
  - engine_submit_mapping.test.ts
  - samples/form_rules.json mapping section

Status: DONE (basic)

---

### FR-24 Preview uses runtime renderer+engine
- Evidence:
  - apps/shell loads and renders sample using validateFormDoc + createFormEngine + PageRenderer

Status: DONE (runtime preview via shell)

---

### AI Authoring (FR-32..FR-35)
- Evidence:
  - Not implemented yet.

Status: NOT STARTED

---

## NFR Traceability

### NFR-01 Performance (50–300 fields, no rerender storms)
- Evidence:
  - renderer_rerender_budget.test.tsx (unrelated fields should not rerender)
  - engine_incremental_eval.test.ts (rules recompute only impacted exprs)
  - samples/form_big.json (currently 100 fields; target should be 300 soon)

Status: PARTIAL (guardrails exist; bump big sample to 300)

---

### NFR-03 Security/Governance (no tenant JS/CSS)
- Evidence:
  - JSON AST only
  - no string execution in expr
  - allowlisted widgets/props pattern in widgets-core (ongoing)

Status: PARTIAL (JS side is governed; CSS tokens enforcement is future tightening)

---

## Upcoming milestones
1) Studio v0: selection + outline + inspector + undo/redo (renderer parity proven)
2) Async validation (debounce/cancel)
3) Options/lookup bindings + data.query action
4) Draft autosave policy (good-to-have)
5) AI patch-plan integration with diff/approval/audit