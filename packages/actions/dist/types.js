export function isEventRef(v) {
    return v != null && typeof v === "object" && "$event" in v;
}
export const ACTION_TYPES = [
    "SetValue",
    "ValidateForm",
    "Toast",
    "Navigate",
    "Batch",
    "If",
    "CallDataSource",
    "SetData",
];
