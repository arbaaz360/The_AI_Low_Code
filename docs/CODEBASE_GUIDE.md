# The AI Low-Code Platform — Codebase Guide

This document is a comprehensive, beginner-friendly walkthrough of the entire codebase. If you know basic React and TypeScript, you can use this guide to understand every part of the system, navigate the code, and reason about how data flows from design-time to runtime.

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [The Big Picture — How Everything Fits Together](#2-the-big-picture)
3. [Project Structure](#3-project-structure)
4. [Core Concepts You Need to Know](#4-core-concepts)
5. [Package-by-Package Deep Dive](#5-package-by-package-deep-dive)
   - 5.1 [packages/expr — The Expression Engine](#51-packagesexpr)
   - 5.2 [packages/schema — The Contract](#52-packagesschema)
   - 5.3 [packages/engine — The Brain](#53-packagesengine)
   - 5.4 [packages/actions — The Behavior Layer](#54-packagesactions)
   - 5.5 [packages/datasources — The Data Layer](#55-packagesdatasources)
   - 5.6 [packages/renderer — The UI Renderer](#56-packagesrenderer)
   - 5.7 [packages/widgets-core — The Widget Library](#57-packageswidgets-core)
   - 5.8 [packages/studio-core — Studio Logic](#58-packagesstudio-core)
   - 5.9 [packages/theme — Shared Styling](#59-packagestheme)
6. [The Apps](#6-the-apps)
   - 6.1 [apps/studio — The Form Designer](#61-appsstudio)
   - 6.2 [apps/shell — The Runtime Host](#62-appsshell)
7. [Data Flow — End to End](#7-data-flow)
8. [The FormDoc — Understanding the JSON](#8-the-formdoc)
9. [How Actions Work](#9-how-actions-work)
10. [How DataSources Work](#10-how-datasources-work)
11. [How the Studio Editor Works](#11-how-the-studio-editor-works)
12. [How to Run the Project](#12-how-to-run-the-project)
13. [How to Add a New Widget](#13-how-to-add-a-new-widget)
14. [How to Add a New Action Type](#14-how-to-add-a-new-action-type)
15. [Testing Strategy](#15-testing-strategy)
16. [Glossary](#16-glossary)

---

## 1. What This Project Is

This is a **low-code form builder platform**. Think of it like building a Google Form, but for enterprise applications — with conditional logic, data lookups, governed actions, and a polished runtime.

The platform has two sides:

- **Studio** — A visual designer where you drag-and-drop widgets to build forms. The output is a JSON document (called a `FormDoc`).
- **Shell** — A runtime application that takes that JSON document and renders a fully interactive form.

**The key insight**: Forms are never compiled into code. They are pure JSON metadata that gets *interpreted* at runtime. This means you can change a form instantly by changing the JSON — no redeployment needed.

---

## 2. The Big Picture

Here is how the system works at a high level:

```
┌─────────────────────────────────────────────────────────────┐
│                         STUDIO                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Outline  │  │  Canvas  │  │ Inspector │  │DataSources│  │
│  │  (tree)   │  │ (preview)│  │ (edit)    │  │  (data)   │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│         │            │              │              │         │
│         └────────────┴──────────────┴──────────────┘         │
│                            │                                 │
│                    Produces a FormDoc                         │
│                      (JSON file)                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    FormDoc.json  │  ← Pure data, no code
                    │  (the metadata) │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                          SHELL                              │
│                                                             │
│   FormDoc ──► Engine ──► Renderer ──► Widgets ──► Screen    │
│                  │                       ▲                   │
│                  │                       │                   │
│            Redux Store           ActionRunner                │
│         (values, rules,      (onChange, onClick,             │
│          visibility)         CallDataSource, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

**Important rule**: The Studio Canvas uses the *exact same renderer* as the Shell. In Studio, it runs in "design mode" (with selection overlays). In Shell, it runs in "runtime mode" (fully interactive). This is called **renderer parity**.

---

## 3. Project Structure

```
The_AI_Low_Code_Platform/
├── packages/               ← Shared libraries (the core platform)
│   ├── expr/               ← Expression AST + evaluator
│   ├── schema/             ← JSON Schema + validator for FormDoc
│   ├── engine/             ← Redux store, rules, validation
│   ├── actions/            ← Declarative action types + runner
│   ├── datasources/        ← DataSource registry + client
│   ├── renderer/           ← PageRenderer + NodeRenderer
│   ├── widgets-core/       ← MUI widget components
│   ├── studio-core/        ← Command pattern for editing FormDocs
│   └── theme/              ← Shared MUI theme
├── apps/                   ← Applications
│   ├── studio/             ← Form designer (Vite + React)
│   └── shell/              ← Runtime host (Vite + React)
├── samples/                ← Example FormDoc JSON files
│   ├── form_rules.json     ← Conditional form (show/hide fields)
│   ├── form_basic.json     ← Simple form with 20 fields
│   ├── form_lookup.json    ← Dynamic options from DataSources
│   ├── form_big.json       ← Large stress-test form
│   └── domain_model_vendor.json  ← Domain model for scaffolding
├── docs/                   ← Documentation
├── package.json            ← Root monorepo config (npm workspaces)
└── tsconfig.base.json      ← Shared TypeScript config
```

This is a **monorepo** — all packages live in one repository and share dependencies. The `packages/*` folders are libraries. The `apps/*` folders are runnable applications.

### Dependency Flow

Packages depend on each other in a clear hierarchy:

```
expr  (no dependencies — leaf package)
  ↑
engine  (depends on: expr)
  ↑
actions  (depends on: expr)
  ↑
datasources  (no dependencies — leaf package)
  ↑
schema  (depends on: ajv — external only)
  ↑
renderer  (depends on: engine, actions)
  ↑
widgets-core  (depends on: renderer, studio-core)
  ↑
studio-core  (depends on: engine)
  ↑
theme  (depends on: MUI — external only)

Studio app  (depends on: everything above)
Shell app   (depends on: everything except studio-core)
```

---

## 4. Core Concepts

Before diving into the code, understand these concepts:

### FormDoc
A JSON document that fully describes a form — its structure (which widgets, in what order), behavior (what happens when you click a button), appearance (labels, placeholders), validation rules, and data bindings. This is the "metadata" that the runtime interprets.

### Node
Every element in a form is a "node" — a section container, a text input, a button, etc. Each node has an `id`, a `type` (like `core.TextInput`), optional `props`, `bindings`, `events`, and `children`.

### Widget
A React component that renders a node. For example, `core.TextInput` renders as an MUI `<TextField>`. Widgets are registered in a `WidgetRegistry` — a simple object mapping type strings to React components.

### Binding
A link between a widget and a piece of data. For example, `bindings.value: "form.values.email"` means "this widget's value comes from the `email` field in the form state."

### Expression (Expr)
A safe, JSON-based mini-language for computing values. Instead of writing `if (accountType === "company") { ... }` in JavaScript, you write:
```json
{ "op": "eq", "left": { "op": "ref", "path": "form.values.accountType" }, "right": { "op": "lit", "value": "company" } }
```
This is **governance-first** — no arbitrary JavaScript execution allowed.

### Action
A declarative instruction for what should happen when an event fires. Instead of writing `onClick={() => { showToast("Saved!"); navigate("/home"); }}`, you write:
```json
[
  { "type": "Toast", "message": "Saved!", "severity": "success" },
  { "type": "Navigate", "to": "/home" }
]
```

### Engine
The Redux store that manages form state — current values, which fields are visible/disabled, validation errors, and loaded data.

### Renderer
Takes a FormDoc + Engine + WidgetRegistry and renders the form to screen. It walks the node tree, resolves bindings, wires events, and instantiates the correct widget for each node.

---

## 5. Package-by-Package Deep Dive

### 5.1 `packages/expr`

**Purpose**: A safe expression language that evaluates JSON ASTs.

**Why it exists**: We need conditional logic (show this field if X is true, compute Y from Z) but we can't allow arbitrary JavaScript — that would be a security risk in a multi-tenant system. Instead, expressions are a governed JSON structure.

**Key files**:

| File | What it does |
|------|-------------|
| `src/ast.ts` | Defines the `Expr` type — all the expression operations |
| `src/eval.ts` | `evalAst(expr, context)` — evaluates an expression tree |
| `src/deps.ts` | `collectDeps(expr)` — finds which paths an expression reads |
| `src/typecheck.ts` | `typeCheckAst(expr)` — validates expression correctness |

**Available operations**:

| Op | Example | What it does |
|----|---------|-------------|
| `lit` | `{ op: "lit", value: 42 }` | A literal value (number, string, boolean) |
| `ref` | `{ op: "ref", path: "form.values.age" }` | Read a value from the form state |
| `eq` | `{ op: "eq", left: ..., right: ... }` | Are two values equal? |
| `neq` | `{ op: "neq", left: ..., right: ... }` | Are two values NOT equal? |
| `gt/gte/lt/lte` | `{ op: "gt", left: ..., right: ... }` | Comparisons |
| `and` | `{ op: "and", args: [...] }` | All conditions true? |
| `or` | `{ op: "or", args: [...] }` | Any condition true? |
| `not` | `{ op: "not", args: [expr] }` | Negate a boolean |
| `if` | `{ op: "if", left: cond, then: a, else: b }` | If-then-else |
| `coalesce` | `{ op: "coalesce", args: [...] }` | First non-null value |

**How `evalAst` works**: It takes an expression and a context object. The context has a `get(path)` function that reads values. The evaluator walks the expression tree recursively:

```typescript
// Simplified version of what happens inside evalAst:
function evalAst(expr, ctx) {
  switch (expr.op) {
    case "lit": return expr.value;           // just return the literal
    case "ref": return ctx.get(expr.path);   // look up a value
    case "eq":  return evalAst(expr.left, ctx) == evalAst(expr.right, ctx);
    // ... and so on
  }
}
```

---

### 5.2 `packages/schema`

**Purpose**: Defines the contract for what a valid `FormDoc` looks like, and validates documents against it.

**Key files**:

| File | What it does |
|------|-------------|
| `src/formdoc.schema.json` | The JSON Schema definition — the "rulebook" for FormDocs |
| `src/validate.ts` | `validateFormDoc(doc)` — checks if a document is valid |

**How validation works**: Uses the [AJV](https://ajv.js.org/) library (a JSON Schema validator). You pass in any object, and it tells you whether it's a valid FormDoc and exactly what's wrong if it isn't:

```typescript
const result = validateFormDoc(myDoc);
if (result.ok) {
  // Document is valid, safe to use
} else {
  // result.errors is an array of { path, message }
  console.log(result.errors);
  // e.g. [{ path: "/nodes/t1/type", message: "must be string" }]
}
```

**What the schema validates**: That required fields exist, types are correct, nodes have valid event structures, expressions follow the right format, data source definitions are well-formed, etc.

---

### 5.3 `packages/engine`

**Purpose**: The "brain" of the form — a Redux store that manages all runtime state.

**Key files**:

| File | What it does |
|------|-------------|
| `src/types.ts` | TypeScript types for `FormDoc`, `FormNode`, `FormRule` |
| `src/slice.ts` | The Redux slice — state shape and reducers |
| `src/createFormEngine.ts` | Factory that creates a fully configured engine |
| `src/path.ts` | Utilities for reading/writing nested objects by path |
| `src/extract.ts` | Extracts all `bindings.value` paths from a FormDoc |
| `src/plan.ts` | Builds an evaluation plan for conditional rules |

**The state shape** (what the Redux store holds):

```typescript
{
  engine: {
    formDoc: FormDoc | null,        // the loaded form definition
    values: {                        // current field values
      form: {
        values: { name: "Alice", age: 30, ... }
      }
    },
    touchedByPath: { "name": true }, // which fields the user has touched
    dirtyByPath: { "name": true },   // which fields have changed
    errorsByPath: { "name": ["Required"] }, // validation errors per field
    ui: {
      visibleByNodeId: { "companyName": false }, // hide/show per node
      disabledByNodeId: { "submit": true },      // enable/disable per node
    },
    data: {
      byKey: {                       // loaded data from DataSources
        "countries": [{ value: "US", label: "United States" }, ...]
      },
      requests: {                    // request tracking
        "req_countries": { status: "success", ... }
      }
    }
  }
}
```

**Creating an engine**:

```typescript
import { createFormEngine } from "@ai-low-code/engine";

const engine = createFormEngine(formDoc, {
  env: { region: "IN" },
  initialValues: { form: { values: { name: "default" } } }
});

// Now you can:
engine.store.dispatch(engine.actions.setValue({ path: "name", value: "Bob" }));
engine.validateAll();
const submitData = engine.buildSubmitRequest();
```

**What `createFormEngine` returns**:

| Property | What it is |
|----------|-----------|
| `store` | The Redux store |
| `actions` | All Redux action creators (setValue, setErrors, dataRequestStarted, etc.) |
| `selectors` | Selector factories to read specific pieces of state |
| `validateAll()` | Runs all validators and updates `errorsByPath` |
| `buildSubmitRequest()` | Builds the submit payload from `submission.mapping` |

**How rules work**: When you dispatch `setValue`, middleware automatically re-evaluates all visibility and disabled expressions. For example, if you have a rule "show companyName when accountType is 'company'", changing `accountType` immediately recalculates `visibleByNodeId["companyName"]`.

---

### 5.4 `packages/actions`

**Purpose**: A declarative, allowlisted set of things that can happen when a user interacts with a form.

**Key files**:

| File | What it does |
|------|-------------|
| `src/types.ts` | All action type definitions |
| `src/runner.ts` | `createActionRunner(deps)` — executes actions |

**Available action types**:

| Type | What it does | Example |
|------|-------------|---------|
| `SetValue` | Set a form field value | `{ type: "SetValue", path: "form.values.name", value: { $event: "value" } }` |
| `ValidateForm` | Run all validators | `{ type: "ValidateForm" }` |
| `Toast` | Show a notification | `{ type: "Toast", message: "Saved!", severity: "success" }` |
| `Navigate` | Go to a URL/route | `{ type: "Navigate", to: "/dashboard" }` |
| `Batch` | Run multiple actions | `{ type: "Batch", actions: [...] }` |
| `If` | Conditional actions | `{ type: "If", condition: expr, then: [...], else: [...] }` |
| `CallDataSource` | Fetch data from a source | `{ type: "CallDataSource", dataSourceId: "ds1", resultKey: "countries" }` |
| `SetData` | Store data by key | `{ type: "SetData", key: "myList", value: expr }` |

**The `$event` reference**: When a user types into a text field, the new value is in the "event payload". `{ $event: "value" }` means "use whatever the user just typed". For checkboxes/switches, `{ $event: "checked" }` gives you true/false.

**How the runner works**:

```typescript
const runner = createActionRunner({
  dispatch: (action) => store.dispatch(action),
  getState: () => store.getState(),
  setValueActionCreator: (p) => setValue(p),
  dataSourceClient: myClient,         // for CallDataSource
  dataRequestStartedCreator: ...,     // Redux actions for tracking
  evalExpr: (ast, ctx) => evalAst(ast, ctx),
  navigate: (to) => window.location.href = to,
  toast: (opts) => showNotification(opts),
});

// Then when a button is clicked:
await runner.run(
  [{ type: "Toast", message: "Hello!" }],
  { nodeId: "btn1", nodeType: "core.Button", eventPayload: {}, mode: "runtime" }
);
```

**Safety rules**:
- `SetValue` only allows paths starting with `form.values.` or `ui.` — you can't write to random places.
- In **design mode**, side-effect actions (`Toast`, `Navigate`, `ValidateForm`, `CallDataSource`) are silently skipped. This prevents the Studio preview from accidentally navigating away or firing real requests.

---

### 5.5 `packages/datasources`

**Purpose**: Fetching data for dynamic options (like populating a Country dropdown from an API).

**Key files**:

| File | What it does |
|------|-------------|
| `src/types.ts` | `DataSourceDef` types (mock and REST) |
| `src/registry.ts` | `createDataSourceRegistry(defs)` — lookup by ID |
| `src/client.ts` | `createDataSourceClient(deps)` — executes data fetches |

**DataSource kinds**:

| Kind | Purpose | Example |
|------|---------|---------|
| `mock` | Returns pre-defined data (with optional delay and failure simulation) | `{ id: "ds1", kind: "mock", response: [...], delayMs: 300, failRate: 0 }` |
| `rest` | Calls a real HTTP endpoint | `{ id: "api1", kind: "rest", method: "GET", url: "https://api.example.com/countries" }` |

**How mock datasources work**: They deep-clone the `response` field after an optional delay. If `failRate` is set (0 to 1), there's a random chance of failure — useful for testing error handling.

**How it connects to actions**: The `CallDataSource` action uses the data source client:
1. Looks up the datasource by ID in the registry
2. Calls `client.execute()`
3. Stores the result in `engine.data.byKey[resultKey]`
4. Widgets bound to `data.byKey.resultKey` automatically re-render with the new data

---

### 5.6 `packages/renderer`

**Purpose**: Takes a FormDoc + Engine + WidgetRegistry and renders the form to screen.

**Key files**:

| File | What it does |
|------|-------------|
| `src/PageRenderer.tsx` | Top-level component — wraps everything in Redux Provider |
| `src/NodeRenderer.tsx` | Renders a single node (recursive for children) |
| `src/ActionRunnerContext.ts` | React Context to share the ActionRunner |
| `src/types.ts` | `WidgetProps` and `RendererProps` interfaces |

**PageRenderer** does three things:
1. Wraps the tree in a Redux `<Provider>` so widgets can read state
2. Renders a `PageOnLoad` helper that runs `pageEvents.onLoad` actions once on mount (runtime mode only)
3. Renders the root `NodeRenderer`

**NodeRenderer** is where the magic happens. For each node, it:

1. **Reads the node** from the FormDoc: `doc.nodes[nodeId]`
2. **Resolves bindings**: If `bindings.value = "form.values.email"`, it creates a Redux selector to read that value
3. **Resolves options**: If `bindings.options = "data.byKey.countries"`, it creates a selector that reads from the data store
4. **Checks visibility**: Uses `makeSelectNodeVisible(nodeId)` — if invisible, renders nothing
5. **Wires event handlers**:
   - If the node has explicit `events.onChange` and there's an `ActionRunner`, the handler runs those actions
   - Otherwise, it falls back to dispatching `setValue` directly (backward compatibility)
6. **Looks up the widget** in the registry: `registry["core.TextInput"]` → the TextInput React component
7. **Renders the widget** with all resolved props

```
NodeRenderer("root")
  ├── Widget: Section
  │   └── NodeRenderer("grid1")
  │       ├── Widget: FormGrid
  │       │   ├── NodeRenderer("name_field")  → Widget: TextInput
  │       │   ├── NodeRenderer("country_field") → Widget: Select
  │       │   └── NodeRenderer("submit_btn")  → Widget: Button
```

**The WidgetProps interface** — what every widget receives:

```typescript
interface WidgetProps {
  nodeId: string;              // e.g. "name_field"
  nodeType: string;            // e.g. "core.TextInput"
  props?: Record<string, unknown>;  // e.g. { label: "Name", placeholder: "..." }
  layout?: Record<string, unknown>; // e.g. { span: { xs: 12, md: 6 } }
  value?: unknown;             // the current value from the engine
  onChange?: (value) => void;  // call this when the user changes the value
  onClick?: () => void;        // call this when the user clicks
  onBlur?: () => void;         // call this when the field loses focus
  disabled?: boolean;          // from engine rules
  error?: string[];            // validation errors
  label?: string;              // resolved label
  options?: unknown;           // for Select/RadioGroup
  mode?: "runtime" | "design"; // current rendering mode
  children?: ReactNode;        // for container widgets (Section, FormGrid)
}
```

---

### 5.7 `packages/widgets-core`

**Purpose**: The actual UI components — MUI-based widgets that render form fields.

**Key files**:

| File | What it does |
|------|-------------|
| `src/index.ts` | The `defaultRegistry` — maps type IDs to components |
| `src/TextInput.tsx` | Text field widget |
| `src/TextArea.tsx` | Multi-line text widget |
| `src/NumberInput.tsx` | Number field widget |
| `src/DateInput.tsx` | Date picker widget |
| `src/Select.tsx` | Dropdown select widget |
| `src/Checkbox.tsx` | Checkbox widget |
| `src/Switch.tsx` | Toggle switch widget |
| `src/RadioGroup.tsx` | Radio button group widget |
| `src/Button.tsx` | Clickable button widget |
| `src/FormGrid.tsx` | Grid layout container (12-column) |
| `src/Section.tsx` | Section container with title |
| `src/Stack.tsx` | Flex layout container |
| `src/propertySchemas.ts` | Defines editable properties per widget type |
| `src/fieldMapping.ts` | Maps domain field types to widget types |

**The Widget Registry**:

```typescript
const defaultRegistry = {
  "layout.FormGrid": FormGrid,
  "layout.Section": Section,
  "layout.Stack": Stack,
  "core.TextInput": TextInput,
  "core.TextArea": TextArea,
  "core.NumberInput": NumberInput,
  "core.DateInput": DateInput,
  "core.Select": Select,
  "core.Checkbox": Checkbox,
  "core.Switch": Switch,
  "core.RadioGroup": RadioGroup,
  "core.Button": Button,
  // Legacy aliases for backward compatibility:
  "FormGrid": FormGrid,
  "Section": Section,
  "Stack": Stack,
};
```

**Naming convention**: Containers use `layout.*`, inputs use `core.*`.

**Every widget**:
- Receives `WidgetProps` from the renderer
- Renders an MUI component
- Passes `data-nodeid` and `data-nodetype` attributes in design mode (so the Studio canvas can detect clicks)
- Handles `undefined` values safely (never crashes on missing data)

**Property schemas** (`propertySchemas.ts`): For each widget type, defines what properties the Studio Inspector should show. Example:

```typescript
// For core.TextInput:
{
  type: "core.TextInput",
  fields: [
    { key: "label", label: "Label", type: "string" },
    { key: "placeholder", label: "Placeholder", type: "string" },
  ]
}
```

**Field mapping** (`fieldMapping.ts`): When scaffolding a form from a domain model, this decides which widget to use:
- `boolean` → `core.Switch`
- `date` → `core.DateInput`
- `number` / `integer` → `core.NumberInput`
- `string` with `maxLength > 200` → `core.TextArea`
- `string` (default) → `core.TextInput`
- Fields with `options` → `core.Select`

---

### 5.8 `packages/studio-core`

**Purpose**: The logic layer for the Studio editor — applying edits to FormDocs safely.

**Key files**:

| File | What it does |
|------|-------------|
| `src/types.ts` | The `Command` type union |
| `src/commands.ts` | `applyCommand(doc, command)` — applies an edit immutably |
| `src/constraints.ts` | Rules about what can go where |
| `src/invariants.ts` | Validates the entire document tree is consistent |
| `src/layoutValidation.ts` | Grid span clamping (1-12) |
| `src/dropResolution.ts` | Resolves drag-and-drop targets |

**The command pattern**: Every edit to a FormDoc goes through `applyCommand`. It takes the current doc and a command, and returns a new doc (the old one is never mutated). This makes undo/redo trivial.

**Available commands**:

| Command | What it does |
|---------|-------------|
| `UpdateProps` | Change widget properties (label, placeholder, etc.) |
| `UpdateLayout` | Change grid span (column width) |
| `UpdateBindings` | Change data bindings (which field a widget reads/writes) |
| `UpdateEvents` | Change event handlers (onChange, onClick actions) |
| `AddNode` | Add a new widget to the form |
| `RemoveNode` | Delete a widget (and optionally its subtree) |
| `MoveNode` | Move a widget to a different position |
| `SetDataSources` | Replace the form's datasource definitions |
| `SetPageEvents` | Replace the form's page-level events (onLoad) |

**Constraints**: The system enforces rules about the widget tree:
- Only container types (`layout.FormGrid`, `layout.Section`, `layout.Stack`) can have children
- You can't drop a node into its own subtree
- You can't remove the root node
- Grid spans are clamped between 1 and 12

**Invariants**: After every command, the system validates the entire tree — checking for orphan nodes, missing children, cycles, and ID mismatches.

---

### 5.9 `packages/theme`

**Purpose**: A shared MUI theme so Studio and Shell look consistent.

**Key file**: `src/index.ts`

```typescript
import { createPlatformTheme } from "@ai-low-code/theme";

const theme = createPlatformTheme();
// Use with: <ThemeProvider theme={theme}>
```

The theme sets: Inter font family, 8px spacing, rounded corners (8px border radius), custom primary/secondary colors, and MUI component overrides for Button, Paper, TextField, Select, Tab, etc.

---

## 6. The Apps

### 6.1 `apps/studio` — The Form Designer

**Entry point**: `src/main.tsx` → loads a sample FormDoc, validates it, renders `<StudioApp>`.

**Main component**: `src/StudioApp.tsx` — orchestrates the entire designer:

```
┌─────────────────────────────────────────────────────────────┐
│ AppBar: [+ Add Widget] [Delete] [▲] [▼] [Undo] [Redo]     │
│         [Export] [Copy]                                      │
├──────────┬─────────────────────────────┬────────────────────┤
│ Left     │ Center                      │ Right              │
│ Panel    │                             │ Panel              │
│          │                             │                    │
│ [Outline]│  [Design | Preview] toggle  │ [Inspector]        │
│ [Fields] │                             │  - Node info       │
│ [Data]   │  ┌───────────────────────┐  │  - Props editor    │
│          │  │                       │  │  - Layout editor   │
│ (tabs)   │  │    Canvas             │  │  - Binding editor  │
│          │  │    (renders the form  │  │  - DS options bind │
│          │  │     using the same    │  │  - Events editor   │
│          │  │     renderer as Shell)│  │                    │
│          │  │                       │  │ [Diagnostics]      │
│          │  └───────────────────────┘  │  - Errors/warnings │
└──────────┴─────────────────────────────┴────────────────────┘
```

**Key source files**:

| File | Purpose |
|------|---------|
| `StudioApp.tsx` | Main orchestrator — state, handlers, layout |
| `Canvas.tsx` | Renders the form with design-mode overlays |
| `Inspector.tsx` | Property editor for the selected node |
| `EventEditor.tsx` | Editor for onChange/onClick/onBlur actions |
| `Outline.tsx` | Tree view of the form structure (drag-and-drop) |
| `DomainFieldsPanel.tsx` | Lists fields from a domain model for scaffolding |
| `DataSourcesPanel.tsx` | Editor for mock datasource definitions |
| `DiagnosticsPanel.tsx` | Shows validation errors and warnings |
| `useDocHistory.ts` | Undo/redo history management |
| `dropHandling.ts` | Resolves drag-and-drop operations |
| `domainModel.ts` | Loads and queries domain model JSON |
| `buildNodeFromField.ts` | Creates a form node from a domain field |

**How editing works** (the flow):

1. User clicks "+ Add Widget" → selects "Text Input"
2. `handleAddWidget()` creates a `FormNode` with a unique ID
3. Calls `apply({ type: "AddNode", node, parentId, index })`
4. `apply()` calls `applyCommand(doc, command)` from studio-core
5. studio-core validates constraints, runs invariants
6. If valid: new doc is set, engine is recreated, canvas re-renders
7. If invalid: error diagnostics appear in the DiagnosticsPanel

**How undo/redo works** (`useDocHistory.ts`):
- Maintains three arrays: `past`, `present`, `future`
- On each successful `apply`: push `present` to `past`, set `present` to new doc, clear `future`
- `undo`: move `present` to `future`, pop `past` back to `present`
- `redo`: move `present` to `past`, pop `future` back to `present`

---

### 6.2 `apps/shell` — The Runtime Host

**Entry point**: `src/main.tsx` — a single-file app that renders forms.

**What it does**:
1. Shows a dropdown to pick a sample form (form_rules, form_basic, form_lookup)
2. Has an "Upload JSON" button to load a custom FormDoc
3. Validates the document with `validateFormDoc()`
4. If valid: creates a `FormEngine`, an `ActionRunner` (with datasource client), and renders `PageRenderer`
5. If invalid: shows validation errors

**The runtime flow**:
1. FormDoc is loaded (from sample or upload)
2. `createFormEngine(doc, { initialValues })` creates the Redux store
3. DataSource client is created from `doc.dataSources`
4. `createActionRunner(deps)` is created with all dependencies
5. `<PageRenderer doc={doc} engine={engine} registry={defaultRegistry} actionRunner={runner} />` renders the form
6. On mount, `PageOnLoad` runs `pageEvents.onLoad` actions (e.g., `CallDataSource` to fetch dropdown options)
7. User interactions trigger event handlers, which run through the ActionRunner

---

## 7. Data Flow — End to End

Here is a complete example of what happens when a user selects a country from a dropdown:

### Setup (on page load):

```
1. Shell loads form_lookup.json
2. Engine is created with empty form values
3. ActionRunner is created with DataSourceClient
4. PageRenderer mounts
5. PageOnLoad fires → runs pageEvents.onLoad:
   [{ type: "CallDataSource", dataSourceId: "ds_countries", resultKey: "ds_countries" }]
6. ActionRunner executes CallDataSource:
   a. Dispatches dataRequestStarted({ requestId: "req_countries", dataSourceId: "ds_countries" })
   b. Calls dataSourceClient.execute({ dataSourceId: "ds_countries" })
   c. Mock client waits 300ms, returns [{ value: "US", label: "United States" }, ...]
   d. Dispatches dataRequestSucceeded({ requestId: "req_countries", resultKey: "ds_countries", result: [...] })
7. Redux store now has: engine.data.byKey.ds_countries = [{ value: "US", ... }, ...]
8. The Select widget for "country_field" has bindings.options = "data.byKey.ds_countries"
9. NodeRenderer's optionsSelector reads engine.data.byKey.ds_countries
10. Select widget re-renders with the loaded options
```

### User interaction:

```
1. User opens the Country dropdown and selects "Canada"
2. MUI Select fires onChange with value "CA"
3. Widget calls props.onChange("CA")
4. NodeRenderer's handleChange runs:
   - No explicit events.onChange on this node
   - Fallback: dispatch(engine.actions.setValue({ path: "country", value: "CA" }))
5. Redux store updates: engine.values.form.values.country = "CA"
6. Engine middleware evaluates any visibility/disabled rules that depend on "country"
7. UI re-renders with the new value
```

---

## 8. The FormDoc — Understanding the JSON

A FormDoc is the complete description of a form. Here's a simplified example with annotations:

```json
{
  "schemaVersion": "1.0",
  "pageFamily": "Form",
  "rootNodeId": "root",

  "dataSources": [
    {
      "id": "ds_countries",
      "kind": "mock",
      "name": "Countries",
      "response": [
        { "value": "US", "label": "United States" },
        { "value": "CA", "label": "Canada" }
      ],
      "delayMs": 300
    }
  ],

  "pageEvents": {
    "onLoad": [
      { "type": "CallDataSource", "dataSourceId": "ds_countries", "resultKey": "ds_countries" }
    ]
  },

  "nodes": {
    "root": {
      "id": "root",
      "type": "layout.Section",
      "props": { "title": "My Form" },
      "children": ["grid1"]
    },
    "grid1": {
      "id": "grid1",
      "type": "layout.FormGrid",
      "props": { "columns": 12 },
      "children": ["name_field", "country_field", "submit_btn"]
    },
    "name_field": {
      "id": "name_field",
      "type": "core.TextInput",
      "props": { "label": "Full Name", "placeholder": "Enter your name" },
      "bindings": { "value": "form.values.name" },
      "layout": { "kind": "gridItem", "span": { "xs": 12, "md": 6 } }
    },
    "country_field": {
      "id": "country_field",
      "type": "core.Select",
      "props": { "label": "Country" },
      "bindings": {
        "value": "form.values.country",
        "options": "data.byKey.ds_countries"
      },
      "layout": { "kind": "gridItem", "span": { "xs": 12, "md": 6 } }
    },
    "submit_btn": {
      "id": "submit_btn",
      "type": "core.Button",
      "props": { "label": "Submit", "variant": "contained" },
      "events": {
        "onClick": [
          { "type": "ValidateForm" },
          { "type": "Toast", "message": "Form submitted!", "severity": "success" }
        ]
      }
    }
  },

  "rules": [],

  "dataContext": { "entity": "MyEntity", "mode": "create" },

  "submission": {
    "submitOperation": { "operationId": "myEntity.create" },
    "mapping": [
      { "sourcePath": "form.values.name", "targetPath": "FullName" },
      { "sourcePath": "form.values.country", "targetPath": "CountryCode" }
    ]
  }
}
```

**Key sections**:

| Section | What it defines |
|---------|----------------|
| `dataSources` | Where data comes from (API endpoints or mocks) |
| `pageEvents` | What happens when the page loads |
| `nodes` | The tree of widgets (the actual form structure) |
| `rules` | Conditional logic (visibility, disabled, computed) |
| `dataContext` | Which entity this form is editing |
| `submission` | How form values map to the API on submit |

---

## 9. How Actions Work

Actions are the "verbs" of the system. Here is how different actions execute:

### SetValue
```json
{ "type": "SetValue", "path": "form.values.name", "value": { "$event": "value" } }
```
1. Runner checks if `form.values.name` starts with an allowed prefix (`form.values.` or `ui.`)
2. Resolves `{ $event: "value" }` → reads `ctx.eventPayload.value` (what the user typed)
3. Dispatches `engine.actions.setValue({ path: "form.values.name", value: "Alice" })`

### CallDataSource
```json
{ "type": "CallDataSource", "dataSourceId": "ds_countries", "resultKey": "countries", "onError": [...] }
```
1. Dispatches `dataRequestStarted({ requestId, dataSourceId })`
2. Calls `dataSourceClient.execute({ dataSourceId: "ds_countries" })`
3. On success: dispatches `dataRequestSucceeded({ requestId, resultKey: "countries", result: [...] })`
4. On failure: dispatches `dataRequestFailed({ requestId, error: "..." })` and runs `onError` actions

### Batch
```json
{ "type": "Batch", "actions": [action1, action2, action3] }
```
Runs all actions sequentially. If any fails, it collects the error but continues.

### If
```json
{ "type": "If", "condition": { "op": "ref", "path": "form.values.isVip" }, "then": [...], "else": [...] }
```
Evaluates the expression. If truthy, runs `then` actions. If falsy, runs `else` actions.

---

## 10. How DataSources Work

DataSources are defined in the FormDoc and executed at runtime:

```
FormDoc.dataSources     → DataSourceRegistry (lookup by ID)
                               ↓
                        DataSourceClient (execute)
                               ↓
                   CallDataSource action (in ActionRunner)
                               ↓
                   engine.data.byKey[resultKey] = result
                               ↓
                   Select widget re-renders with new options
```

**The lifecycle**:
1. **Define**: In Studio, use the "Data" tab to add a mock datasource with response JSON
2. **Bind**: In the Inspector, bind a Select's options to the datasource
3. **Auto-wire**: Studio automatically adds a `CallDataSource` to `pageEvents.onLoad`
4. **Runtime**: When the page loads, `PageOnLoad` fires the `CallDataSource` action
5. **Store**: The result is stored in `engine.data.byKey[resultKey]`
6. **Render**: The Select widget reads from `data.byKey.*` via its binding and shows the options

---

## 11. How the Studio Editor Works

### Adding a widget:
1. Click "+ Add Widget" → dropdown appears
2. Select a widget type (e.g., "Text Input")
3. `handleAddWidget()` creates a `FormNode` with unique ID and default bindings
4. `apply({ type: "AddNode", node, parentId, index })` is called
5. `applyCommand()` validates the operation and returns new doc + diagnostics
6. Engine is recreated, canvas re-renders

### Editing properties:
1. Click a widget on the canvas (or in the Outline)
2. Inspector shows that node's properties
3. Change a field (e.g., "Label" from "Name" to "Full Name")
4. `onUpdateProps(nodeId, { label: "Full Name" })` calls `apply({ type: "UpdateProps", ... })`
5. Canvas reflects the change immediately

### Binding options to a datasource:
1. Switch to the "Data" tab, click "+ Add Mock"
2. Enter an ID, name, and response JSON (e.g., array of {value, label})
3. Select a Select widget on the canvas
4. In the Inspector, use "Bind options from" dropdown
5. Pick the datasource → Studio auto-sets `bindings.options = "data.byKey.ds_id"` and adds a `CallDataSource` to `pageEvents.onLoad`
6. Switch to "Preview" mode → the data loads and the Select shows options

### Drag and drop:
1. In the Outline, drag a node handle
2. Drop zones appear (before, after, inside containers)
3. `processDragEnd()` resolves the drop target using `resolveDrop()`
4. Calls `apply({ type: "MoveNode", ... })` if the move is valid

---

## 12. How to Run the Project

### Install dependencies:
```bash
npm install
```

### Build all packages:
```bash
npm run build --workspaces
```

### Run tests:
```bash
npm test --workspaces --if-present
```

### Start the Studio (form designer):
```bash
npm run dev --workspace=@ai-low-code/studio
```
Open the URL shown in the terminal (usually `http://localhost:5173`).

### Start the Shell (runtime):
```bash
npm run dev --workspace=@ai-low-code/shell
```
Open the URL shown in the terminal (usually `http://localhost:5174`).

---

## 13. How to Add a New Widget

Let's say you want to add a `core.Slider` widget.

**Step 1**: Create the component in `packages/widgets-core/src/Slider.tsx`:

```typescript
import React from "react";
import MuiSlider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Slider({ nodeId, nodeType, value, onChange, disabled, label, mode, props }: WidgetProps) {
  const min = (props?.min as number) ?? 0;
  const max = (props?.max as number) ?? 100;
  const step = (props?.step as number) ?? 1;

  return (
    <Box
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
    >
      <Typography gutterBottom>{label ?? ""}</Typography>
      <MuiSlider
        value={typeof value === "number" ? value : min}
        onChange={(_, v) => onChange?.(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </Box>
  );
}
```

**Step 2**: Register it in `packages/widgets-core/src/index.ts`:

```typescript
import { Slider } from "./Slider.jsx";

// In defaultRegistry:
"core.Slider": Slider,
```

**Step 3**: Add property schemas in `packages/widgets-core/src/propertySchemas.ts`:

```typescript
registry["core.Slider"] = {
  type: "core.Slider",
  fields: [
    { key: "label", label: "Label", type: "string" },
    { key: "min", label: "Min", type: "number", default: 0 },
    { key: "max", label: "Max", type: "number", default: 100 },
    { key: "step", label: "Step", type: "number", default: 1 },
  ],
};
```

**Step 4**: Add it to the Studio widget palette in `apps/studio/src/StudioApp.tsx`:

```typescript
{ type: "core.Slider", label: "Slider", isContainer: false },
```

**Step 5**: Add it to `LEAF_TYPES` in `packages/studio-core/src/constraints.ts`.

**Step 6**: Build and test.

---

## 14. How to Add a New Action Type

Let's say you want to add an `OpenDialog` action.

**Step 1**: Define the type in `packages/actions/src/types.ts`:

```typescript
export interface OpenDialogAction {
  type: "OpenDialog";
  dialogId: string;
  title?: string;
}

// Add to the union:
export type Action = ... | OpenDialogAction;

// Add to ACTION_TYPES:
export const ACTION_TYPES = [..., "OpenDialog"] as const;
```

**Step 2**: Handle it in the runner (`packages/actions/src/runner.ts`):

```typescript
case "OpenDialog": {
  // Call a dependency function (add openDialog to ActionRunnerDeps)
  deps.openDialog?.(action.dialogId, action.title);
  break;
}
```

**Step 3**: Add it to `SIDE_EFFECT_TYPES` if it shouldn't run in design mode.

**Step 4**: Update the JSON schema in `packages/schema/src/formdoc.schema.json` — add `"OpenDialog"` to the NodeAction type enum and add its properties.

**Step 5**: Export the new type from `packages/actions/src/index.ts`.

**Step 6**: Add UI for it in `apps/studio/src/EventEditor.tsx`.

**Step 7**: Provide the `openDialog` implementation in `StudioApp.tsx` and `apps/shell/src/main.tsx`.

---

## 15. Testing Strategy

The project uses **Vitest** for testing and **React Testing Library** for component tests.

| Package | What's tested | Test count |
|---------|--------------|-----------|
| `expr` | Expression evaluation, dependency extraction, type checking | 25 |
| `engine` | Store initialization, data slice, validation, submit mapping | 14 |
| `actions` | All action types, path validation, design mode suppression, CallDataSource | 18 |
| `datasources` | Mock delay/failRate, REST fetch, abort signals | 7 |
| `schema` | All sample docs validate, invalid docs produce errors, event schemas | 11 |
| `renderer` | Rendering, visibility, label resolution, action integration, onLoad | 12 |
| `studio-core` | Commands, constraints, invariants, drop resolution, layout | 66 |
| `studio` | Smoke tests, add/delete, drag-and-drop, inspector editing | 19 |

**To run all tests**: `npm test --workspaces --if-present`

**To run tests for one package**: `npm test --workspace=@ai-low-code/engine`

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **FormDoc** | A JSON document that describes an entire form — structure, behavior, data, and submission |
| **Node** | A single element in the form tree (input field, container, button) |
| **Widget** | A React component that renders a node type |
| **WidgetRegistry** | A map from type strings (e.g., `"core.TextInput"`) to React components |
| **Binding** | A connection between a widget and a data path (e.g., `"form.values.email"`) |
| **Expr** | A JSON-based expression for safe computation (no JavaScript allowed) |
| **Action** | A declarative instruction (SetValue, Toast, Navigate, CallDataSource, etc.) |
| **ActionRunner** | Executes arrays of actions with safety checks and telemetry |
| **Engine** | The Redux store managing form state, rules, validation, and loaded data |
| **DataSource** | A definition of where to fetch data (mock or REST API) |
| **Command** | An edit operation on a FormDoc (AddNode, UpdateProps, MoveNode, etc.) |
| **Rule** | A conditional expression that controls visibility, disabled state, or computed values |
| **Design mode** | Studio canvas mode — shows selection overlays, no side-effects execute |
| **Runtime mode** | Shell/preview mode — fully interactive, all actions execute |
| **Renderer parity** | The principle that Studio and Shell use the exact same renderer code |
| **Governance** | No arbitrary JavaScript — all logic is declarative JSON structures |
| **Canonical ID** | The standard naming: `layout.*` for containers, `core.*` for inputs |
| **Monorepo** | All packages and apps in one repository, managed by npm workspaces |
