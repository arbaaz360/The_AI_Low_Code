import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import type { EngineState } from "./slice.js";

export type RootState = { engine: EngineState };
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;
