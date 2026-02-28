# AI Powered Low-Code Platform — Project Brief (v0)

## Goal
Build an enterprise-grade, multi-tenant low-code platform where:
- The runtime is a compiled React shell served via CDN.
- Tenant apps are metadata (JSON) — NOT compiled code.
- Publishing updates metadata instantly without redeploying the shell.
- Page families: Forms (first), Workbenches (later), Dashboards (later).
- Governance-first: tenants cannot inject arbitrary JS/CSS.

## Non-Negotiables
1. Runtime rendering is interpretation (metadata -> React), not codegen.
2. Studio Canvas must use the SAME runtime renderer in "design mode" (overlays only).
3. No arbitrary tenant JS execution. No raw CSS strings from tenants by default.
4. Styling via tokens + variants only.
5. Metadata schema is versioned and migratable (schemaVersion + migrations).
6. Backward compatibility: runtime must support older published metadata.
7. External-tenant licensing caution: premium UI components (grids/charts/pickers) must be pluggable behind our interfaces.

## Primary Vertical Slice (Phase 1)
Forms Designer end-to-end:
Design-time (Studio) -> Validate -> Publish -> Store versioned metadata -> Runtime fetch -> Render -> Bind state/data/actions -> Observability/audit -> Governance enforcement.

## Key Technical Choices (initial)
- Monorepo: Nx
- State (runtime/studio): RTK (Redux Toolkit)
- Schema validation: JSON Schema + AJV v8
- Expressions: Governed JSON AST (no JS strings)
- UI baseline widgets: MUI Core (safe baseline)
- “Enterprise widgets” (grid/chart) behind our own interfaces

## Definition of Done (for any feature)
- Schema validation passes for samples.
- Unit tests cover engine/expression behavior.
- No illegal states can be published.
- Runtime rendering parity: Studio preview matches runtime layout.
- Perf guardrails: field edit does not trigger full-form rerender.
- Observability: meaningful telemetry/audit events for publish + runtime actions.

## Repo Module Boundaries (high level)
- packages/schema: JSON Schemas + TS types + migrations
- packages/expr: JSON AST types + evaluator + dependency extractor + type checker
- packages/engine: form engine (RTK store, rules, validation, mapping)
- packages/renderer: renderer + layout containers + design-mode hooks
- packages/actions: action catalog + runner
- packages/widgets-core: governed MUI wrappers + property schemas
- apps/studio: form designer UI
- apps/shell: runtime host application

## Immediate Deliverables
1) FormDoc JSON schema v1 + validator + sample docs
2) Expression JSON AST spec v1 + deps extraction + evaluator + tests
3) Form engine v1 (RTK) with field-level selectors + incremental rule eval + tests
4) Renderer v1 (FormGrid + Section + 3 widgets) + golden render tests