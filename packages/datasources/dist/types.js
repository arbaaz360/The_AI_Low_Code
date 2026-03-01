export function isDataSourceError(e) {
    return e != null && typeof e === "object" && "kind" in e;
}
