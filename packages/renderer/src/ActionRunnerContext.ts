import { createContext, useContext } from "react";
import type { ActionRunner } from "@ai-low-code/actions";

export const ActionRunnerContext = createContext<ActionRunner | null>(null);

export function useActionRunner(): ActionRunner | null {
  return useContext(ActionRunnerContext);
}
