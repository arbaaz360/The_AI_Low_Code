import { useState, useCallback, useRef } from "react";
import type { FormDoc } from "@ai-low-code/engine";
import { applyCommand, type Command, type Diagnostic } from "@ai-low-code/studio-core";

export function useDocHistory(initialDoc: FormDoc) {
  const [past, setPast] = useState<FormDoc[]>([]);
  const [present, setPresent] = useState<FormDoc>(initialDoc);
  const [future, setFuture] = useState<FormDoc[]>([]);
  const [lastErrors, setLastErrors] = useState<Diagnostic[]>([]);
  const [lastWarnings, setLastWarnings] = useState<Diagnostic[]>([]);

  const presentRef = useRef(present);
  presentRef.current = present;

  const apply = useCallback((cmd: Command) => {
    const current = presentRef.current;
    const { doc: newDoc, diagnostics } = applyCommand(current, cmd);
    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warn");
    if (errors.length > 0) {
      setLastErrors(errors);
      setLastWarnings([]);
      console.error("[Studio] Command refused (errors):", errors);
      return;
    }
    if (diagnostics.length > 0) {
      console.warn("[Studio] Command diagnostics:", diagnostics);
    }
    setLastErrors([]);
    setLastWarnings(warnings);
    if (newDoc !== current) {
      setPast((p) => [...p, current]);
      setPresent(newDoc);
      presentRef.current = newDoc;
      setFuture([]);
    }
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    setPast((p) => p.slice(0, -1));
    setPresent(prev);
    presentRef.current = prev;
    setFuture((f) => [present, ...f]);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((f) => f.slice(1));
    setPresent(next);
    presentRef.current = next;
    setPast((p) => [...p, present]);
  }, [future, present]);

  const reset = useCallback((doc: FormDoc) => {
    setPast([]);
    setPresent(doc);
    presentRef.current = doc;
    setFuture([]);
    setLastErrors([]);
    setLastWarnings([]);
  }, []);

  return {
    doc: present,
    apply,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    lastErrors,
    lastWarnings,
  };
}
