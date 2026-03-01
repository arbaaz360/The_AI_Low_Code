import { createContext, useContext } from "react";
export const ActionRunnerContext = createContext(null);
export function useActionRunner() {
    return useContext(ActionRunnerContext);
}
