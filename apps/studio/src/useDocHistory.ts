import { useState, useCallback } from "react";
import type { FormDoc } from "@ai-low-code/engine";
import { applyCommand, type Command } from "@ai-low-code/studio-core";

export function useDocHistory(initialDoc: FormDoc) {
  const [past, setPast] = useState<FormDoc[]>([]);
  const [present, setPresent] = useState<FormDoc>(initialDoc);
  const [future, setFuture] = useState<FormDoc[]>([]);

  const apply = useCallback((cmd: Command) => {
    const { doc: newDoc, diagnostics } = applyCommand(present, cmd);
    if (diagnostics.length > 0) {
      console.warn("[Studio] Command diagnostics:", diagnostics);
    }
    if (newDoc !== present) {
      setPast((p) => [...p, present]);
      setPresent(newDoc);
      setFuture([]);
    }
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    setPast((p) => p.slice(0, -1));
    setPresent(prev);
    setFuture((f) => [present, ...f]);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((f) => f.slice(1));
    setPresent(next);
    setPast((p) => [...p, present]);
  }, [future, present]);

  const reset = useCallback((doc: FormDoc) => {
    setPast([]);
    setPresent(doc);
    setFuture([]);
  }, []);

  return {
    doc: present,
    apply,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
