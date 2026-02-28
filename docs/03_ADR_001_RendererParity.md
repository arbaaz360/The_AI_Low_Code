# ADR-001: Studio Canvas Uses Runtime Renderer

## Context
We need bug-free layouts and predictable runtime behavior. Separate “designer rendering” leads to mismatches between what authors see and what users get, creating CSS/layout defects that are extremely hard to eliminate.

## Decision
Studio Canvas SHALL render pages using the SAME runtime renderer and layout containers as production. Studio uses a "design mode" overlay layer for:
- selection & hover highlights
- drag/drop drop zones and previews
- resize handles (where applicable)
Overlays must not change the layout DOM structure.

## Consequences
- Pros: eliminates class of designer/runtime mismatch bugs; single source of truth; easier testing via golden snapshots.
- Cons: design overlays must be carefully implemented to avoid layout interference; some widgets need design-mode wrappers.

## Enforcement
- Renderer package exposes `render(doc, { mode: "runtime" | "design" })`.
- Design-mode changes MUST be additive overlays only.