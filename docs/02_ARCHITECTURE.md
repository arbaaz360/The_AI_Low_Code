# Architecture Blueprint (v0)

## 1. Canonical Loop
Design-time (Studio) -> Validate -> Publish -> Store versioned metadata -> Runtime fetch -> Render via registry -> Bind state/data/actions -> Observability & audit -> Governance enforcement.

## 2. High-level Components
### Studio (Design-time)
- Designer UI: palette/tree/canvas/inspector/diagnostics
- Command system: validated edits + undo/redo + patches
- AI assistant: grounded patch-plan generator
- Preview: uses runtime renderer + engine in design mode

### Backend Services
- Domain Model Service: entities/fields/constraints/flags + operations schemas
- API Generator: produces OpenAPI + typed contracts + server validators
- Metadata Service: drafts/validate/publish/versions/current pointer
- Audit Log Service: append-only publish/AI logs

### Runtime Shell (Compiled React)
- Metadata fetcher: caching, ETag, local fallback
- Renderer: node graph -> React elements
- Registries: widget registry + expression funcs + actions
- Form Engine: RTK store + bindings + rules + validation + mapping
- Action runner: typed actions with permission checks
- Telemetry client: perf/action metrics

## 3. Module Boundaries (Nx)
- packages/schema
- packages/expr
- packages/engine
- packages/renderer
- packages/actions
- packages/widgets-core
- apps/studio
- apps/shell

## 4. Key Runtime Flow
1) Fetch metadata version pointer and blob (ETag)
2) Validate (optional runtime guard) + migrate (if supported client-side)
3) Build eval plan: AST deps index, validator plan, mapping plan
4) Render via registry
5) Field updates: RTK store update -> evaluate dependent expressions -> validate -> update selectors
6) Submit: mapping -> action runner -> operation call -> map errors back

## 5. Performance Design
- Normalized state (RTK entity adapters)
- Field-level selector factories to avoid whole-form rerenders
- Incremental expression evaluation using dependency graph
- Lazy section rendering (collapsed/offscreen)
- Debounce + cancel for async validation and lookups
- Virtualization for repeatable groups and huge option lists

## 6. Extensibility Strategy
- Stable widget IDs decouple metadata from implementation
- Plugin points: widgets, validators, actions, expression functions, containers, datasources
- Page families differ primarily by layout/container set: Forms now; Workbench/Dashboard later.