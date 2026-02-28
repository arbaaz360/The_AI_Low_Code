# Contracts (v0)

## 1) Metadata Contract
### PageDocBase
- schemaVersion: string
- pageFamily: "Form" | "Workbench" | "Dashboard"
- rootNodeId: string
- nodes: Record<nodeId, Node>
- rules?: Rule[]
- actions?: ActionDef[]
- resources?: Resources
- permissions?: Permissions

### FormDoc additions
- dataContext: { entity: string; mode: "create"|"edit"|"view"; recordId?: Binding; loadOperation?: OpRef }
- submission: { submitOperation: OpRef; mapping: SubmissionMapping[]; draftPolicy?: DraftPolicy }

### Node
- id, type
- props (allowlisted, typed)
- children (for containers)
- layout (container-specific)
- bindings (value/label/help/options/visible/disabled/computed)
- validation (validators + async validators)
- events (event -> action sequence)
- styleTokens (tokens only)

## 2) Expression Contract (JSON AST)
- No JS strings.
- AST nodes:
  - { op: "lit", value: any }
  - { op: "ref", path: string }
  - boolean/compare ops: eq, neq, gt, gte, lt, lte
  - logical ops: and, or, not
  - control ops: if, coalesce
- Allowlisted functions (start small, expand with registry):
  - str.len, str.contains, ...
  - num.round, num.min, num.max, ...
  - date.addDays, date.diffDays, ...

Dependency Extraction:
- Walk AST and collect all ref.path occurrences.
- Used to build path->expr subscriptions for incremental evaluation.

## 3) Editor Command Contract (Design-time)
All edits are commands producing patches + inverse patches.
- AddNode, RemoveNode, MoveNode
- UpdateProps, UpdateLayout
- BindValue/Options/Visibility/Disabled/Computed
- AddValidator/UpdateValidator/RemoveValidator
- AddRule/UpdateRule/RemoveRule
- UpdateSubmissionMapping
- Batch([...])

Invariants always enforced:
- no orphan nodes; no cycles
- container constraints satisfied
- layout spans valid
- binding paths valid
- expression ops/functions allowlisted

## 4) Action Contract (Runtime)
Allowlisted action types (v1):
- form.submit, form.reset
- data.query(opRef, params), data.mutate(opRef, body)
- ui.toast, ui.openDialog
- navigate.to
- state.set (restricted namespace)
Actions are permission checked, observable, cancellable where relevant.

## 5) Schema Validation Contract
- JSON Schema is authoritative for persisted docs.
- Validation implemented with AJV v8.
- Samples in /samples must validate; tests fail otherwise.