# SRS — Domain-Model–Driven Forms Designer (v0)

## 1. Purpose
Provide an enterprise-grade Forms Designer (Studio) that outputs versioned metadata JSON to be rendered by a precompiled React runtime shell. Must be governance-first, stable, performant, and extensible. Must support AI-assisted authoring via grounded patch plans.

## 2. Scope
### In Scope (Phase 1)
- Studio: palette/tree/canvas/inspector/diagnostics
- Domain model integration (entities/fields/constraints/operations)
- Metadata schema (JSON) + validation + migrations
- Runtime renderer + form engine (bindings/rules/validation/actions/mapping)
- Publish/version pointer updates
- AI: patch-plan generation + diff + approval + audit log

### Out of Scope (initial)
- Tenant-provided custom JS/CSS execution
- Real-time collaborative editing
- Offline runtime app

## 3. Users
- App Author (primary)
- Power Author
- Platform Admin
- Reviewer/Approver
- Runtime End-user

## 4. Functional Requirements
### 4.1 Studio UI
FR-01 Designer workspace provides palette, tree, canvas, inspector, diagnostics, AI panel.
FR-02 Canvas uses runtime renderer in design mode; overlays do not change layout DOM.
FR-03 Drag/drop with container constraints and drop previews matching runtime.
FR-04 Deterministic layout primitives for Forms: FormGrid(12-col), Section, Stack, Tabs, Accordion, RepeatableGroup.
FR-05 Multi-select + bulk operations.
FR-06 Undo/Redo for all edits.

### 4.2 Domain Model Integration
FR-07 Browse entities/fields with types/constraints and flags (PII, readOnly/writeOnly/computed).
FR-08 Add domain fields to form auto-creates widgets + bindings + validators + default layout.
FR-09 Operation references for load/submit/lookup are from generated API contracts.

### 4.3 Widget System
FR-10 Widget catalog with stable type IDs (core.TextInput etc).
FR-11 Typed allowlisted props; invalid props blocked with diagnostics.
FR-12 Property editor panels generated from widget property schemas.

### 4.4 Bindings & Expressions
FR-13 Bindings support value, label/help, options, visible/disabled, computed.
FR-14 Expressions are JSON AST only; allowlisted ops/functions.
FR-15 Dependency extraction from AST; incremental evaluation based on dependency graph.
FR-16 Studio type checks expressions where possible; emits diagnostics.

### 4.5 Rules & Validation
FR-17 Rule types: visibility, disabled, conditional required, computed/derived, default values.
FR-18 Validation supports field + cross-field + async server validation (debounce/cancel).
FR-19 Server errors map back to field paths.

### 4.6 Submission Mapping
FR-20 Storage policies: persisted, writeOnly, readOnly, transient, derived.
FR-21 Mapping from form.values.* -> operation.request.* with optional transform and conditional include (JSON AST).

### 4.7 Actions (no arbitrary JS)
FR-22 Action runner executes allowlisted actions with permissions + telemetry.
FR-23 Events wire to action sequences.

### 4.8 Preview/Publish/Versioning
FR-24 Preview runs runtime renderer+engine with mock or real APIs.
FR-25 Publish validates schema/governance, runs migrations, creates immutable version, updates current pointer.
FR-26 Supports rollback by moving pointer.

### 4.9 AI Authoring
FR-27 AI grounded on widget catalog + domain model + operations + governance.
FR-28 AI outputs patch plans (editor commands), never raw publish.
FR-29 Show diff + diagnostics; user approves apply/publish.
FR-30 Audit logs store prompt + context versions + applied patch IDs + approver.

## 5. Non-Functional Requirements
NFR-01 Performance: responsive for 50–300 fields; typing does not rerender entire form.
NFR-02 Stability: illegal states prevented at edit/publish time.
NFR-03 Security: no tenant JS; no raw CSS; strict allowlists.
NFR-04 Maintainability: modular packages, migrations, tests.
NFR-05 Observability: audit logs + runtime telemetry.

## 6. Acceptance Criteria (Phase 1)
- Build and publish a form with sections/grid layout, bindings, visibility rule, requiredIf, async validator, submission mapping including transient/writeOnly.
- Studio preview matches runtime layout.
- New publish updates runtime without redeploying shell.
- AI generates a basic form from a prompt using patch plans with diff approval.